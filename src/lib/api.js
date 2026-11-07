// Tiny fetch wrapper for the /api functions. The session lives in an httpOnly cookie; no secrets in the browser.
export class ApiError extends Error {
  constructor(message, status, code, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let handlers = { onUnavailable: () => {}, onUnauthenticated: () => {} };
export const setApiHandlers = (h) => (handlers = { ...handlers, ...h });

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    handlers.onUnavailable(true);
    throw new ApiError("Can't reach the PetroSync server. Is `npm run dev` still running?", 0, 'NETWORK');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // When the local API server is down, the Vite proxy answers 5xx without our JSON shape
    const unavailable = data.code === 'DB_UNAVAILABLE' || (res.status >= 500 && !data.code);
    if (unavailable) handlers.onUnavailable(true);
    if (res.status === 401 && !path.startsWith('/auth/')) handlers.onUnauthenticated();
    throw new ApiError(
      data.error || (unavailable ? "Can't reach the PetroSync server or database right now." : `Request failed (${res.status})`),
      res.status,
      data.code || (unavailable ? 'DB_UNAVAILABLE' : undefined),
      data.fields,
    );
  }
  handlers.onUnavailable(false);
  return data;
}
