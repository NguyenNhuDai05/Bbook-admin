"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiMessage, createSubmissionLock } from "./contracts.mjs";
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/backend/${path}`, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Không thể kết nối máy chủ. Vui lòng thử lại.");
  }
  if (response.status === 401) {
    /* eslint-disable @next/next/no-location-assign-relative-destination -- Clear protected server tree on expired JWT. */ window.location.assign(
      "/login",
    );
    /* eslint-enable @next/next/no-location-assign-relative-destination */ throw new Error(
      apiMessage(401, null),
    );
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiMessage(response.status, result));
  if (result === null) throw new Error("Dữ liệu Backend không đúng định dạng.");
  return result as T;
}
export interface ResourceQuery<T> {
  key: string;
  load: (signal: AbortSignal) => Promise<T>;
  enabled?: boolean;
}
const invalidated = new EventTarget();
export function invalidateResources(prefixes: string[]) {
  invalidated.dispatchEvent(new CustomEvent("changed", { detail: prefixes }));
}
export function useResource<T>(query: ResourceQuery<T>) {
  const [state, setState] = useState<{
    key: string;
    data?: T;
    loading: boolean;
    error: string;
  }>({ key: query.key, loading: true, error: "" });
  const [version, setVersion] = useState(0);
  const latest = useRef(query);
  latest.current = query;
  const enabled = query.enabled !== false;
  useEffect(() => {
    const listener = (event: Event) => {
      if (
        (event as CustomEvent<string[]>).detail.some((prefix) =>
          query.key.startsWith(prefix),
        )
      )
        setVersion((value) => value + 1);
    };
    invalidated.addEventListener("changed", listener);
    return () => invalidated.removeEventListener("changed", listener);
  }, [query.key]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ key: query.key, loading: true, error: "" });
    latest.current
      .load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key: query.key, data, loading: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key: query.key,
            loading: false,
            error:
              error instanceof Error ? error.message : "Không thể tải dữ liệu.",
          });
      });
    return () => controller.abort();
  }, [query.key, enabled, version]);
  const current =
    state.key === query.key
      ? state
      : { data: undefined, loading: enabled, error: "" };
  return {
    ...current,
    loading: enabled && current.loading,
    reload: useCallback(() => setVersion((value) => value + 1), []),
  };
}
export function useSubmission() {
  const lock = useRef(createSubmissionLock());
  const [busy, setBusy] = useState(false);
  return {
    busy,
    begin: () => {
      if (!lock.current.acquire()) return false;
      setBusy(true);
      return true;
    },
    end: () => {
      lock.current.release();
      setBusy(false);
    },
  };
}
