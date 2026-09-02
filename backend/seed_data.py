"""Deterministic Tally ERP demo data generator.

Builds rich, plausible per-company datasets and precomputes all 5 role-based
dashboard payloads plus ledger statements for drill-down.
"""
import random
from datetime import datetime, timedelta, timezone

TODAY = datetime(2026, 6, 15, tzinfo=timezone.utc)

CUSTOMERS = [
    "Skyline Interiors", "Meridian Traders", "Blue Ocean Exports", "Nova Retail Pvt Ltd",
    "Pinnacle Systems", "Greenfield Agro", "Urban Nest Furnishings", "Crescent Pharma",
    "Vertex Engineering", "Harbour Logistics", "Sunrise Textiles", "Zenith Electronics",
    "Cobalt Industries", "Everest Foods", "Lotus Healthcare", "Falcon Automotive",
    "Radiant Solar", "Ironclad Hardware", "Maple Stationers", "Quantum Infotech",
    "Silverline Ceramics", "Aster Chemicals", "Brightway Distributors", "Delta Packaging",
    "Emerald Jewels", "Frontier Motors", "Galaxy Sports", "Horizon Media",
    "Indigo Apparels", "Jubilee Confectionery",
]

SUPPLIERS = [
    "Apex Raw Materials", "Bharat Steel Co", "Coastal Timber", "Deccan Plastics",
    "Everflow Chemicals", "Fortune Components", "Global Fabrics", "Himalaya Packaging",
    "Indus Metals", "Jyoti Electricals", "Kaveri Paper Mills", "Lumen Lighting",
    "Metro Adhesives", "Nirmal Alloys", "Orion Bearings", "Prime Polymers",
    "Rapid Fasteners", "Suryan Glass", "Tulip Pigments", "Unity Castings",
]

ITEMS = [
    ("Steel Rod 12mm", "Raw Metals"), ("Aluminium Sheet", "Raw Metals"),
    ("Copper Wire Spool", "Electricals"), ("LED Panel 40W", "Electricals"),
    ("PVC Pipe 4in", "Plastics"), ("Acrylic Sheet", "Plastics"),
    ("Teak Plywood", "Timber"), ("Laminate Board", "Timber"),
    ("Industrial Adhesive", "Chemicals"), ("Epoxy Resin 5L", "Chemicals"),
    ("Ball Bearing 6204", "Components"), ("Hex Bolt M10", "Components"),
    ("Cotton Fabric Roll", "Textiles"), ("Polyester Yarn", "Textiles"),
    ("Cement Bag 50kg", "Construction"), ("Ceramic Tile 2x2", "Construction"),
    ("Solar Module 330W", "Energy"), ("Lithium Battery 100Ah", "Energy"),
    ("Corrugated Box L", "Packaging"), ("Bubble Wrap Roll", "Packaging"),
]

REPS = ["Rahul Menon", "Priya Nair", "Arjun Desai", "Sneha Kulkarni", "Vikram Rao", "Anita Shah"]
REGIONS = ["North", "South", "East", "West", "Central"]

COMPANIES = [
    {"id": "acme-tech", "name": "Acme Tech Corp", "branch": "Head Office", "currency": "INR", "symbol": "₹", "scale": 1.0, "seed": 101},
    {"id": "acme-retail", "name": "Acme Retail West", "branch": "Mumbai Branch", "currency": "INR", "symbol": "₹", "scale": 0.55, "seed": 202},
    {"id": "acme-global", "name": "Acme Global Exports", "branch": "SEZ Unit", "currency": "USD", "symbol": "$", "scale": 1.45, "seed": 303},
]

VTYPES = ["Sales", "Purchase", "Receipt", "Payment", "Journal"]


def month_labels(n=12):
    labels = []
    y, m = TODAY.year, TODAY.month
    for i in range(n - 1, -1, -1):
        mm = m - i
        yy = y
        while mm <= 0:
            mm += 12
            yy -= 1
        labels.append((yy, mm, datetime(yy, mm, 1).strftime("%b %y")))
    return labels


def _round(v):
    return round(float(v), 2)


def build_company(cfg):
    rng = random.Random(cfg["seed"])
    scale = cfg["scale"]
    months = month_labels(12)
    prev_months = month_labels(24)[:12]  # for YoY

    # ---- Monthly trend base with upward drift + noise ----
    base = 3200000 * scale
    monthly = []
    for idx, (yy, mm, lbl) in enumerate(months):
        growth = 1 + (idx * 0.018) + rng.uniform(-0.06, 0.08)
        sales = base * growth * rng.uniform(0.9, 1.12)
        purchases = sales * rng.uniform(0.55, 0.66)
        gp_margin = rng.uniform(22, 34)
        monthly.append({
            "month": lbl, "y": yy, "m": mm,
            "sales": _round(sales),
            "purchases": _round(purchases),
            "gross_profit": _round(sales * gp_margin / 100),
            "gp_margin": _round(gp_margin),
            "receipts": _round(sales * rng.uniform(0.78, 0.94)),
            "payments": _round(purchases * rng.uniform(0.8, 0.95)),
        })
    prev_year = []
    for (yy, mm, lbl) in prev_months:
        prev_year.append(_round(base * rng.uniform(0.72, 0.9)))

    gross_sales = sum(x["sales"] for x in monthly)
    returns = gross_sales * rng.uniform(0.02, 0.04)
    net_sales = gross_sales - returns
    total_purchases = sum(x["purchases"] for x in monthly)
    total_receipts = sum(x["receipts"] for x in monthly)
    total_payments = sum(x["payments"] for x in monthly)

    def mom(field):
        cur, prev = monthly[-1][field], monthly[-2][field]
        return _round((cur - prev) / prev * 100) if prev else 0

    # ---- Liquidity ----
    banks = [
        {"name": "HDFC Current A/c", "balance": _round(4200000 * scale * rng.uniform(0.8, 1.3))},
        {"name": "ICICI Current A/c", "balance": _round(2600000 * scale * rng.uniform(0.7, 1.2))},
        {"name": "SBI OD A/c", "balance": _round(-900000 * scale * rng.uniform(0.6, 1.1))},
    ]
    cash_in_hand = _round(320000 * scale * rng.uniform(0.7, 1.3))
    bank_total = sum(b["balance"] for b in banks)

    # ---- Parties with outstanding + last activity ----
    def make_parties(names, kind):
        out = []
        for nm in names:
            vol = rng.uniform(0.3, 1.0)
            billing = _round((gross_sales if kind == "customer" else total_purchases) * vol / len(names) * rng.uniform(0.4, 2.2))
            outstanding = _round(billing * rng.uniform(0.05, 0.35))
            last_days = rng.choice([2, 5, 9, 14, 21, 30, 45, 62, 88, 120, 150])
            out.append({
                "name": nm, "billing": billing, "outstanding": outstanding,
                "last_active_days": last_days,
            })
        return out

    customers = make_parties(CUSTOMERS, "customer")
    suppliers = make_parties(SUPPLIERS, "supplier")

    # ---- Item revenue ----
    item_rev = []
    for (nm, grp) in ITEMS:
        rev = _round(gross_sales / len(ITEMS) * rng.uniform(0.4, 2.3))
        qty = int(rev / rng.uniform(800, 4000))
        item_rev.append({"name": nm, "group": grp, "revenue": rev, "qty": qty,
                         "movement": rng.choice(["Fast", "Fast", "Normal", "Slow", "Dead"])})

    top_customers = sorted(customers, key=lambda x: x["billing"], reverse=True)[:30]
    top_suppliers = sorted(suppliers, key=lambda x: x["billing"], reverse=True)[:30]
    top_items = sorted(item_rev, key=lambda x: x["revenue"], reverse=True)[:30]

    inactive = sorted(
        [c for c in customers if c["last_active_days"] >= 60],
        key=lambda x: x["last_active_days"], reverse=True
    )
    inactive = [{"name": c["name"], "last_active_days": c["last_active_days"],
                 "balance": c["outstanding"], "annual_value": c["billing"]} for c in inactive][:12]

    # ---- Aging buckets ----
    def aging(parties):
        buckets = {"0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "above_90": 0.0}
        rows = []
        for p in parties:
            if p["outstanding"] <= 0:
                continue
            d = p["last_active_days"]
            if d <= 30:
                b = "0_30"
            elif d <= 60:
                b = "31_60"
            elif d <= 90:
                b = "61_90"
            else:
                b = "above_90"
            buckets[b] += p["outstanding"]
            rows.append({"name": p["name"], "amount": p["outstanding"], "days": d, "bucket": b})
        buckets = {k: _round(v) for k, v in buckets.items()}
        rows = sorted(rows, key=lambda x: x["amount"], reverse=True)
        return {"buckets": buckets, "rows": rows}

    receivables = aging(customers)
    payables = aging(suppliers)

    # ---- Cash flow projection (next 6 weeks) ----
    projection = []
    for w in range(1, 7):
        projection.append({
            "period": f"Week {w}",
            "collections": _round(total_receipts / 20 * rng.uniform(0.6, 1.4)),
            "liabilities": _round(total_payments / 22 * rng.uniform(0.6, 1.4)),
        })

    # ---- Expense breakdown ----
    direct_names = ["Freight Inward", "Wages", "Power & Fuel", "Consumables", "Job Work Charges"]
    indirect_names = ["Salaries", "Rent", "Marketing", "Travel", "Office Admin", "Professional Fees", "Bank Charges"]
    direct = [{"name": n, "amount": _round(total_purchases * rng.uniform(0.02, 0.08))} for n in direct_names]
    indirect = [{"name": n, "amount": _round(net_sales * rng.uniform(0.01, 0.06))} for n in indirect_names]
    direct_total = sum(x["amount"] for x in direct)
    indirect_total = sum(x["amount"] for x in indirect)

    # ---- Financial statements ----
    cogs = _round(total_purchases * 0.92)
    gross_profit = _round(net_sales - cogs)
    operating_profit = _round(gross_profit - indirect_total)
    net_profit = _round(operating_profit - direct_total * 0.15)
    pnl = {
        "revenue": net_sales, "cogs": cogs, "gross_profit": gross_profit,
        "direct_expenses": direct_total, "indirect_expenses": indirect_total,
        "operating_profit": operating_profit, "net_profit": net_profit,
        "net_margin": _round(net_profit / net_sales * 100),
    }
    debtors = _round(sum(receivables["buckets"].values()))
    creditors = _round(sum(payables["buckets"].values()))
    stock_value = _round(total_purchases * rng.uniform(0.12, 0.2))
    fixed_assets = _round(net_sales * rng.uniform(0.3, 0.5))
    capital = _round((fixed_assets + stock_value + debtors + bank_total + cash_in_hand - creditors) * 0.7)
    balance_sheet = {
        "assets": [
            {"name": "Fixed Assets", "amount": fixed_assets},
            {"name": "Closing Stock", "amount": stock_value},
            {"name": "Sundry Debtors", "amount": debtors},
            {"name": "Bank Accounts", "amount": _round(bank_total)},
            {"name": "Cash-in-Hand", "amount": cash_in_hand},
        ],
        "liabilities": [
            {"name": "Capital Account", "amount": capital},
            {"name": "Reserves & Surplus", "amount": _round(net_profit * 1.4)},
            {"name": "Sundry Creditors", "amount": creditors},
            {"name": "Duties & Taxes", "amount": _round(net_sales * 0.04)},
        ],
    }
    trial_balance = [
        {"ledger": "Sales Account", "debit": 0, "credit": net_sales},
        {"ledger": "Purchase Account", "debit": total_purchases, "credit": 0},
        {"ledger": "Sundry Debtors", "debit": debtors, "credit": 0},
        {"ledger": "Sundry Creditors", "debit": 0, "credit": creditors},
        {"ledger": "Bank Accounts", "debit": max(bank_total, 0), "credit": max(-bank_total, 0)},
        {"ledger": "Cash-in-Hand", "debit": cash_in_hand, "credit": 0},
        {"ledger": "Indirect Expenses", "debit": indirect_total, "credit": 0},
        {"ledger": "Direct Expenses", "debit": direct_total, "credit": 0},
    ]

    # ---- Vouchers / Daybook + ledger statements ----
    vouchers = []
    ledger_txn = {}  # name -> list
    vcounters = {t: 0 for t in VTYPES}
    all_parties = [c["name"] for c in customers] + [s["name"] for s in suppliers]
    for d in range(75):
        date = TODAY - timedelta(days=d)
        n_day = rng.randint(2, 6)
        for _ in range(n_day):
            vt = rng.choices(VTYPES, weights=[35, 22, 20, 18, 5])[0]
            vcounters[vt] += 1
            if vt == "Sales":
                party = rng.choice(customers)["name"]
                amt = _round(gross_sales / 250 * rng.uniform(0.3, 2.5))
                narr = f"Being goods sold to {party}"
            elif vt == "Purchase":
                party = rng.choice(suppliers)["name"]
                amt = _round(total_purchases / 200 * rng.uniform(0.3, 2.5))
                narr = f"Being goods purchased from {party}"
            elif vt == "Receipt":
                party = rng.choice(customers)["name"]
                amt = _round(gross_sales / 260 * rng.uniform(0.3, 2.2))
                narr = f"Being amount received from {party}"
            elif vt == "Payment":
                party = rng.choice(suppliers)["name"]
                amt = _round(total_purchases / 220 * rng.uniform(0.3, 2.2))
                narr = f"Being amount paid to {party}"
            else:
                party = rng.choice(["Depreciation A/c", "Rent A/c", "Salary A/c", "Bank Charges A/c"])
                amt = _round(net_sales / 400 * rng.uniform(0.2, 1.5))
                narr = f"Being journal entry - {party}"
            prefix = {"Sales": "SAL", "Purchase": "PUR", "Receipt": "RCP", "Payment": "PMT", "Journal": "JV"}[vt]
            vno = f"{prefix}/{vcounters[vt]:04d}"
            v = {
                "date": date.strftime("%Y-%m-%d"),
                "type": vt, "voucher_no": vno, "party": party,
                "amount": amt, "narration": narr,
                "mode": rng.choice(["Cash", "Bank", "Bank", "Bank"]),
            }
            vouchers.append(v)
            ledger_txn.setdefault(party, []).append(v)

    vouchers.sort(key=lambda x: (x["date"], x["voucher_no"]), reverse=True)

    # ledger statements for parties
    ledgers = []
    ledger_statements = {}
    party_defs = [("Sundry Debtors", customers), ("Sundry Creditors", suppliers)]
    for group, plist in party_defs:
        for p in plist:
            txns = sorted(ledger_txn.get(p["name"], []), key=lambda x: x["date"])
            opening = _round(p["billing"] * rng.uniform(0.02, 0.1))
            bal = opening
            debit_total = 0.0
            credit_total = 0.0
            stmt_rows = []
            for t in txns:
                is_debit = t["type"] in ("Sales", "Payment", "Journal")
                dr = t["amount"] if is_debit else 0
                cr = t["amount"] if not is_debit else 0
                bal += dr - cr
                debit_total += dr
                credit_total += cr
                stmt_rows.append({
                    "date": t["date"], "voucher_type": t["type"], "voucher_no": t["voucher_no"],
                    "debit": _round(dr), "credit": _round(cr), "balance": _round(bal),
                    "narration": t["narration"],
                })
            closing = _round(bal)
            ledgers.append({
                "id": p["name"].lower().replace(" ", "-"),
                "name": p["name"], "group": group,
                "opening": opening, "debit": _round(debit_total),
                "credit": _round(credit_total), "closing": closing,
            })
            ledger_statements[p["name"].lower().replace(" ", "-")] = {
                "name": p["name"], "group": group, "opening": opening,
                "closing": closing, "transactions": stmt_rows,
            }

    # ---- Pending collections (bill-wise) ----
    pending_collections = []
    for i, c in enumerate([c for c in customers if c["outstanding"] > 0][:24]):
        inv_date = TODAY - timedelta(days=c["last_active_days"])
        due_date = inv_date + timedelta(days=30)
        overdue = (TODAY - due_date).days
        pending_collections.append({
            "bill_no": f"INV/{2400 + i}",
            "party": c["name"], "date": inv_date.strftime("%Y-%m-%d"),
            "due_date": due_date.strftime("%Y-%m-%d"),
            "amount": c["outstanding"], "overdue_days": max(overdue, 0),
            "status": "Overdue" if overdue > 0 else "Due",
        })
    pending_collections.sort(key=lambda x: x["overdue_days"], reverse=True)

    # ---- Receipt & payment summary ----
    cash_r = sum(v["amount"] for v in vouchers if v["type"] == "Receipt" and v["mode"] == "Cash")
    bank_r = sum(v["amount"] for v in vouchers if v["type"] == "Receipt" and v["mode"] == "Bank")
    cash_p = sum(v["amount"] for v in vouchers if v["type"] == "Payment" and v["mode"] == "Cash")
    bank_p = sum(v["amount"] for v in vouchers if v["type"] == "Payment" and v["mode"] == "Bank")
    rp_summary = {
        "cash": {"receipts": _round(cash_r), "payments": _round(cash_p)},
        "bank": {"receipts": _round(bank_r), "payments": _round(bank_p)},
    }

    # ---- Purchase dashboard ----
    purchase_monthly = [{"month": x["month"], "amount": x["purchases"]} for x in monthly]
    vendor_wise = sorted(
        [{"vendor": s["name"], "amount": s["billing"]} for s in suppliers],
        key=lambda x: x["amount"], reverse=True)[:12]
    vendor_payables = []
    for s in sorted(suppliers, key=lambda x: x["outstanding"], reverse=True)[:15]:
        due = TODAY + timedelta(days=rng.randint(-20, 40))
        vendor_payables.append({
            "vendor": s["name"], "outstanding": s["outstanding"],
            "due_date": due.strftime("%Y-%m-%d"),
            "credit_days_left": (due - TODAY).days,
        })
    po_tracking = []
    for i in range(14):
        s = rng.choice(suppliers)
        po_tracking.append({
            "po_no": f"PO/{1200 + i}", "vendor": s["name"],
            "date": (TODAY - timedelta(days=rng.randint(1, 40))).strftime("%Y-%m-%d"),
            "amount": _round(total_purchases / 60 * rng.uniform(0.4, 2.0)),
            "status": rng.choice(["Pending", "Partial", "Partial", "Received", "Pending"]),
        })
    supplier_analysis = sorted(
        [{"supplier": s["name"], "volume": s["billing"], "billing": s["billing"],
          "outstanding": s["outstanding"]} for s in suppliers],
        key=lambda x: x["billing"], reverse=True)[:15]
    top_purchased_items = sorted(item_rev, key=lambda x: x["qty"], reverse=True)[:8]

    # ---- Sales dashboard ----
    by_customer = sorted([{"name": c["name"], "value": c["billing"]} for c in customers],
                         key=lambda x: x["value"], reverse=True)[:10]
    by_item = sorted([{"name": i["name"], "value": i["revenue"]} for i in item_rev],
                    key=lambda x: x["value"], reverse=True)[:10]
    groups = {}
    for i in item_rev:
        groups[i["group"]] = groups.get(i["group"], 0) + i["revenue"]
    by_group = sorted([{"name": k, "value": _round(v)} for k, v in groups.items()],
                     key=lambda x: x["value"], reverse=True)
    by_region = [{"name": r, "value": _round(net_sales / len(REGIONS) * rng.uniform(0.5, 1.6))} for r in REGIONS]
    by_rep = sorted([{"name": r, "value": _round(net_sales / len(REPS) * rng.uniform(0.5, 1.7)),
                     "deals": rng.randint(18, 60)} for r in REPS],
                   key=lambda x: x["value"], reverse=True)
    pending_orders = []
    for i in range(16):
        c = rng.choice(customers)
        odate = TODAY - timedelta(days=rng.randint(1, 30))
        pending_orders.append({
            "so_no": f"SO/{3300 + i}", "customer": c["name"],
            "date": odate.strftime("%Y-%m-%d"),
            "delivery_date": (odate + timedelta(days=rng.randint(5, 25))).strftime("%Y-%m-%d"),
            "amount": _round(gross_sales / 80 * rng.uniform(0.3, 2.2)),
            "status": rng.choice(["Open", "Partial", "Backorder", "Open"]),
        })
    sfa = []
    for i in range(12):
        rep = rng.choice(REPS)
        c = rng.choice(customers)
        cin = TODAY - timedelta(days=rng.randint(0, 6), hours=rng.randint(0, 8))
        dur = rng.randint(20, 90)
        sfa.append({
            "rep": rep, "client": c["name"], "region": rng.choice(REGIONS),
            "checkin": cin.strftime("%Y-%m-%d %H:%M"),
            "checkout": (cin + timedelta(minutes=dur)).strftime("%Y-%m-%d %H:%M"),
            "location": f"{rng.uniform(12.8, 28.6):.4f}, {rng.uniform(72.8, 88.4):.4f}",
            "status": rng.choice(["Completed", "Completed", "In Progress"]),
            "notes": rng.choice([
                "Discussed Q3 requirement, follow-up next week.",
                "Collected pending cheque, order confirmed.",
                "Product demo done, awaiting approval.",
                "Price negotiation, sent revised quote.",
            ]),
        })
    buying_patterns = []
    for c in customers[:12]:
        it = rng.choice(item_rev)
        buying_patterns.append({
            "customer": c["name"], "top_item": it["name"],
            "frequency": rng.randint(2, 14),
            "last_purchase": (TODAY - timedelta(days=c["last_active_days"])).strftime("%Y-%m-%d"),
            "upsell": rng.choice(item_rev)["name"],
            "flag": "Upsell" if rng.random() > 0.5 else "Reorder",
        })

    # ---- Assemble payloads ----
    ceo = {
        "business_snapshot": {
            "gross_sales": _round(gross_sales), "net_sales": _round(net_sales),
            "total_purchases": _round(total_purchases), "total_receipts": _round(total_receipts),
            "total_payments": _round(total_payments),
            "mom": {"sales": mom("sales"), "purchases": mom("purchases"),
                    "receipts": mom("receipts"), "payments": mom("payments")},
        },
        "liquidity": {
            "banks": banks, "bank_total": _round(bank_total), "cash_in_hand": cash_in_hand,
            "net_working_capital": _round(bank_total + cash_in_hand + debtors - creditors),
            "debtors": debtors, "creditors": creditors,
        },
        "trends": {"monthly": monthly, "prev_year": prev_year},
        "toppers": {"customers": top_customers, "suppliers": top_suppliers, "items": top_items},
        "inactive": inactive,
    }
    cfo = {
        "receivables": receivables, "payables": payables,
        "projection": projection,
        "expenses": {"direct": direct, "indirect": indirect,
                     "direct_total": _round(direct_total), "indirect_total": _round(indirect_total),
                     "revenue": _round(net_sales)},
        "financials": {"pnl": pnl, "balance_sheet": balance_sheet, "trial_balance": trial_balance},
    }
    accounts = {
        "daybook": vouchers,
        "ledgers": sorted(ledgers, key=lambda x: abs(x["closing"]), reverse=True),
        "pending_collections": pending_collections,
        "rp_summary": rp_summary,
    }
    purchase = {
        "monthly": purchase_monthly, "vendor_wise": vendor_wise,
        "vendor_payables": vendor_payables, "po_tracking": po_tracking,
        "supplier_analysis": supplier_analysis, "top_items": top_purchased_items,
        "total_purchases": _round(total_purchases),
    }
    sales = {
        "by_customer": by_customer, "by_item": by_item, "by_group": by_group,
        "by_region": by_region, "by_rep": by_rep,
        "pending_orders": pending_orders, "sfa": sfa, "buying_patterns": buying_patterns,
        "net_sales": _round(net_sales),
    }

    return {
        "company_id": cfg["id"],
        "meta": {"id": cfg["id"], "name": cfg["name"], "branch": cfg["branch"],
                 "currency": cfg["currency"], "symbol": cfg["symbol"],
                 "last_sync": TODAY.strftime("%Y-%m-%d %H:%M"), "source": "Demo Data"},
        "ceo": ceo, "cfo": cfo, "accounts": accounts,
        "purchase": purchase, "sales": sales,
        "ledger_statements": ledger_statements,
    }


def build_all():
    return [build_company(c) for c in COMPANIES]
