import { QueryClient } from "@tanstack/react-query";
import { apiClient } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export async function apiRequest<T>(method: string, path: string, data?: unknown): Promise<T> {
  const res = await apiClient.request<T>({ method, url: path, data });
  return res.data;
}
