import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import {
  Crown, LineChart, BookOpen, ShoppingCart, TrendingUp,
  UploadCloud, Boxes, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/ceo", label: "CEO", desc: "Executive View", icon: Crown, testId: "nav-ceo-dashboard" },
  { to: "/cfo", label: "CFO", desc: "Financial Control", icon: LineChart, testId: "nav-cfo-dashboard" },
  { to: "/accounts", label: "Accounts", desc: "Books & Ledgers", icon: BookOpen, testId: "nav-accounts-dashboard" },
  { to: "/purchase", label: "Purchase", desc: "Procurement", icon: ShoppingCart, testId: "nav-purchase-dashboard" },
  { to: "/sales", label: "Sales", desc: "Revenue & SFA", icon: TrendingUp, testId: "nav-sales-dashboard" },
];

export const Sidebar = ({ onUpload }) => {
  const [open, setOpen] = useState(false);
  const { company } = useApp();

  const buildInner = (suffix = "") => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-display leading-tight">TallyPulse</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">Analytics Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Role Dashboards</p>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={n.testId + suffix}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors group",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <n.icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                <span className="flex flex-col">
                  <span className="font-medium leading-tight">{n.label}</span>
                  <span className={cn("text-[11px] leading-tight", isActive ? "text-blue-100" : "text-slate-500")}>{n.desc}</span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          data-testid={"data-upload-button" + suffix}
          onClick={() => { onUpload(); setOpen(false); }}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <UploadCloud className="h-4.5 w-4.5 text-blue-400" />
          <span className="font-medium">Tally Sync Manager</span>
        </button>
        {company && (
          <p className="px-3 pt-3 text-[11px] text-slate-500">
            Source: <span className="text-slate-300">{company.source}</span>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        data-testid="sidebar-toggle"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-2.5 left-2.5 z-40 p-2 rounded-lg bg-slate-900/90 text-white shadow-md hover:bg-slate-800 transition-colors backdrop-blur-sm"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-slate-900 z-40 border-r border-slate-800">{buildInner("")}</aside>

      {/* Mobile drawer with slide-in animation */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
            onClick={() => setOpen(false)} 
          />
          <div className="relative w-64 max-w-[80vw] bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-fade-up">
            <button 
              onClick={() => setOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {buildInner("-mobile")}
          </div>
        </div>
      )}
    </>
  );
};
