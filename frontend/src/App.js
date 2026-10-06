import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { Layout } from "@/components/layout/Layout";
import { Toaster } from "@/components/ui/sonner";
import CeoDashboard from "@/pages/CeoDashboard";
import CfoDashboard from "@/pages/CfoDashboard";
import AccountsDashboard from "@/pages/AccountsDashboard";
import PurchaseDashboard from "@/pages/PurchaseDashboard";
import SalesDashboard from "@/pages/SalesDashboard";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout title="Tally Analytics Suite" />}>
            <Route index element={<Navigate to="/ceo" replace />} />
            <Route path="/ceo" element={<CeoDashboard />} />
            <Route path="/cfo" element={<CfoDashboard />} />
            <Route path="/accounts" element={<AccountsDashboard />} />
            <Route path="/purchase" element={<PurchaseDashboard />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="*" element={<Navigate to="/ceo" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}

export default App;
