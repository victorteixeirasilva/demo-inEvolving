"use client";

import { useQuery } from "@tanstack/react-query";
import type { ResponseDashboard } from "@/lib/types/models";
import { mockDashboard } from "@/lib/mock-data";

async function fetchDashboard(): Promise<ResponseDashboard> {
  const res = await fetch("/api/mock/dashboard");
  if (!res.ok) throw new Error("Falha ao carregar dashboard");
  return res.json();
}

export function useMockDashboard() {
  return useQuery({
    queryKey: ["mock", "dashboard"],
    queryFn: fetchDashboard,
    placeholderData: mockDashboard,
  });
}
