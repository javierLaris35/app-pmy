// components/dashboard/DashboardWelcomeClient.tsx
"use client";

import { useAuthStore } from "@/store/auth.store";
import DashboardWelcomeWrapper from "./DashboardWelcomeWrapper";

export default function DashboardWelcomeClient() {
  const user = useAuthStore((s) => s.user);
  
  if (!user) return null;
  
  return <DashboardWelcomeWrapper userId={user.id} />;
}