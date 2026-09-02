let SYMBOL = "₹";
export const setSymbol = (s) => { SYMBOL = s || "₹"; };
export const getSymbol = () => SYMBOL;

// Compact currency: Indian (Cr/L/K) for ₹, western (M/K) for others.
export function fmtMoney(value, symbol = SYMBOL) {
  const n = Number(value) || 0;
  const neg = n < 0;
  const a = Math.abs(n);
  let out;
  if (symbol === "₹") {
    if (a >= 1e7) out = (a / 1e7).toFixed(2) + " Cr";
    else if (a >= 1e5) out = (a / 1e5).toFixed(2) + " L";
    else if (a >= 1e3) out = (a / 1e3).toFixed(1) + " K";
    else out = a.toFixed(0);
  } else {
    if (a >= 1e6) out = (a / 1e6).toFixed(2) + "M";
    else if (a >= 1e3) out = (a / 1e3).toFixed(1) + "K";
    else out = a.toFixed(0);
  }
  return `${neg ? "-" : ""}${symbol}${out}`;
}

export function fmtFull(value, symbol = SYMBOL) {
  const n = Number(value) || 0;
  const locale = symbol === "₹" ? "en-IN" : "en-US";
  return `${symbol}${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}

export function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export const CHART = {
  sales: "#3b82f6",
  purchases: "#8b5cf6",
  receipts: "#10b981",
  payments: "#ef4444",
  nwc: "#f59e0b",
  aging: { "0_30": "#10b981", "31_60": "#3b82f6", "61_90": "#f59e0b", above_90: "#ef4444" },
  palette: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316"],
};
