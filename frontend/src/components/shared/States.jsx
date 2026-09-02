import React from "react";
import { Loader2, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const PageLoading = () => (
  <div className="grid gap-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
    </div>
    <Skeleton className="h-80 rounded-lg" />
    <div className="grid lg:grid-cols-2 gap-6">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  </div>
);

export const EmptyState = ({ label = "No data available" }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <Inbox className="h-8 w-8 text-muted-foreground/50" />
    <p className="mt-2 text-sm text-muted-foreground">{label}</p>
  </div>
);
