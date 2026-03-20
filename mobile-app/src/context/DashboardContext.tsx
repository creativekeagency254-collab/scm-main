import React, { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";

type DashboardContextValue = ReturnType<typeof useDashboardData>;

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dashboard = useDashboardData(user?.id);

  return (
    <DashboardContext.Provider value={dashboard}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside DashboardProvider");
  return value;
}
