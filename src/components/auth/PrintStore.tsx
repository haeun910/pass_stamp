"use client";
import { StoreProvider, storageKeyFor } from "@/lib/store";

export function PrintStore({ auth, memberId, children }: { auth: boolean; memberId: string | null; children: React.ReactNode }) {
  const storageKey = storageKeyFor(!auth ? null : (memberId ?? "guest"));
  return (
    <StoreProvider key={storageKey} storageKey={storageKey}>
      {children}
    </StoreProvider>
  );
}
