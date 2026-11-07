import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiClientError } from "../api/client";

export function useApiList<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await apiClient<T>(endpoint));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong, please try again.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function errorMessage(err: unknown, fallback = "Something went wrong, please try again."): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export const formatDate = (iso: string) => new Date(iso).toLocaleString();