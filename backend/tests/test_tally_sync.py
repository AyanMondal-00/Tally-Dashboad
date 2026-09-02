"""Tally Sync Manager tests: status, incremental merge upload, replace, dashboards, disconnect.

NOTE: this module mutates the shared 'tally-import' company. Run serially (-n 0)
alongside backend_test.py::TestUpload which touches the same document.
"""
import os
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing from env and /app/frontend/.env")
API = base_url.rstrip("/") + "/api"

FIX = Path("/app/backend/tests/fixtures")
INITIAL = FIX / "tally_initial.xml"
REFRESH = FIX / "tally_refresh.xml"
TALLY_ID = "tally-import"
ROLES = ["ceo", "cfo", "accounts", "purchase", "sales"]


def _upload(path: Path, mode="merge"):
    with open(path, "rb") as fh:
        return requests.post(f"{API}/upload", params={"mode": mode},
                             files={"file": (path.name, fh, "application/xml")}, timeout=60)


def _disconnect():
    return requests.delete(f"{API}/tally", timeout=30)


@pytest.fixture(scope="module", autouse=True)
def clean_slate():
    _disconnect()
    yield
    _disconnect()


class TestTallySyncFlow:
    """Full sequential Tally Sync lifecycle."""

    def test_01_status_disconnected_baseline(self):
        r = requests.get(f"{API}/tally/status", timeout=30)
        assert r.status_code == 200, r.text[:300]
        assert r.json() == {"connected": False}

        c = requests.get(f"{API}/companies", timeout=30)
        assert c.status_code == 200
        ids = {x["id"] for x in c.json()}
        assert ids == {"acme-tech", "acme-retail", "acme-global"}, ids

    def test_02_initial_upload_creates_import(self):
        r = _upload(INITIAL, "merge")
        assert r.status_code == 200, r.text[:400]
        b = r.json()
        assert b["company_id"] == TALLY_ID
        assert b["new_vouchers"] == 3, b
        assert b["total_vouchers"] == 3, b
        assert b["meta"]["voucher_count"] == 3
        assert b["meta"]["currency"] == "INR"
        assert b["meta"]["symbol"] == "\u20b9"
        assert b["meta"]["source"] == "Tally Import"

    def test_03_status_connected(self):
        r = requests.get(f"{API}/tally/status", timeout=30)
        assert r.status_code == 200
        b = r.json()
        assert b["connected"] is True
        assert b["meta"]["voucher_count"] == 3
        assert b["meta"]["id"] == TALLY_ID

    def test_04_initial_dashboard_numbers(self):
        r = requests.get(f"{API}/dashboard/ceo", params={"company_id": TALLY_ID}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        snap = r.json()["data"]["business_snapshot"]
        assert snap["gross_sales"] == 100000
        assert snap["total_purchases"] == 60000
        assert snap["total_receipts"] == 40000
        assert snap["total_payments"] == 0

    def test_05_merge_dedupes_and_adds(self):
        r = _upload(REFRESH, "merge")
        assert r.status_code == 200, r.text[:400]
        b = r.json()
        assert b["new_vouchers"] == 2, b   # S2 + PM1 new, S1 deduped
        assert b["total_vouchers"] == 5, b
        assert b["meta"]["voucher_count"] == 5

        s = requests.get(f"{API}/tally/status", timeout=30).json()
        assert s["meta"]["voucher_count"] == 5

    def test_06_merge_idempotent_reupload(self):
        r = _upload(REFRESH, "merge")
        assert r.status_code == 200, r.text[:400]
        b = r.json()
        assert b["new_vouchers"] == 0, b
        assert b["total_vouchers"] == 5, b

    def test_07_ceo_after_merge(self):
        b = requests.get(f"{API}/dashboard/ceo", params={"company_id": TALLY_ID}, timeout=30).json()
        snap = b["data"]["business_snapshot"]
        assert snap["gross_sales"] == 175000, snap
        assert snap["total_purchases"] == 60000
        assert snap["total_receipts"] == 40000
        assert snap["total_payments"] == 30000
        liq = b["data"]["liquidity"]
        assert liq["debtors"] == 135000, liq      # 175000 - 40000
        assert liq["creditors"] == 30000, liq     # 60000 - 30000
        assert liq["net_working_capital"] == 105000
        months = [m["month"] for m in b["data"]["trends"]["monthly"]]
        assert months == ["Apr 26", "May 26"], months

    def test_08_cfo_buckets(self):
        d = requests.get(f"{API}/dashboard/cfo", params={"company_id": TALLY_ID}, timeout=30).json()["data"]
        for side in ("receivables", "payables"):
            assert set(d[side]["buckets"]) == {"0_30", "31_60", "61_90", "above_90"}
            assert isinstance(d[side]["rows"], list)
        assert round(sum(d["receivables"]["buckets"].values()), 2) == 135000
        assert round(sum(d["payables"]["buckets"].values()), 2) == 30000
        pnl = d["financials"]["pnl"]
        assert pnl["revenue"] == 175000
        assert pnl["cogs"] == 60000
        assert pnl["gross_profit"] == 115000

    def test_09_accounts_dashboard(self):
        d = requests.get(f"{API}/dashboard/accounts", params={"company_id": TALLY_ID}, timeout=30).json()["data"]
        assert len(d["daybook"]) == 5, d["daybook"]
        types = sorted(v["type"] for v in d["daybook"])
        assert types == ["Payment", "Purchase", "Receipt", "Sales", "Sales"], types
        # daybook newest first
        dates = [v["date"] for v in d["daybook"]]
        assert dates == sorted(dates, reverse=True), dates
        names = {lg["name"] for lg in d["ledgers"]}
        assert names == {"Alpha Traders", "Beta Supplies"}, names
        assert len(d["pending_collections"]) == 1
        pc = d["pending_collections"][0]
        assert pc["party"] == "Alpha Traders"
        assert pc["amount"] == 135000
        assert pc["bill_no"] == "S2"
        assert "rp_summary" in d

    def test_10_purchase_and_sales(self):
        p = requests.get(f"{API}/dashboard/purchase", params={"company_id": TALLY_ID}, timeout=30).json()["data"]
        assert p["total_purchases"] == 60000
        assert {v["vendor"] for v in p["vendor_wise"]} == {"Beta Supplies"}
        assert p["vendor_payables"][0]["vendor"] == "Beta Supplies"
        assert p["vendor_payables"][0]["outstanding"] == 30000

        s = requests.get(f"{API}/dashboard/sales", params={"company_id": TALLY_ID}, timeout=30).json()["data"]
        assert s["net_sales"] == 175000
        assert s["by_customer"] == [{"name": "Alpha Traders", "value": 175000}], s["by_customer"]

    def test_11_ledger_reconciles(self):
        r = requests.get(f"{API}/ledger/alpha-traders", params={"company_id": TALLY_ID}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        st = r.json()["statement"]
        assert st["name"] == "Alpha Traders"
        assert len(st["transactions"]) == 3
        assert st["transactions"][-1]["balance"] == st["closing"]
        assert st["closing"] == 135000
        running = st["opening"]
        for t in st["transactions"]:
            running += t["debit"] - t["credit"]
            assert round(running, 2) == t["balance"], t

        r2 = requests.get(f"{API}/ledger/beta-supplies", params={"company_id": TALLY_ID}, timeout=30)
        assert r2.status_code == 200
        st2 = r2.json()["statement"]
        assert st2["transactions"][-1]["balance"] == st2["closing"]

    def test_12_no_mongo_id_leak(self):
        for role in ROLES:
            body = requests.get(f"{API}/dashboard/{role}", params={"company_id": TALLY_ID}, timeout=30).text
            assert '"_id"' not in body, role

    def test_13_import_appears_in_companies(self):
        ids = {c["id"] for c in requests.get(f"{API}/companies", timeout=30).json()}
        assert TALLY_ID in ids

    def test_14_replace_mode_resets(self):
        r = _upload(INITIAL, "replace")
        assert r.status_code == 200, r.text[:400]
        b = r.json()
        assert b["new_vouchers"] == 3, b
        assert b["total_vouchers"] == 3, b
        snap = requests.get(f"{API}/dashboard/ceo", params={"company_id": TALLY_ID},
                            timeout=30).json()["data"]["business_snapshot"]
        assert snap["gross_sales"] == 100000
        assert snap["total_payments"] == 0

    def test_15_reset_demo_removes_import(self):
        r = requests.post(f"{API}/reset-demo", timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert requests.get(f"{API}/tally/status", timeout=30).json()["connected"] is False
        ids = {c["id"] for c in requests.get(f"{API}/companies", timeout=30).json()}
        assert ids == {"acme-tech", "acme-retail", "acme-global"}, ids

    def test_16_disconnect(self):
        assert _upload(INITIAL, "merge").status_code == 200
        assert requests.get(f"{API}/tally/status", timeout=30).json()["connected"] is True
        r = _disconnect()
        assert r.status_code == 200, r.text[:300]
        assert r.json()["status"] == "ok"
        assert requests.get(f"{API}/tally/status", timeout=30).json()["connected"] is False
        assert requests.get(f"{API}/dashboard/ceo", params={"company_id": TALLY_ID},
                            timeout=30).status_code == 404

    def test_17_disconnect_idempotent(self):
        assert _disconnect().status_code == 200
        assert requests.get(f"{API}/tally/status", timeout=30).json()["connected"] is False


class TestTallyUploadValidation:
    """Negative cases for POST /api/upload."""

    def test_non_xml_rejected(self):
        r = requests.post(f"{API}/upload", files={"file": ("a.txt", b"hello", "text/plain")}, timeout=30)
        assert r.status_code == 400, r.text[:200]

    def test_malformed_xml_rejected(self):
        r = requests.post(f"{API}/upload", files={"file": ("a.xml", b"<ENVELOPE><BODY>", "application/xml")}, timeout=30)
        assert r.status_code == 400, r.text[:200]

    def test_xml_without_vouchers_rejected(self):
        r = requests.post(f"{API}/upload",
                          files={"file": ("a.xml", b"<ENVELOPE><BODY><DATA/></BODY></ENVELOPE>", "application/xml")},
                          timeout=30)
        assert r.status_code == 400, r.text[:200]

    def test_invalid_mode_falls_back_safely(self):
        r = _upload(INITIAL, "bogus")
        assert r.status_code in (200, 400, 422), r.text[:200]
        _disconnect()
