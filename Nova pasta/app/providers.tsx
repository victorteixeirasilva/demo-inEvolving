"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyledComponentsRegistry } from "@/styles/registry";
import { ThemeHydration } from "@/app/theme-hydration";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StyledComponentsRegistry>
        <ThemeHydration />
        {children}
      </StyledComponentsRegistry>
    </QueryClientProvider>
  );
}
