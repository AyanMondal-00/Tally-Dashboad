# TallyPulse — Tally ERP Analytics Dashboards

## Original Problem Statement
Web app that communicates with Tally (ERP 9 / TallyPrime), pulls data and creates dynamic role-based dashboards (Biz Analyst style), easily deployable. Five role dashboards: CEO, CFO, Accounts, Purchase, Sales. Plus core features: role-based access, automated reminders (WhatsApp/SMS/Email + UPI), mobile data entry back to Tally, inventory management, multi-company support.

## v1 User Choices
- Data source: seeded demo Tally data + Tally XML upload import
- Build all 5 dashboards (summary level)
- No login for v1
- Skip reminders/payments for v1
- Clean corporate finance look (light theme, dark toggle)

## Architecture
- Frontend: React (CRA/craco), react-router, @tanstack/react-query, recharts, shadcn/ui, Tailwind. Fonts: Plus Jakarta Sans / Inter / JetBrains Mono.
- Backend: FastAPI + Motor (MongoDB). All routes under `/api`.
- Data: `seed_data.py` deterministically generates 3 companies with precomputed dashboard payloads + ledger statements, stored in `company_data` collection. Server seeds on startup if empty.

## Implemented (2026-06)
- Multi-company switcher (header) + FY selector + dark/light toggle + live sync badge.
- CEO: business snapshot KPIs w/ MoM, liquidity/NWC panel, executive trends area chart, toppers watchlist (Top 5/10/30 customers/suppliers/items), inactive account alerts.
- CFO: receivables/payables aging (bucket charts + rows), cash flow projection, expense breakdown donut, financials tabs (P&L, Balance Sheet, Trial Balance).
- Accounts: searchable live daybook, general ledger list with voucher-level drill-down modal, pending collections, cash/bank receipt-payment summary KPIs.
- Purchase: purchase trend area, vendor-wise bar, vendor payables, PO tracking, supplier analysis.
- Sales: performance analytics (customer/item/group/region/rep), pending sales orders, SFA field-visit GPS log, customer buying patterns.
- Tally Sync Manager: XML upload (parses vouchers → imported company) + restore demo data. Endpoint `/api/upload`, `/api/reset-demo`.
- All recharts series render reliably (ResponsiveChart remount + animations disabled).

## Backlog (P1/P2)
- P1: Role-based access control + auth (CEO/CFO/Accountant/Sales/Purchase roles hiding P&L etc.)
- P1: Real Tally connector (local agent/ODBC bridge) for live sync
- P1: Automated outstanding reminders (Email via Resend, then WhatsApp/SMS) + UPI/payment links
- P2: Mobile data entry (quotations/SO/PO/receipts) syncing back to Tally
- P2: Inventory module (godown-wise stock, reorder alerts, batch, dead-stock)
- P2: Excel export import; richer XLSX parsing
- P2: YoY overlay on trend charts; drill-down on more widgets

## Next Tasks
1. Add auth + RBAC to gate dashboards by role
2. Email reminders for overdue receivables
3. Inventory dashboard module
