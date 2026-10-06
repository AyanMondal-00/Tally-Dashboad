import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UploadDialog } from "@/components/layout/UploadDialog";
import { useApp } from "@/context/AppContext";
import { Info } from "lucide-react";

export const Layout = ({ title }) => {
  const { company } = useApp();
  const [uploadOpen, setUploadOpen] = useState(false);
  const openUpload = () => setTimeout(() => setUploadOpen(true), 0);
  return (
    <div className="min-h-screen bg-background">
      <Sidebar onUpload={openUpload} />
      <div className="lg:pl-64">
        <Header title={title} />
        <main className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
          {company?.notice && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200 px-3.5 py-3 rounded-lg flex items-start gap-2.5 text-xs sm:text-sm animate-fade-up">
              <Info className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">{company.notice}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Tally steps: <b>Gateway of Tally &rarr; Day Book &rarr; Export (Alt+E) &rarr; XML format</b>, then click <b>Tally Sync &rarr; Refresh</b>.
                </p>
              </div>
            </div>
          )}
          <Outlet context={{ openUpload }} />
        </main>
      </div>
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
};
