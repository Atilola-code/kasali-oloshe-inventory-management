// src/hooks/useSalesQueries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const queryKeys = {
  sales: ["sales"] as const,
  deposits: ["deposits"] as const,
  products: ["products"] as const,
  unsupplied: ["unsupplied"] as const,
  unsuppliedByStatus: (status: string) => ["unsupplied", status] as const,
  stopSaleStatus: ["stopSaleStatus"] as const,
  canCreateSale: ["canCreateSale"] as const,
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export function useSales() {
  return useQuery({
    queryKey: queryKeys.sales,
    queryFn: async () => {
      const res = await apiFetch("/api/sales/");
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
    staleTime: 10_000,
  });
}

// ─── Deposits ─────────────────────────────────────────────────────────────────
export function useDeposits() {
  return useQuery({
    queryKey: queryKeys.deposits,
    queryFn: async () => {
      const res = await apiFetch("/api/sales/deposits/");
      if (!res.ok) throw new Error("Failed to fetch deposits");
      return res.json();
    },
    staleTime: 10_000,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const res = await apiFetch("/api/inventory/");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 30_000,
  });
}

// ─── Unsupplied ───────────────────────────────────────────────────────────────
export function useUnsupplied(status?: string) {
  return useQuery({
    queryKey: status ? queryKeys.unsuppliedByStatus(status) : queryKeys.unsupplied,
    queryFn: async () => {
      const url = status
        ? `/api/sales/unsupplied/?status=${status}`
        : "/api/sales/unsupplied/";
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch unsupplied records");
      return res.json();
    },
    staleTime: 10_000,
  });
}

export function useMarkSupplied() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/sales/unsupplied/${id}/mark_supplied/`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark as supplied");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unsupplied });
    },
  });
}

// ─── Stop Sale Status ─────────────────────────────────────────────────────────
export function useStopSaleStatus() {
  return useQuery({
    queryKey: queryKeys.stopSaleStatus,
    queryFn: async () => {
      const res = await apiFetch("/api/sales/stop-sale/status/");
      if (!res.ok) throw new Error("Failed to fetch stop sale status");
      return res.json();
    },
    staleTime: 5_000,
    refetchInterval: 30_000,
  });
}

export function useCanCreateSale() {
  return useQuery({
    queryKey: queryKeys.canCreateSale,
    queryFn: async () => {
      const res = await apiFetch("/api/sales/stop-sale/can-create/");
      if (!res.ok) throw new Error("Failed to check create permission");
      return res.json();
    },
    staleTime: 5_000,
  });
}

// ─── Create Sale ──────────────────────────────────────────────────────────────
export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiFetch("/api/sales/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}

// ─── Create Unsupplied ────────────────────────────────────────────────────────
export function useCreateUnsupplied() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiFetch("/api/sales/unsupplied/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to create unsupplied record");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unsupplied });
    },
  });
}

// ─── Create Deposit ───────────────────────────────────────────────────────────
export function useCreateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiFetch("/api/sales/deposits/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to create deposit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits });
    },
  });
}