import { useState, useEffect, useCallback } from 'react';
import api from '../api';

export function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint, { signal });
      setData(res.data);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err.response?.data?.detail || 'Ошибка загрузки данных');
      }
    } finally {
      // React StrictMode mounts effects twice: the first request gets aborted,
      // so without this guard loading becomes false while data is still null,
      // causing a crash before the second request resolves.
      if (!signal.aborted) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
  }, [fetchData]);

  return { data, loading, error, refetch };
}
