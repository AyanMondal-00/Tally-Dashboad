from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

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


def _age_days(datestr, today):
    try:
        d = datetime.strptime(datestr[:10], "%Y-%m-%d").date()
        return max((today - d).days, 0)
    except Exception:
        return 0


def _bucket(days):
    if days <= 30:
        return "0_30"
    if days <= 60:
        return "31_60"
    if days <= 90:
        return "61_90"
    return "above_90"


DEBIT_TYPES = ("Sales", "Payment", "Journal")


def merge_vouchers(existing, new):
    """Incremental merge, deduped by (type, voucher_no, date); newer wins."""
    def key(v):
        return (v.get("type"), v.get("voucher_no"), v.get("date"))
    m = {key(v): v for v in existing}
    for v in new:
        m[key(v)] = v
    return list(m.values())


def build_from_vouchers(company_id, name, vouchers):
    """Compute all role dashboards derivable from raw Tally vouchers."""
    vouchers = [v for v in vouchers if v.get("amount", 0) > 0]
    vouchers.sort(key=lambda x: x["date"], reverse=True)
    today = datetime.now(timezone.utc).date()

    def total(t):
        return _round(sum(v["amount"] for v in vouchers if v["type"] == t))

    gross_sales = total("Sales")
    total_purchases = total("Purchase")
    total_receipts = total("Receipt")
    total_payments = total("Payment")
    net_sales = gross_sales

    # Monthly trend
    monthly_map = {}
    for v in vouchers:
        k = v["date"][:7] if len(v["date"]) >= 7 else "n/a"
        m = monthly_map.setdefault(k, {"sales": 0, "purchases": 0, "receipts": 0, "payments": 0})
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

    def mom(field):
        if len(monthly) >= 2 and monthly[-2][field]:
            return _round((monthly[-1][field] - monthly[-2][field]) / monthly[-2][field] * 100)
        return None

    # Per-party aggregation
    parties = {}
    for v in vouchers:
        p = parties.setdefault(v["party"], {"vouchers": [], "sales": 0, "receipts": 0,
                                            "purchases": 0, "payments": 0, "latest": ""})
        p["vouchers"].append(v)
        t = v["type"]
        if t == "Sales":
            p["sales"] += v["amount"]
        elif t == "Receipt":
            p["receipts"] += v["amount"]
        elif t == "Purchase":
            p["purchases"] += v["amount"]
        elif t == "Payment":
            p["payments"] += v["amount"]
        if v["date"] > p["latest"]:
            p["latest"] = v["date"]

    customers, suppliers, ledgers = [], [], []
    ledger_statements = {}
    for pname, p in parties.items():
        is_customer = (p["sales"] + p["receipts"]) >= (p["purchases"] + p["payments"])
        group = "Sundry Debtors" if is_customer else "Sundry Creditors"
        billing = p["sales"] if is_customer else p["purchases"]
        paid = p["receipts"] if is_customer else p["payments"]
        outstanding = _round(max(billing - paid, 0))
        txns = sorted(p["vouchers"], key=lambda x: x["date"])
        bal = dr_t = cr_t = 0.0
        rows = []
        for t in txns:
            is_debit = t["type"] in DEBIT_TYPES
            dr = t["amount"] if is_debit else 0
            cr = 0 if is_debit else t["amount"]
            bal += dr - cr
            dr_t += dr
            cr_t += cr
            rows.append({"date": t["date"], "voucher_type": t["type"], "voucher_no": t["voucher_no"],
                         "debit": _round(dr), "credit": _round(cr), "balance": _round(bal),
                         "narration": t.get("narration", "")})
        lid = re.sub(r"[^a-z0-9]+", "-", pname.lower()).strip("-") or "ledger"
        base, n = lid, 1
        while lid in ledger_statements:
            n += 1
            lid = f"{base}-{n}"
        days = _age_days(p["latest"], today)
        entry = {"id": lid, "name": pname, "group": group, "opening": 0,
                 "debit": _round(dr_t), "credit": _round(cr_t), "closing": _round(bal),
                 "outstanding": outstanding, "billing": _round(billing),
                 "days": days, "last_active_days": days, "latest": p["latest"]}
        ledgers.append(entry)
        ledger_statements[lid] = {"name": pname, "group": group, "opening": 0,
                                  "closing": _round(bal), "transactions": rows}
        (customers if is_customer else suppliers).append(entry)

    top_customers = sorted(customers, key=lambda z: z["billing"], reverse=True)[:30]
    top_suppliers = sorted(suppliers, key=lambda z: z["billing"], reverse=True)[:30]

    def aging(plist):
        buckets = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "above_90": 0.0}
        rows = []
        for p in plist:
            if p["outstanding"] <= 0:
                continue
            b = _bucket(p["days"])
            buckets[b] += p["outstanding"]
            rows.append({"name": p["name"], "amount": p["outstanding"], "days": p["days"], "bucket": b})
        return {"buckets": {k: _round(v) for k, v in buckets.items()},
                "rows": sorted(rows, key=lambda x: x["amount"], reverse=True)}

    receivables = aging(customers)
    payables = aging(suppliers)
    debtors = _round(sum(receivables["buckets"].values()))
    creditors = _round(sum(payables["buckets"].values()))

    pending = []
    for c in sorted([c for c in customers if c["outstanding"] > 0], key=lambda x: x["days"], reverse=True)[:40]:
        sv = sorted([v for v in parties[c["name"]]["vouchers"] if v["type"] == "Sales"], key=lambda x: x["date"])
        bill_no = sv[-1]["voucher_no"] if sv else "-"
        inv_date = sv[-1]["date"] if sv else c["latest"]
        try:
            dd = datetime.strptime(inv_date[:10], "%Y-%m-%d").date() + timedelta(days=30)
            due, overdue = dd.strftime("%Y-%m-%d"), max((today - dd).days, 0)
        except Exception:
            due, overdue = "", 0
        pending.append({"bill_no": bill_no, "party": c["name"], "date": inv_date, "due_date": due,
                        "amount": c["outstanding"], "overdue_days": overdue,
                        "status": "Overdue" if overdue > 0 else "Due"})

    def mode_sum(vt, mode):
        return _round(sum(v["amount"] for v in vouchers if v["type"] == vt and v.get("mode", "Bank") == mode))

    rp_summary = {"cash": {"receipts": mode_sum("Receipt", "Cash"), "payments": mode_sum("Payment", "Cash")},
                  "bank": {"receipts": mode_sum("Receipt", "Bank"), "payments": mode_sum("Payment", "Bank")}}

    vendor_payables = []
    for s in sorted([s for s in suppliers if s["outstanding"] > 0], key=lambda x: x["outstanding"], reverse=True)[:15]:
        try:
            dd = datetime.strptime(s["latest"][:10], "%Y-%m-%d").date() + timedelta(days=30)
            due, left = dd.strftime("%Y-%m-%d"), (dd - today).days
        except Exception:
            due, left = "", 0
        vendor_payables.append({"vendor": s["name"], "outstanding": s["outstanding"],
                                "due_date": due, "credit_days_left": left})

    inactive = [{"name": c["name"], "last_active_days": c["days"], "balance": c["outstanding"],
                 "annual_value": c["billing"]}
                for c in sorted(customers, key=lambda x: x["days"], reverse=True) if c["days"] >= 60][:12]

    now = datetime.now(timezone.utc)
    return {
        "company_id": company_id,
        "raw_vouchers": vouchers,
        "meta": {"id": company_id, "name": name, "branch": "Live Sync",
                 "currency": "INR", "symbol": "₹", "voucher_count": len(vouchers),
                 "last_sync": now.strftime("%Y-%m-%d %H:%M"), "source": "Tally Import"},
        "ceo": {
            "business_snapshot": {"gross_sales": gross_sales, "net_sales": net_sales,
                                  "total_purchases": total_purchases, "total_receipts": total_receipts,
                                  "total_payments": total_payments,
                                  "mom": {"sales": mom("sales"), "purchases": mom("purchases"),
                                          "receipts": mom("receipts"), "payments": mom("payments")}},
            "liquidity": {"banks": [], "bank_total": 0, "cash_in_hand": 0,
                          "net_working_capital": _round(debtors - creditors),
                          "debtors": debtors, "creditors": creditors},
            "trends": {"monthly": monthly, "prev_year": []},
            "toppers": {"customers": top_customers, "suppliers": top_suppliers, "items": []},
            "inactive": inactive,
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
            "daybook": vouchers,
            "ledgers": sorted(ledgers, key=lambda x: abs(x["closing"]), reverse=True),
            "pending_collections": pending, "rp_summary": rp_summary,
        },
        "purchase": {
            "monthly": [{"month": m["month"], "amount": m["purchases"]} for m in monthly],
            "vendor_wise": [{"vendor": s["name"], "amount": s["billing"]} for s in top_suppliers[:12]],
            "vendor_payables": vendor_payables,
            "po_tracking": [],
            "supplier_analysis": [{"supplier": s["name"], "volume": s["billing"], "billing": s["billing"],
                                   "outstanding": s["outstanding"]} for s in top_suppliers[:15]],
            "top_items": [], "total_purchases": total_purchases,
        },
        "sales": {
            "by_customer": [{"name": c["name"], "value": c["billing"]} for c in top_customers[:10]],
            "by_item": [], "by_group": [], "by_region": [], "by_rep": [],
            "pending_orders": [], "sfa": [], "buying_patterns": [], "net_sales": net_sales,
        },
        "ledger_statements": ledger_statements,
    }


@api_router.post("/upload")
async def upload_tally(file: UploadFile = File(...), mode: str = Query("merge")):
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
    existing = await db.company_data.find_one({"company_id": company_id})
    if existing and mode == "merge":
        prior = existing.get("raw_vouchers", [])
        merged = merge_vouchers(prior, vouchers)
        added = max(len(merged) - len(prior), 0)
    else:
        merged = vouchers
        added = len(vouchers)
    doc = build_from_vouchers(company_id, "Tally Live Company", merged)
    await db.company_data.replace_one({"company_id": company_id}, doc, upsert=True)
    return {"status": "ok", "new_vouchers": added, "total_vouchers": len(merged),
            "company_id": company_id, "meta": doc["meta"]}


@api_router.get("/tally/status")
async def tally_status():
    doc = await db.company_data.find_one({"company_id": "tally-import"}, {"meta": 1, "_id": 0})
    if not doc:
        return {"connected": False}
    return {"connected": True, "meta": doc["meta"]}


@api_router.delete("/tally")
async def tally_disconnect():
    await db.company_data.delete_one({"company_id": "tally-import"})
    return {"status": "ok"}


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
