/**
 * Deterministic Tally ERP Demo Data Generator
 * -------------------------------------------
 * Ei module-ti 3-ti demo company-r (Acme Tech, Acme Retail, Acme Global)
 * jonne data generate kore ebong 5-ti role dashboard (CEO, CFO, Accounts,
 * Purchase, Sales) er pre-computed payload toiri kore.
 */

// Base reference date for deterministic simulation
const TODAY = new Date('2026-06-15T00:00:00.000Z');

// Customer List (Sundry Debtors)
const CUSTOMERS = [
  "Skyline Interiors", "Meridian Traders", "Blue Ocean Exports", "Nova Retail Pvt Ltd",
  "Pinnacle Systems", "Greenfield Agro", "Urban Nest Furnishings", "Crescent Pharma",
  "Vertex Engineering", "Harbour Logistics", "Sunrise Textiles", "Zenith Electronics",
  "Cobalt Industries", "Everest Foods", "Lotus Healthcare", "Falcon Automotive",
  "Radiant Solar", "Ironclad Hardware", "Maple Stationers", "Quantum Infotech",
  "Silverline Ceramics", "Aster Chemicals", "Brightway Distributors", "Delta Packaging",
  "Emerald Jewels", "Frontier Motors", "Galaxy Sports", "Horizon Media",
  "Indigo Apparels", "Jubilee Confectionery"
];

// Supplier List (Sundry Creditors)
const SUPPLIERS = [
  "Apex Raw Materials", "Bharat Steel Co", "Coastal Timber", "Deccan Plastics",
  "Everflow Chemicals", "Fortune Components", "Global Fabrics", "Himalaya Packaging",
  "Indus Metals", "Jyoti Electricals", "Kaveri Paper Mills", "Lumen Lighting",
  "Metro Adhesives", "Nirmal Alloys", "Orion Bearings", "Prime Polymers",
  "Rapid Fasteners", "Suryan Glass", "Tulip Pigments", "Unity Castings"
];

// Product Items with category
const ITEMS = [
  ["Steel Rod 12mm", "Raw Metals"], ["Aluminium Sheet", "Raw Metals"],
  ["Copper Wire Spool", "Electricals"], ["LED Panel 40W", "Electricals"],
  ["PVC Pipe 4in", "Plastics"], ["Acrylic Sheet", "Plastics"],
  ["Teak Plywood", "Timber"], ["Laminate Board", "Timber"],
  ["Industrial Adhesive", "Chemicals"], ["Epoxy Resin 5L", "Chemicals"],
  ["Ball Bearing 6204", "Components"], ["Hex Bolt M10", "Components"],
  ["Cotton Fabric Roll", "Textiles"], ["Polyester Yarn", "Textiles"],
  ["Cement Bag 50kg", "Construction"], ["Ceramic Tile 2x2", "Construction"],
  ["Solar Module 330W", "Energy"], ["Lithium Battery 100Ah", "Energy"],
  ["Corrugated Box L", "Packaging"], ["Bubble Wrap Roll", "Packaging"]
];

const REPS = ["Rahul Menon", "Priya Nair", "Arjun Desai", "Sneha Kulkarni", "Vikram Rao", "Anita Shah"];
const REGIONS = ["North", "South", "East", "West", "Central"];

const COMPANIES = [
  { id: "acme-tech", name: "Acme Tech Corp", branch: "Head Office", currency: "INR", symbol: "₹", scale: 1.0, seed: 101 },
  { id: "acme-retail", name: "Acme Retail West", branch: "Mumbai Branch", currency: "INR", symbol: "₹", scale: 0.55, seed: 202 },
  { id: "acme-global", name: "Acme Global Exports", branch: "SEZ Unit", currency: "USD", symbol: "$", scale: 1.45, seed: 303 }
];

const VTYPES = ["Sales", "Purchase", "Receipt", "Payment", "Journal"];

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Jate seed same thakle output shobshomoy same thake.
 */
function createRng(seed) {
  let s = seed >>> 0;
  return {
    // Generates a float between 0 and 1
    random() {
      let t = (s += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    // Float between min and max
    uniform(min, max) {
      return min + this.random() * (max - min);
    },
    // Random integer between min and max inclusive
    randint(min, max) {
      return Math.floor(min + this.random() * (max - min + 1));
    },
    // Pick a random element from an array
    choice(arr) {
      return arr[Math.floor(this.random() * arr.length)];
    },
    // Weighted choice
    weightedChoice(items, weights) {
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let threshold = this.random() * totalWeight;
      for (let i = 0; i < items.length; i++) {
        threshold -= weights[i];
        if (threshold <= 0) return items[i];
      }
      return items[items.length - 1];
    }
  };
}

// Helper: 2 decimal places rounding
function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

// Helper: Month formatting
function monthLabels(n = 12) {
  const labels = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let y = TODAY.getUTCFullYear();
  let m = TODAY.getUTCMonth() + 1; // 1-12

  for (let i = n - 1; i >= 0; i--) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    const shortYear = String(yy).slice(2);
    const monthStr = monthNames[mm - 1];
    labels.push({
      yy,
      mm,
      label: `${monthStr} ${shortYear}`
    });
  }
  return labels;
}

// Helper: Format Date to YYYY-MM-DD
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// Helper: Format DateTime to YYYY-MM-DD HH:mm
function formatDateTime(d) {
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

/**
 * Build Single Company Demo Dataset
 */
function buildCompany(cfg) {
  const rng = createRng(cfg.seed);
  const scale = cfg.scale;
  const months = monthLabels(12);
  const prevMonths = monthLabels(24).slice(0, 12);

  // 1. Monthly Trends (Sales, Purchases, Receipts, Payments)
  const base = 3200000 * scale;
  const monthly = [];

  months.forEach((mObj, idx) => {
    const growth = 1 + (idx * 0.018) + rng.uniform(-0.06, 0.08);
    const sales = base * growth * rng.uniform(0.9, 1.12);
    const purchases = sales * rng.uniform(0.55, 0.66);
    const gpMargin = rng.uniform(22, 34);

    monthly.push({
      month: mObj.label,
      y: mObj.yy,
      m: mObj.mm,
      sales: round2(sales),
      purchases: round2(purchases),
      gross_profit: round2(sales * gpMargin / 100),
      gp_margin: round2(gpMargin),
      receipts: round2(sales * rng.uniform(0.78, 0.94)),
      payments: round2(purchases * rng.uniform(0.8, 0.95))
    });
  });

  const prevYear = prevMonths.map(() => round2(base * rng.uniform(0.72, 0.9)));

  const grossSales = monthly.reduce((sum, x) => sum + x.sales, 0);
  const returns = grossSales * rng.uniform(0.02, 0.04);
  const netSales = grossSales - returns;
  const totalPurchases = monthly.reduce((sum, x) => sum + x.purchases, 0);
  const totalReceipts = monthly.reduce((sum, x) => sum + x.receipts, 0);
  const totalPayments = monthly.reduce((sum, x) => sum + x.payments, 0);

  // Month-over-Month calculation
  function getMoM(field) {
    if (monthly.length < 2) return 0;
    const cur = monthly[monthly.length - 1][field];
    const prev = monthly[monthly.length - 2][field];
    return prev ? round2(((cur - prev) / prev) * 100) : 0;
  }

  // 2. Liquidity (Bank accounts and Cash in Hand)
  const banks = [
    { name: "HDFC Current A/c", balance: round2(4200000 * scale * rng.uniform(0.8, 1.3)) },
    { name: "ICICI Current A/c", balance: round2(2600000 * scale * rng.uniform(0.7, 1.2)) },
    { name: "SBI OD A/c", balance: round2(-900000 * scale * rng.uniform(0.6, 1.1)) }
  ];
  const cashInHand = round2(320000 * scale * rng.uniform(0.7, 1.3));
  const bankTotal = banks.reduce((sum, b) => sum + b.balance, 0);

  // 3. Parties (Customers and Suppliers)
  function makeParties(names, kind) {
    return names.map(nm => {
      const vol = rng.uniform(0.3, 1.0);
      const totalVolume = kind === "customer" ? grossSales : totalPurchases;
      const billing = round2((totalVolume * vol / names.length) * rng.uniform(0.4, 2.2));
      const outstanding = round2(billing * rng.uniform(0.05, 0.35));
      const lastDays = rng.choice([2, 5, 9, 14, 21, 30, 45, 62, 88, 120, 150]);
      return {
        name: nm,
        billing,
        outstanding,
        last_active_days: lastDays
      };
    });
  }

  const customers = makeParties(CUSTOMERS, "customer");
  const suppliers = makeParties(SUPPLIERS, "supplier");

  // 4. Item Revenue
  const itemRev = ITEMS.map(([nm, grp]) => {
    const rev = round2((grossSales / ITEMS.length) * rng.uniform(0.4, 2.3));
    const qty = Math.floor(rev / rng.uniform(800, 4000));
    const movement = rng.choice(["Fast", "Fast", "Normal", "Slow", "Dead"]);
    return { name: nm, group: grp, revenue: rev, qty, movement };
  });

  const topCustomers = [...customers].sort((a, b) => b.billing - a.billing).slice(0, 30);
  const topSuppliers = [...suppliers].sort((a, b) => b.billing - a.billing).slice(0, 30);
  const topItems = [...itemRev].sort((a, b) => b.revenue - a.revenue).slice(0, 30);

  // Inactive customers (no activity for 60+ days)
  const inactive = customers
    .filter(c => c.last_active_days >= 60)
    .sort((a, b) => b.last_active_days - a.last_active_days)
    .slice(0, 12)
    .map(c => ({
      name: c.name,
      last_active_days: c.last_active_days,
      balance: c.outstanding,
      annual_value: c.billing
    }));

  // 5. Aging Buckets
  function getAging(partiesList) {
    const buckets = { "0_30": 0.0, "31_60": 0.0, "61_90": 0.0, "above_90": 0.0 };
    const rows = [];

    partiesList.forEach(p => {
      if (p.outstanding <= 0) return;
      const d = p.last_active_days;
      let b = "above_90";
      if (d <= 30) b = "0_30";
      else if (d <= 60) b = "31_60";
      else if (d <= 90) b = "61_90";

      buckets[b] += p.outstanding;
      rows.push({
        name: p.name,
        amount: p.outstanding,
        days: d,
        bucket: b
      });
    });

    const roundedBuckets = {
      "0_30": round2(buckets["0_30"]),
      "31_60": round2(buckets["31_60"]),
      "61_90": round2(buckets["61_90"]),
      "above_90": round2(buckets["above_90"])
    };
    rows.sort((a, b) => b.amount - a.amount);
    return { buckets: roundedBuckets, rows };
  }

  const receivables = getAging(customers);
  const payables = getAging(suppliers);

  // 6. Cash flow projections (Next 6 weeks)
  const projection = [];
  for (let w = 1; w <= 6; w++) {
    projection.push({
      period: `Week ${w}`,
      collections: round2((totalReceipts / 20) * rng.uniform(0.6, 1.4)),
      liabilities: round2((totalPayments / 22) * rng.uniform(0.6, 1.4))
    });
  }

  // 7. Expense Breakdown
  const directNames = ["Freight Inward", "Wages", "Power & Fuel", "Consumables", "Job Work Charges"];
  const indirectNames = ["Salaries", "Rent", "Marketing", "Travel", "Office Admin", "Professional Fees", "Bank Charges"];

  const direct = directNames.map(n => ({
    name: n,
    amount: round2(totalPurchases * rng.uniform(0.02, 0.08))
  }));
  const indirect = indirectNames.map(n => ({
    name: n,
    amount: round2(netSales * rng.uniform(0.01, 0.06))
  }));

  const directTotal = direct.reduce((sum, x) => sum + x.amount, 0);
  const indirectTotal = indirect.reduce((sum, x) => sum + x.amount, 0);

  // 8. Financials (P&L, Balance Sheet, Trial Balance)
  const cogs = round2(totalPurchases * 0.92);
  const grossProfit = round2(netSales - cogs);
  const operatingProfit = round2(grossProfit - indirectTotal);
  const netProfit = round2(operatingProfit - directTotal * 0.15);

  const pnl = {
    revenue: netSales,
    cogs,
    gross_profit: grossProfit,
    direct_expenses: directTotal,
    indirect_expenses: indirectTotal,
    operating_profit: operatingProfit,
    net_profit: netProfit,
    net_margin: netSales ? round2((netProfit / netSales) * 100) : 0
  };

  const debtors = round2(Object.values(receivables.buckets).reduce((sum, v) => sum + v, 0));
  const creditors = round2(Object.values(payables.buckets).reduce((sum, v) => sum + v, 0));
  const stockValue = round2(totalPurchases * rng.uniform(0.12, 0.2));
  const fixedAssets = round2(netSales * rng.uniform(0.3, 0.5));
  const capital = round2((fixedAssets + stockValue + debtors + bankTotal + cashInHand - creditors) * 0.7);

  const balanceSheet = {
    assets: [
      { name: "Fixed Assets", amount: fixedAssets },
      { name: "Closing Stock", amount: stockValue },
      { name: "Sundry Debtors", amount: debtors },
      { name: "Bank Accounts", amount: round2(bankTotal) },
      { name: "Cash-in-Hand", amount: cashInHand }
    ],
    liabilities: [
      { name: "Capital Account", amount: capital },
      { name: "Reserves & Surplus", amount: round2(netProfit * 1.4) },
      { name: "Sundry Creditors", amount: creditors },
      { name: "Duties & Taxes", amount: round2(netSales * 0.04) }
    ]
  };

  const trialBalance = [
    { ledger: "Sales Account", debit: 0, credit: netSales },
    { ledger: "Purchase Account", debit: totalPurchases, credit: 0 },
    { ledger: "Sundry Debtors", debit: debtors, credit: 0 },
    { ledger: "Sundry Creditors", debit: 0, credit: creditors },
    { ledger: "Bank Accounts", debit: Math.max(bankTotal, 0), credit: Math.max(-bankTotal, 0) },
    { ledger: "Cash-in-Hand", debit: cashInHand, credit: 0 },
    { ledger: "Indirect Expenses", debit: indirectTotal, credit: 0 },
    { ledger: "Direct Expenses", debit: directTotal, credit: 0 }
  ];

  // 9. Daybook Vouchers & Ledger Transactions Generation
  const vouchers = [];
  const ledgerTxn = {}; // Map party name -> list of vouchers
  const vcounters = { Sales: 0, Purchase: 0, Receipt: 0, Payment: 0, Journal: 0 };

  for (let d = 0; d < 75; d++) {
    const vDate = new Date(TODAY.getTime() - d * 24 * 60 * 60 * 1000);
    const nDay = rng.randint(2, 6);

    for (let count = 0; count < nDay; count++) {
      const vt = rng.weightedChoice(VTYPES, [35, 22, 20, 18, 5]);
      vcounters[vt] += 1;

      let party = "";
      let amt = 0;
      let narr = "";

      if (vt === "Sales") {
        party = rng.choice(customers).name;
        amt = round2((grossSales / 250) * rng.uniform(0.3, 2.5));
        narr = `Being goods sold to ${party}`;
      } else if (vt === "Purchase") {
        party = rng.choice(suppliers).name;
        amt = round2((totalPurchases / 200) * rng.uniform(0.3, 2.5));
        narr = `Being goods purchased from ${party}`;
      } else if (vt === "Receipt") {
        party = rng.choice(customers).name;
        amt = round2((grossSales / 260) * rng.uniform(0.3, 2.2));
        narr = `Being amount received from ${party}`;
      } else if (vt === "Payment") {
        party = rng.choice(suppliers).name;
        amt = round2((totalPurchases / 220) * rng.uniform(0.3, 2.2));
        narr = `Being amount paid to ${party}`;
      } else {
        party = rng.choice(["Depreciation A/c", "Rent A/c", "Salary A/c", "Bank Charges A/c"]);
        amt = round2((netSales / 400) * rng.uniform(0.2, 1.5));
        narr = `Being journal entry - ${party}`;
      }

      const prefixMap = { Sales: "SAL", Purchase: "PUR", Receipt: "RCP", Payment: "PMT", Journal: "JV" };
      const vno = `${prefixMap[vt]}/${String(vcounters[vt]).padStart(4, '0')}`;

      const voucher = {
        date: formatDate(vDate),
        type: vt,
        voucher_no: vno,
        party: party,
        amount: amt,
        narration: narr,
        mode: rng.choice(["Cash", "Bank", "Bank", "Bank"])
      };

      vouchers.push(voucher);
      if (!ledgerTxn[party]) ledgerTxn[party] = [];
      ledgerTxn[party].push(voucher);
    }
  }

  // Sort vouchers by date desc and voucher_no desc
  vouchers.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.voucher_no.localeCompare(a.voucher_no);
  });

  // 10. Ledger Statements for drill-down view
  const ledgers = [];
  const ledgerStatements = {};
  const partyDefs = [
    ["Sundry Debtors", customers],
    ["Sundry Creditors", suppliers]
  ];

  partyDefs.forEach(([group, pList]) => {
    pList.forEach(p => {
      const txns = (ledgerTxn[p.name] || []).sort((a, b) => a.date.localeCompare(b.date));
      const opening = round2(p.billing * rng.uniform(0.02, 0.1));
      let bal = opening;
      let debitTotal = 0;
      let creditTotal = 0;
      const stmtRows = [];

      txns.forEach(t => {
        const isDebit = ["Sales", "Payment", "Journal"].includes(t.type);
        const dr = isDebit ? t.amount : 0;
        const cr = !isDebit ? t.amount : 0;
        bal += dr - cr;
        debitTotal += dr;
        creditTotal += cr;

        stmtRows.push({
          date: t.date,
          voucher_type: t.type,
          voucher_no: t.voucher_no,
          debit: round2(dr),
          credit: round2(cr),
          balance: round2(bal),
          narration: t.narration
        });
      });

      const closing = round2(bal);
      const ledgerId = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'ledger';

      ledgers.push({
        id: ledgerId,
        name: p.name,
        group,
        opening,
        debit: round2(debitTotal),
        credit: round2(creditTotal),
        closing
      });

      ledgerStatements[ledgerId] = {
        name: p.name,
        group,
        opening,
        closing,
        transactions: stmtRows
      };
    });
  });

  // 11. Pending Collections
  const pendingCollections = [];
  const activeCustomersWithDebt = customers.filter(c => c.outstanding > 0).slice(0, 24);

  activeCustomersWithDebt.forEach((c, i) => {
    const invDate = new Date(TODAY.getTime() - c.last_active_days * 24 * 60 * 60 * 1000);
    const dueDate = new Date(invDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const overdue = Math.floor((TODAY.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));

    pendingCollections.push({
      bill_no: `INV/${2400 + i}`,
      party: c.name,
      date: formatDate(invDate),
      due_date: formatDate(dueDate),
      amount: c.outstanding,
      overdue_days: Math.max(overdue, 0),
      status: overdue > 0 ? "Overdue" : "Due"
    });
  });
  pendingCollections.sort((a, b) => b.overdue_days - a.overdue_days);

  // 12. Receipts & Payments Summary
  const cashR = vouchers.filter(v => v.type === "Receipt" && v.mode === "Cash").reduce((s, v) => s + v.amount, 0);
  const bankR = vouchers.filter(v => v.type === "Receipt" && v.mode === "Bank").reduce((s, v) => s + v.amount, 0);
  const cashP = vouchers.filter(v => v.type === "Payment" && v.mode === "Cash").reduce((s, v) => s + v.amount, 0);
  const bankP = vouchers.filter(v => v.type === "Payment" && v.mode === "Bank").reduce((s, v) => s + v.amount, 0);

  const rpSummary = {
    cash: { receipts: round2(cashR), payments: round2(cashP) },
    bank: { receipts: round2(bankR), payments: round2(bankP) }
  };

  // 13. Purchase Dashboard Specifics
  const purchaseMonthly = monthly.map(x => ({ month: x.month, amount: x.purchases }));
  const vendorWise = [...suppliers].sort((a, b) => b.billing - a.billing).slice(0, 12).map(s => ({
    vendor: s.name,
    amount: s.billing
  }));

  const vendorPayables = [...suppliers].sort((a, b) => b.outstanding - a.outstanding).slice(0, 15).map(s => {
    const dueOffset = rng.randint(-20, 40);
    const due = new Date(TODAY.getTime() + dueOffset * 24 * 60 * 60 * 1000);
    return {
      vendor: s.name,
      outstanding: s.outstanding,
      due_date: formatDate(due),
      credit_days_left: dueOffset
    };
  });

  const poTracking = [];
  for (let i = 0; i < 14; i++) {
    const s = rng.choice(suppliers);
    const poDate = new Date(TODAY.getTime() - rng.randint(1, 40) * 24 * 60 * 60 * 1000);
    poTracking.push({
      po_no: `PO/${1200 + i}`,
      vendor: s.name,
      date: formatDate(poDate),
      amount: round2((totalPurchases / 60) * rng.uniform(0.4, 2.0)),
      status: rng.choice(["Pending", "Partial", "Partial", "Received", "Pending"])
    });
  }

  const supplierAnalysis = [...suppliers].sort((a, b) => b.billing - a.billing).slice(0, 15).map(s => ({
    supplier: s.name,
    volume: s.billing,
    billing: s.billing,
    outstanding: s.outstanding
  }));

  const topPurchasedItems = [...itemRev].sort((a, b) => b.qty - a.qty).slice(0, 8);

  // 14. Sales Dashboard Specifics
  const byCustomer = [...customers].sort((a, b) => b.billing - a.billing).slice(0, 10).map(c => ({
    name: c.name,
    value: c.billing
  }));

  const byItem = [...itemRev].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(i => ({
    name: i.name,
    value: i.revenue
  }));

  const groups = {};
  itemRev.forEach(i => {
    groups[i.group] = (groups[i.group] || 0) + i.revenue;
  });
  const byGroup = Object.entries(groups).map(([k, v]) => ({ name: k, value: round2(v) })).sort((a, b) => b.value - a.value);

  const byRegion = REGIONS.map(r => ({
    name: r,
    value: round2((netSales / REGIONS.length) * rng.uniform(0.5, 1.6))
  }));

  const byRep = REPS.map(r => ({
    name: r,
    value: round2((netSales / REPS.length) * rng.uniform(0.5, 1.7)),
    deals: rng.randint(18, 60)
  })).sort((a, b) => b.value - a.value);

  const pendingOrders = [];
  for (let i = 0; i < 16; i++) {
    const c = rng.choice(customers);
    const oDate = new Date(TODAY.getTime() - rng.randint(1, 30) * 24 * 60 * 60 * 1000);
    const delDate = new Date(oDate.getTime() + rng.randint(5, 25) * 24 * 60 * 60 * 1000);
    pendingOrders.push({
      so_no: `SO/${3300 + i}`,
      customer: c.name,
      date: formatDate(oDate),
      delivery_date: formatDate(delDate),
      amount: round2((grossSales / 80) * rng.uniform(0.3, 2.2)),
      status: rng.choice(["Open", "Partial", "Backorder", "Open"])
    });
  }

  const sfa = [];
  for (let i = 0; i < 12; i++) {
    const rep = rng.choice(REPS);
    const c = rng.choice(customers);
    const cin = new Date(TODAY.getTime() - (rng.randint(0, 6) * 24 + rng.randint(0, 8)) * 60 * 60 * 1000);
    const dur = rng.randint(20, 90);
    const cout = new Date(cin.getTime() + dur * 60 * 1000);

    sfa.push({
      rep,
      client: c.name,
      region: rng.choice(REGIONS),
      checkin: formatDateTime(cin),
      checkout: formatDateTime(cout),
      location: `${rng.uniform(12.8, 28.6).toFixed(4)}, ${rng.uniform(72.8, 88.4).toFixed(4)}`,
      status: rng.choice(["Completed", "Completed", "In Progress"]),
      notes: rng.choice([
        "Discussed Q3 requirement, follow-up next week.",
        "Collected pending cheque, order confirmed.",
        "Product demo done, awaiting approval.",
        "Price negotiation, sent revised quote."
      ])
    });
  }

  const buyingPatterns = customers.slice(0, 12).map(c => {
    const it = rng.choice(itemRev);
    const lastPDate = new Date(TODAY.getTime() - c.last_active_days * 24 * 60 * 60 * 1000);
    return {
      customer: c.name,
      top_item: it.name,
      frequency: rng.randint(2, 14),
      last_purchase: formatDate(lastPDate),
      upsell: rng.choice(itemRev).name,
      flag: rng.random() > 0.5 ? "Upsell" : "Reorder"
    };
  });

  // Assemble full company document
  return {
    company_id: cfg.id,
    meta: {
      id: cfg.id,
      name: cfg.name,
      branch: cfg.branch,
      currency: cfg.currency,
      symbol: cfg.symbol,
      last_sync: formatDateTime(TODAY),
      source: "Demo Data"
    },
    ceo: {
      business_snapshot: {
        gross_sales: round2(grossSales),
        net_sales: round2(netSales),
        total_purchases: round2(totalPurchases),
        total_receipts: round2(totalReceipts),
        total_payments: round2(totalPayments),
        mom: {
          sales: getMoM("sales"),
          purchases: getMoM("purchases"),
          receipts: getMoM("receipts"),
          payments: getMoM("payments")
        }
      },
      liquidity: {
        banks,
        bank_total: round2(bankTotal),
        cash_in_hand: cashInHand,
        net_working_capital: round2(bankTotal + cashInHand + debtors - creditors),
        debtors,
        creditors
      },
      trends: {
        monthly,
        prev_year: prevYear
      },
      toppers: {
        customers: topCustomers,
        suppliers: topSuppliers,
        items: topItems
      },
      inactive
    },
    cfo: {
      receivables,
      payables,
      projection,
      expenses: {
        direct,
        indirect,
        direct_total: round2(directTotal),
        indirect_total: round2(indirectTotal),
        revenue: round2(netSales)
      },
      financials: {
        pnl,
        balance_sheet: balanceSheet,
        trial_balance: trialBalance
      }
    },
    accounts: {
      daybook: vouchers,
      ledgers: [...ledgers].sort((a, b) => Math.abs(b.closing) - Math.abs(a.closing)),
      pending_collections: pendingCollections,
      rp_summary: rpSummary
    },
    purchase: {
      monthly: purchaseMonthly,
      vendor_wise: vendorWise,
      vendor_payables: vendorPayables,
      po_tracking: poTracking,
      supplier_analysis: supplierAnalysis,
      top_items: topPurchasedItems,
      total_purchases: round2(totalPurchases)
    },
    sales: {
      by_customer: byCustomer,
      by_item: byItem,
      by_group: byGroup,
      by_region: byRegion,
      by_rep: byRep,
      pending_orders: pendingOrders,
      sfa,
      buying_patterns: buyingPatterns,
      net_sales: round2(netSales)
    },
    ledger_statements: ledgerStatements
  };
}

/**
 * Generate all demo companies
 */
function buildAll() {
  return COMPANIES.map(c => buildCompany(c));
}

module.exports = {
  buildAll,
  buildCompany
};
