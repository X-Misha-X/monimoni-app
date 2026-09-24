// Session storage survives both normal and hard reloads. Remembering a session
// additionally keeps it across browser restarts. Never persist passwords.
const KEY = "monimon-session-v2";
const PREFERENCE = "monimon-remember-session";
let refreshPromise;

export function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || "null");
    return value?.accessToken && value?.userId ? value : null;
  } catch { return null; }
}

export function rememberPreference() {
  return localStorage.getItem(PREFERENCE) === "true";
}

export function setRememberPreference(value) {
  localStorage.setItem(PREFERENCE, String(value));
}

export function storeSession(session) {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
  if (session) (rememberPreference() ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("monimon-session"));
}

export function tokenExpiry(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).exp || 0;
  } catch { return 0; }
}

export function createApiClient(baseUrl) {
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options, signal: options.signal || controller.signal,
        headers: { "Content-Type": "application/json", ...options.headers }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `No se pudo completar la solicitud (${response.status}).`);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("El servidor tardó demasiado. Reintentá en unos segundos.");
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function refresh(force = false) {
    const session = readSession();
    if (!session) return null;
    if (!force && tokenExpiry(session.accessToken) > Date.now() / 1000 + 90) return session;
    if (!session.refreshToken) return session;
    if (refreshPromise) return refreshPromise;
    const run = async () => {
      // Another tab may have rotated the refresh token while this one waited.
      const current = readSession();
      if (!current || current.accessToken !== session.accessToken) return current;
      try {
        const payload = await request("/api/auth/refresh", {
          method: "POST", body: JSON.stringify({ refresh_token: current.refreshToken })
        });
        if (!payload.access_token || !payload.refresh_token) throw new Error("Respuesta de sesión incompleta.");
        const latest = readSession();
        if (!latest || latest.accessToken !== current.accessToken) return latest;
        const next = { ...current, accessToken: payload.access_token, refreshToken: payload.refresh_token,
          expiresAt: payload.expires_at || tokenExpiry(payload.access_token) };
        storeSession(next);
        return next;
      } catch (error) {
        // A transient outage must never log the user out or discard their draft.
        if ([400, 401, 403].includes(error.status) && readSession()?.accessToken === current.accessToken) storeSession(null);
        throw error;
      }
    };
    refreshPromise = (navigator.locks ? navigator.locks.request("monimon-token-refresh", run) : run())
      .finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function api(path, options = {}) {
    if (!options.headers?.Authorization) return request(path, options);
    let session = await refresh();
    if (!session) throw Object.assign(new Error("Tu sesión venció. Ingresá nuevamente."), { status: 401 });
    const send = () => {
      let body = options.body;
      if (path.startsWith("/api/auth/") && typeof body === "string") {
        const payload = JSON.parse(body);
        if ("access_token" in payload) body = JSON.stringify({ ...payload, access_token: session.accessToken });
      }
      return request(path, { ...options, body, headers: { ...options.headers, Authorization: `Bearer ${session.accessToken}` } });
    };
    try { return await send(); } catch (error) {
      if (error.status !== 401) throw error;
      session = await refresh(true);
      if (!session) throw error;
      return send();
    }
  }
  api.refresh = refresh;
  api.raw = request;
  return api;
}
