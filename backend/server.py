from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import seed_data

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def seed_if_empty(force: bool = False):
    count = await db.company_data.count_documents({"meta.source": "Demo Data"})
    if count == 0 or force:
        docs = seed_data.build_all()
        for d in docs:
            await db.company_data.replace_one({"company_id": d["company_id"]}, d, upsert=True)
        logger.info("Seeded %d demo companies", len(docs))


@app.on_event("startup")
async def startup():
    await seed_if_empty()


@api_router.get("/")
async def root():
    return {"message": "Tally Dashboards API"}


@api_router.get("/companies")
async def get_companies():
    docs = await db.company_data.find({}, {"meta": 1, "_id": 0}).to_list(100)
    return [d["meta"] for d in docs]


async def _get_company(company_id: str):
    doc = await db.company_data.find_one({"company_id": company_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Company not found")
    return doc


@api_router.get("/dashboard/{role}")
async def get_dashboard(role: str, company_id: str = Query(...)):
    if role not in ("ceo", "cfo", "accounts", "purchase", "sales"):
        raise HTTPException(status_code=404, detail="Unknown dashboard")
    doc = await _get_company(company_id)
    data = doc.get(role)
    if data is None:
        raise HTTPException(status_code=404, detail="Dashboard data unavailable")
    return {"meta": doc["meta"], "data": data}


@api_router.get("/ledger/{ledger_id}")
async def get_ledger(ledger_id: str, company_id: str = Query(...)):
    doc = await _get_company(company_id)
    stmt = doc.get("ledger_statements", {}).get(ledger_id)
    if not stmt:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return {"meta": doc["meta"], "statement": stmt}


@api_router.post("/reset-demo")
async def reset_demo():
    await db.company_data.delete_many({"meta.source": {"$ne": "Demo Data"}})
    docs = seed_data.build_all()
    for d in docs:
        await db.company_data.replace_one({"company_id": d["company_id"]}, d, upsert=True)
    return {"status": "ok", "message": "Demo data restored", "companies": len(docs)}


def _txt(node, tag):
    el = node.find(tag)
    return el.text.strip() if el is not None and el.text else ""


def _num(s):
    try:
        return abs(float(str(s).replace(",", "").strip() or 0))
    except Exception:
        return 0.0


def parse_tally_xml(content: bytes):
    """Parse a TallyPrime/Tally ERP 9 Daybook or Voucher XML export into vouchers."""
    text = content.decode("utf-8", errors="ignore")
    root = ET.fromstring(text)
    vouchers = []
    for v in root.iter("VOUCHER"):
        vtype = v.get("VCHTYPE") or _txt(v, "VOUCHERTYPENAME") or "Journal"
        date_raw = _txt(v, "DATE")
        try:
            date = datetime.strptime(date_raw, "%Y%m%d").strftime("%Y-%m-%d")
        except Exception:
            date = date_raw or ""
        party = _txt(v, "PARTYLEDGERNAME") or _txt(v, "PARTYNAME")
        vno = _txt(v, "VOUCHERNUMBER") or "-"
        narr = _txt(v, "NARRATION")
        amount = 0.0
        for le in v.iter("ALLLEDGERENTRIES.LIST"):
            amt = _num(_txt(le, "AMOUNT"))
            if amt > amount:
                amount = amt
        if amount == 0:
            for le in v.iter("LEDGERENTRIES.LIST"):
                amt = _num(_txt(le, "AMOUNT"))
                if amt > amount:
                    amount = amt
        norm = vtype.lower()
        if "sale" in norm:
            t = "Sales"
        elif "purchase" in norm:
            t = "Purchase"
        elif "receipt" in norm:
            t = "Receipt"
        elif "payment" in norm:
            t = "Payment"
        else:
            t = "Journal"
        vouchers.append({"date": date, "type": t, "voucher_no": vno,
                         "party": party or "Unknown", "amount": round(amount, 2),
                         "narration": narr, "mode": "Bank"})
    return vouchers


def _round(v):
    return round(float(v), 2)


def build_from_vouchers(company_id, name, vouchers):
    """Compute the dashboard subset that is derivable from raw vouchers."""
    vouchers = [v for v in vouchers if v["amount"] > 0]
    vouchers.sort(key=lambda x: x["date"], reverse=True)

    def total(t):
        return _round(sum(v["amount"] for v in vouchers if v["type"] == t))

    gross_sales = total("Sales")
    total_purchases = total("Purchase")
    total_receipts = total("Receipt")
    total_payments = total("Payment")

    monthly_map = {}
    for v in vouchers:
        key = v["date"][:7] if len(v["date"]) >= 7 else "n/a"
        m = monthly_map.setdefault(key, {"sales": 0, "purchases": 0, "receipts": 0, "payments": 0})
        if v["type"] == "Sales":
            m["sales"] += v["amount"]
        elif v["type"] == "Purchase":
            m["purchases"] += v["amount"]
        elif v["type"] == "Receipt":
            m["receipts"] += v["amount"]
        elif v["type"] == "Payment":
            m["payments"] += v["amount"]
    monthly = []
    for k in sorted(monthly_map)[-12:]:
        mm = monthly_map[k]
        try:
            lbl = datetime.strptime(k, "%Y-%m").strftime("%b %y")
        except Exception:
            lbl = k
        monthly.append({"month": lbl, "sales": _round(mm["sales"]),
                        "purchases": _round(mm["purchases"]),
                        "receipts": _round(mm["receipts"]), "payments": _round(mm["payments"]),
                        "gross_profit": _round(mm["sales"] * 0.28), "gp_margin": 28})

    cust = {}
    supp = {}
    for v in vouchers:
        if v["type"] in ("Sales", "Receipt"):
            c = cust.setdefault(v["party"], {"billing": 0, "paid": 0})
            if v["type"] == "Sales":
                c["billing"] += v["amount"]
            else:
                c["paid"] += v["amount"]
        elif v["type"] in ("Purchase", "Payment"):
            s = supp.setdefault(v["party"], {"billing": 0, "paid": 0})
            if v["type"] == "Purchase":
                s["billing"] += v["amount"]
            else:
                s["paid"] += v["amount"]

    top_customers = sorted(
        [{"name": k, "billing": _round(x["billing"]),
          "outstanding": _round(max(x["billing"] - x["paid"], 0)), "last_active_days": 0}
         for k, x in cust.items() if x["billing"] > 0],
        key=lambda z: z["billing"], reverse=True)[:30]
    top_suppliers = sorted(
        [{"name": k, "billing": _round(x["billing"]),
          "outstanding": _round(max(x["billing"] - x["paid"], 0)), "last_active_days": 0}
         for k, x in supp.items() if x["billing"] > 0],
        key=lambda z: z["billing"], reverse=True)[:30]

    debtors = _round(sum(c["outstanding"] for c in top_customers))
    creditors = _round(sum(s["outstanding"] for s in top_suppliers))
    net_sales = gross_sales

    recv_rows = [{"name": c["name"], "amount": c["outstanding"], "days": 0, "bucket": "0_30"}
                 for c in top_customers if c["outstanding"] > 0]
    receivables = {"buckets": {"0_30": debtors, "31_60": 0, "61_90": 0, "above_90": 0}, "rows": recv_rows}
    pay_rows = [{"name": s["name"], "amount": s["outstanding"], "days": 0, "bucket": "0_30"}
                for s in top_suppliers if s["outstanding"] > 0]
    payables = {"buckets": {"0_30": creditors, "31_60": 0, "61_90": 0, "above_90": 0}, "rows": pay_rows}

    now = datetime.now(timezone.utc)
    return {
        "company_id": company_id,
        "meta": {"id": company_id, "name": name, "branch": "Imported",
                 "currency": "INR", "symbol": "₹",
                 "last_sync": now.strftime("%Y-%m-%d %H:%M"), "source": "Tally Import"},
        "ceo": {
            "business_snapshot": {"gross_sales": gross_sales, "net_sales": net_sales,
                                  "total_purchases": total_purchases, "total_receipts": total_receipts,
                                  "total_payments": total_payments,
                                  "mom": {"sales": 0, "purchases": 0, "receipts": 0, "payments": 0}},
            "liquidity": {"banks": [], "bank_total": 0, "cash_in_hand": 0,
                          "net_working_capital": _round(debtors - creditors),
                          "debtors": debtors, "creditors": creditors},
            "trends": {"monthly": monthly, "prev_year": []},
            "toppers": {"customers": top_customers, "suppliers": top_suppliers, "items": []},
            "inactive": [],
        },
        "cfo": {
            "receivables": receivables, "payables": payables, "projection": [],
            "expenses": {"direct": [], "indirect": [], "direct_total": 0, "indirect_total": 0, "revenue": net_sales},
            "financials": {"pnl": {"revenue": net_sales, "cogs": total_purchases,
                                   "gross_profit": _round(net_sales - total_purchases),
                                   "direct_expenses": 0, "indirect_expenses": 0,
                                   "operating_profit": _round(net_sales - total_purchases),
                                   "net_profit": _round(net_sales - total_purchases),
                                   "net_margin": _round((net_sales - total_purchases) / net_sales * 100) if net_sales else 0},
                           "balance_sheet": {"assets": [{"name": "Sundry Debtors", "amount": debtors}],
                                             "liabilities": [{"name": "Sundry Creditors", "amount": creditors}]},
                           "trial_balance": [
                               {"ledger": "Sales Account", "debit": 0, "credit": net_sales},
                               {"ledger": "Purchase Account", "debit": total_purchases, "credit": 0},
                               {"ledger": "Sundry Debtors", "debit": debtors, "credit": 0},
                               {"ledger": "Sundry Creditors", "debit": 0, "credit": creditors},
                           ]},
        },
        "accounts": {
            "daybook": vouchers, "ledgers": [], "pending_collections": [],
            "rp_summary": {"cash": {"receipts": 0, "payments": 0},
                           "bank": {"receipts": total_receipts, "payments": total_payments}},
        },
        "purchase": {
            "monthly": [{"month": m["month"], "amount": m["purchases"]} for m in monthly],
            "vendor_wise": [{"vendor": s["name"], "amount": s["billing"]} for s in top_suppliers[:12]],
            "vendor_payables": [{"vendor": s["name"], "outstanding": s["outstanding"],
                                 "due_date": "", "credit_days_left": 0}
                                for s in top_suppliers[:15] if s["outstanding"] > 0],
            "po_tracking": [], "supplier_analysis": [{"supplier": s["name"], "volume": s["billing"],
                                                      "billing": s["billing"], "outstanding": s["outstanding"]}
                                                     for s in top_suppliers[:15]],
            "top_items": [], "total_purchases": total_purchases,
        },
        "sales": {
            "by_customer": [{"name": c["name"], "value": c["billing"]} for c in top_customers[:10]],
            "by_item": [], "by_group": [], "by_region": [], "by_rep": [],
            "pending_orders": [], "sfa": [], "buying_patterns": [], "net_sales": net_sales,
        },
        "ledger_statements": {},
    }


@api_router.post("/upload")
async def upload_tally(file: UploadFile = File(...)):
    fname = (file.filename or "").lower()
    content = await file.read()
    if not fname.endswith(".xml"):
        raise HTTPException(status_code=400,
                            detail="Please upload a Tally XML export (Daybook/Voucher export as XML).")
    try:
        vouchers = parse_tally_xml(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse XML: {e}")
    if not vouchers:
        raise HTTPException(status_code=400,
                            detail="No vouchers found in the XML. Export Daybook with vouchers from Tally.")
    company_id = "tally-import"
    name = f"Imported from Tally ({len(vouchers)} vouchers)"
    doc = build_from_vouchers(company_id, name, vouchers)
    await db.company_data.replace_one({"company_id": company_id}, doc, upsert=True)
    return {"status": "ok", "vouchers": len(vouchers), "company_id": company_id, "meta": doc["meta"]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
