import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collections, emptyState, equal, mergeStates } from "./shared-state.js";

export function useSharedState(userId, request, normalize) {
  const [data, render] = useState(emptyState);
  const [status, setStatus] = useState({ loading: true, failed: false, error: "", conflict: false });
  const draft = useRef(emptyState);
  const baseline = useRef(null);
  const revision = useRef(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const blocked = useRef(false);
  const flushRef = useRef(null);

  const update = useCallback(next => { draft.current = next; render(next); }, []);
  const setters = useMemo(() => Object.fromEntries(collections.map(key => [key, value => {
    update({ ...draft.current, [key]: typeof value === "function" ? value(draft.current[key]) : value });
  }])), [update]);

  const sync = useCallback(async () => {
    if (!userId || busy.current || blocked.current) return;
    busy.current = true;
    const version = generation.current;
    try {
      if (!baseline.current) {
        const response = await request("/api/state");
        if (version !== generation.current) return;
        baseline.current = normalize(response);
        revision.current = response._revision ?? null;
        update(baseline.current);
      } else if (!equal(draft.current, baseline.current)) {
        const sent = draft.current;
        try {
          const response = await request("/api/state", { method: "PUT", body: JSON.stringify({ protocol: 2, revision: revision.current, state: sent }) });
          if (version !== generation.current) return;
          const remote = normalize(response);
          const next = mergeStates(sent, draft.current, remote);
          baseline.current = remote;
          revision.current = response._revision;
          update(next);
        } catch (error) {
          if (version !== generation.current) return;
          if (error.status !== 409 || !error.payload?.state) throw error;
          const remote = normalize(error.payload.state);
          const next = mergeStates(baseline.current, draft.current, remote);
          baseline.current = remote;
          revision.current = error.payload.state._revision ?? null;
          update(next);
        }
      } else {
        const response = await request("/api/state");
        if (version !== generation.current) return;
        const remote = normalize(response);
        const next = mergeStates(baseline.current, draft.current, remote);
        baseline.current = remote;
        revision.current = response._revision ?? null;
        if (!equal(next, draft.current)) update(next);
      }
      setStatus({ loading: false, failed: false, error: "", conflict: false });
    } catch (error) {
      if (version !== generation.current) return;
      const conflict = error.message.startsWith("Otra persona");
      blocked.current = conflict;
      setStatus({ loading: false, failed: !baseline.current, error: error.message, conflict });
    } finally { if (version === generation.current) busy.current = false; }
  }, [userId, request, normalize, update]);
  flushRef.current = sync;

  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    blocked.current = false;
    baseline.current = null;
    revision.current = null;
    update(emptyState);
    setStatus({ loading: Boolean(userId), failed: false, error: "", conflict: false });
    if (!userId) return;
    void sync();
    const interval = setInterval(() => { if (document.visibilityState !== "hidden") void sync(); }, 3000);
    const resume = () => void sync();
    const beforeUnload = event => {
      if (baseline.current && !equal(draft.current, baseline.current)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      generation.current += 1;
      clearInterval(interval);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [userId, sync, update]);

  useEffect(() => {
    if (!baseline.current || equal(data, baseline.current)) return;
    const timer = setTimeout(() => void flushRef.current(), 350);
    return () => clearTimeout(timer);
  }, [data]);

  async function reload() {
    blocked.current = false;
    baseline.current = null;
    await sync();
  }
  async function action(path, payload) {
    const version = generation.current;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      while (busy.current && version === generation.current) await new Promise(resolve => setTimeout(resolve, 50));
      if (version !== generation.current) throw new Error("La sesión cambió.");
      if (blocked.current) throw new Error("Resolvé el conflicto de guardado antes de continuar.");
      if (baseline.current && equal(draft.current, baseline.current)) break;
      await sync();
    }
    if (!baseline.current || !equal(draft.current, baseline.current)) throw new Error("Esperá a que se guarden los cambios antes de continuar.");
    busy.current = true;
    const before = draft.current;
    try {
      const response = await request(path, { method: "POST", body: JSON.stringify({ ...payload, revision: revision.current }) });
      if (version !== generation.current) return;
      const remote = normalize(response);
      const next = mergeStates(before, draft.current, remote);
      baseline.current = remote;
      revision.current = response._revision;
      update(next);
    } catch (error) {
      if (version !== generation.current) throw error;
      if (error.status === 409 && error.payload?.state) {
        const remote = normalize(error.payload.state);
        const next = mergeStates(before, draft.current, remote);
        baseline.current = remote;
        revision.current = error.payload.state._revision ?? null;
        update(next);
      }
      throw error;
    } finally { if (version === generation.current) busy.current = false; }
  }
  return { data, setters, update, status, sync, reload, action, dirty: Boolean(baseline.current && !equal(data, baseline.current)) };
}
