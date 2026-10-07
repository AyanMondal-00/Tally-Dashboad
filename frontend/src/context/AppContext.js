import React, { createContext, useContext, useEffect, useState } from "react";
import { getCompanies } from "@/lib/api";
import { setSymbol } from "@/lib/format";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = async () => {
    const list = await getCompanies();
    setCompanies(list);
    setCompanyId((prev) => {
      const exists = list.some((c) => c.id === prev);
      return exists ? prev : (list[0] && list[0].id) || null;
    });
    return list;
  };

  useEffect(() => {
    refreshCompanies().finally(() => setLoading(false));
  }, []);

  const company = companies.find((c) => c.id === companyId) || companies[0];

  useEffect(() => {
    if (company) setSymbol(company.symbol);
  }, [company]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <AppContext.Provider
      value={{
        companies,
        company,
        companyId,
        setCompanyId,
        period,
        setPeriod,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        refreshCompanies,
        dark,
        setDark,
        loading
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
