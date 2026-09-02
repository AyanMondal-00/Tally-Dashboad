"""Backend API tests for Tally Dashboards app (no auth)."""
import io
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_IDS = {"acme-tech", "acme-retail", "acme-global"}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health / root ---
class TestRoot:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()


# --- Companies ---
class TestCompanies:
    def test_companies_seeded(self, client):
        r = client.get(f"{API}/companies")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = {c["id"] for c in data}
        assert DEMO_IDS.issubset(ids), ids
        for c in data:
            for k in ("id", "name", "currency", "symbol", "last_sync", "source"):
                assert k in c, (c, k)
        by_id = {c["id"]: c for c in data}
        assert by_id["acme-tech"]["symbol"] == "\u20b9"
        assert by_id["acme-global"]["symbol"] == "$"
        assert by_id["acme-global"]["currency"] == "USD"


# --- Dashboards ---
class TestDashboards:
    @pytest.mark.parametrize("company_id", sorted(DEMO_IDS))
    @pytest.mark.parametrize("role", ["ceo", "cfo", "accounts", "purchase", "sales"])
    def test_dashboard_ok(self, client, role, company_id):
        r = client.get(f"{API}/dashboard/{role}", params={"company_id": company_id})
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert "meta" in body and "data" in body
        assert body["meta"]["id"] == company_id
        assert isinstance(body["data"], dict) and body["data"]

    def test_ceo_structure(self, client):
        d = client.get(f"{API}/dashboard/ceo", params={"company_id": "acme-tech"}).json()["data"]
        for k in ("business_snapshot", "liquidity", "trends", "toppers", "inactive"):
            assert k in d
        assert len(d["trends"]["monthly"]) == 12
        assert len(d["toppers"]["customers"]) == 30
        assert d["toppers"]["suppliers"] and d["toppers"]["items"]
        snap = d["business_snapshot"]
        for k in ("gross_sales", "net_sales", "total_purchases", "total_receipts", "total_payments", "mom"):
            assert k in snap
        assert snap["gross_sales"] > 0
        # toppers sorted desc by billing
        billings = [c["billing"] for c in d["toppers"]["customers"]]
        assert billings == sorted(billings, reverse=True)
        liq = d["liquidity"]
        for k in ("banks", "bank_total", "cash_in_hand", "debtors", "creditors", "net_working_capital"):
            assert k in liq
        assert d["toppers"]["customers"][0]["name"]

    def test_cfo_structure(self, client):
        d = client.get(f"{API}/dashboard/cfo", params={"company_id": "acme-tech"}).json()["data"]
        for k in ("receivables", "payables", "financials"):
            assert k in d
        for side in ("receivables", "payables"):
            buckets = d[side]["buckets"]
            for b in ("0_30", "31_60", "61_90", "above_90"):
                assert b in buckets
            assert d[side]["rows"]
        fin = d["financials"]
        for k in ("pnl", "balance_sheet", "trial_balance"):
            assert k in fin
        assert fin["pnl"]["revenue"] > 0
        assert fin["trial_balance"]
        assert fin["balance_sheet"]["assets"] and fin["balance_sheet"]["liabilities"]

    def test_accounts_structure(self, client):
        d = client.get(f"{API}/dashboard/accounts", params={"company_id": "acme-tech"}).json()["data"]
        for k in ("daybook", "ledgers", "pending_collections", "rp_summary"):
            assert k in d and d[k]
        row = d["daybook"][0]
        for k in ("date", "type", "voucher_no", "party", "amount"):
            assert k in row
        lg = d["ledgers"][0]
        for k in ("id", "name", "group", "opening"):
            assert k in lg, lg

    def test_purchase_structure(self, client):
        d = client.get(f"{API}/dashboard/purchase", params={"company_id": "acme-tech"}).json()["data"]
        for k in ("monthly", "vendor_wise", "vendor_payables", "po_tracking", "supplier_analysis"):
            assert k in d and d[k], k

    def test_sales_structure(self, client):
        d = client.get(f"{API}/dashboard/sales", params={"company_id": "acme-tech"}).json()["data"]
        for k in ("by_customer", "pending_orders", "sfa", "buying_patterns"):
            assert k in d and d[k], k

    def test_unknown_role_404(self, client):
        r = client.get(f"{API}/dashboard/hr", params={"company_id": "acme-tech"})
        assert r.status_code == 404

    def test_unknown_company_404(self, client):
        r = client.get(f"{API}/dashboard/ceo", params={"company_id": "nope-co"})
        assert r.status_code == 404

    def test_missing_company_param_422(self, client):
        r = client.get(f"{API}/dashboard/ceo")
        assert r.status_code == 422

    def test_company_data_differs(self, client):
        a = client.get(f"{API}/dashboard/ceo", params={"company_id": "acme-tech"}).json()
        b = client.get(f"{API}/dashboard/ceo", params={"company_id": "acme-global"}).json()
        assert a["data"]["business_snapshot"]["gross_sales"] != b["data"]["business_snapshot"]["gross_sales"]
        assert b["meta"]["symbol"] == "$"

    def test_no_mongo_id_leak(self, client):
        r = client.get(f"{API}/dashboard/ceo", params={"company_id": "acme-tech"})
        assert "_id" not in r.text[:2000]


# --- Ledger drilldown ---
class TestLedger:
    def test_ledger_statement(self, client):
        r = client.get(f"{API}/ledger/horizon-media", params={"company_id": "acme-tech"})
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert "meta" in body and "statement" in body
        stmt = body["statement"]
        assert stmt.get("transactions"), stmt
        t = stmt["transactions"][0]
        for k in ("date", "voucher_type", "voucher_no", "debit", "credit"):
            assert k in t, t

    def test_ledger_ids_from_dashboard_resolve(self, client):
        d = client.get(f"{API}/dashboard/accounts", params={"company_id": "acme-tech"}).json()["data"]
        checked = 0
        for lg in d["ledgers"][:5]:
            lid = lg.get("id")
            if not lid:
                continue
            r = client.get(f"{API}/ledger/{lid}", params={"company_id": "acme-tech"})
            assert r.status_code == 200, f"{lid} -> {r.status_code}"
            checked += 1
        assert checked > 0

    def test_ledger_404(self, client):
        r = client.get(f"{API}/ledger/does-not-exist", params={"company_id": "acme-tech"})
        assert r.status_code == 404


# --- Upload (Tally XML import) ---
VALID_XML = """<ENVELOPE><BODY><IMPORTDATA><REQUESTDATA>
<TALLYMESSAGE><VOUCHER VCHTYPE="Sales">
<DATE>20260315</DATE><VOUCHERNUMBER>TEST-1</VOUCHERNUMBER>
<PARTYLEDGERNAME>TEST_Alpha Traders</PARTYLEDGERNAME><NARRATION>TEST sale</NARRATION>
<ALLLEDGERENTRIES.LIST><LEDGERNAME>TEST_Alpha Traders</LEDGERNAME><AMOUNT>-125000.50</AMOUNT></ALLLEDGERENTRIES.LIST>
</VOUCHER></TALLYMESSAGE>
<TALLYMESSAGE><VOUCHER VCHTYPE="Purchase">
<DATE>20260320</DATE><VOUCHERNUMBER>TEST-2</VOUCHERNUMBER>
<PARTYLEDGERNAME>TEST_Beta Supplies</PARTYLEDGERNAME>
<ALLLEDGERENTRIES.LIST><LEDGERNAME>TEST_Beta Supplies</LEDGERNAME><AMOUNT>60000</AMOUNT></ALLLEDGERENTRIES.LIST>
</VOUCHER></TALLYMESSAGE>
<TALLYMESSAGE><VOUCHER VCHTYPE="Receipt">
<DATE>20260322</DATE><VOUCHERNUMBER>TEST-3</VOUCHERNUMBER>
<PARTYLEDGERNAME>TEST_Alpha Traders</PARTYLEDGERNAME>
<ALLLEDGERENTRIES.LIST><LEDGERNAME>Bank</LEDGERNAME><AMOUNT>50000</AMOUNT></ALLLEDGERENTRIES.LIST>
</VOUCHER></TALLYMESSAGE>
</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"""


class TestUpload:
    def test_upload_valid_xml(self):
        files = {"file": ("daybook.xml", io.BytesIO(VALID_XML.encode()), "text/xml")}
        r = requests.post(f"{API}/upload", params={"mode": "replace"}, files=files)
        assert r.status_code == 200, r.text[:400]
        body = r.json()
        assert body["total_vouchers"] == 3, body
        assert body["new_vouchers"] == 3, body
        assert body["company_id"] == "tally-import"
        assert body["meta"]["source"] == "Tally Import"

        # verify persisted + derived numbers
        comp = requests.get(f"{API}/companies").json()
        assert "tally-import" in {c["id"] for c in comp}
        ceo = requests.get(f"{API}/dashboard/ceo", params={"company_id": "tally-import"}).json()["data"]
        assert ceo["business_snapshot"]["gross_sales"] == 125000.5
        assert ceo["business_snapshot"]["total_purchases"] == 60000
        assert ceo["business_snapshot"]["total_receipts"] == 50000
        assert len(ceo["trends"]["monthly"]) >= 1
        names = {c["name"] for c in ceo["toppers"]["customers"]}
        assert "TEST_Alpha Traders" in names
        acc = requests.get(f"{API}/dashboard/accounts", params={"company_id": "tally-import"}).json()["data"]
        assert len(acc["daybook"]) == 3

    def test_upload_all_roles_render_shape(self):
        """Imported company must expose every role key so the UI does not crash."""
        for role in ["ceo", "cfo", "accounts", "purchase", "sales"]:
            r = requests.get(f"{API}/dashboard/{role}", params={"company_id": "tally-import"})
            assert r.status_code == 200, f"{role}: {r.text[:200]}"

    def test_upload_non_xml_400(self):
        files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 400

    def test_upload_malformed_xml_400(self):
        files = {"file": ("bad.xml", io.BytesIO(b"<ENVELOPE><BODY>"), "text/xml")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 400

    def test_upload_xml_without_vouchers_400(self):
        files = {"file": ("empty.xml", io.BytesIO(b"<ENVELOPE><BODY><NODATA/></BODY></ENVELOPE>"), "text/xml")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 400
        assert "voucher" in r.json()["detail"].lower()


# --- Reset demo ---
class TestResetDemo:
    def test_reset_demo(self, client):
        r = client.post(f"{API}/reset-demo")
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["companies"] == 3
        comp = client.get(f"{API}/companies").json()
        assert DEMO_IDS.issubset({c["id"] for c in comp})
        ceo = client.get(f"{API}/dashboard/ceo", params={"company_id": "acme-tech"}).json()
        assert ceo["data"]["business_snapshot"]["gross_sales"] > 0


# --- Data consistency (known issue) ---
class TestLedgerConsistency:
    def test_ledger_balance_reconciles(self, client):
        """opening + debit - credit should equal closing, and the last running
        balance in the statement should equal the closing balance."""
        d = client.get(f"{API}/dashboard/accounts", params={"company_id": "acme-tech"}).json()["data"]
        lg = d["ledgers"][0]
        computed = round(lg["opening"] + lg["debit"] - lg["credit"], 2)
        stmt = client.get(f"{API}/ledger/{lg['id']}", params={"company_id": "acme-tech"}).json()["statement"]
        last_bal = stmt["transactions"][-1]["balance"]
        assert abs(computed - lg["closing"]) < 1, (
            f"{lg['id']}: opening+dr-cr={computed} != closing={lg['closing']}")
        assert abs(last_bal - stmt["closing"]) < 1, (
            f"{lg['id']}: last running balance={last_bal} != closing={stmt['closing']}")
