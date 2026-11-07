// Small helpers shared by every /api function (works on Vercel and the local Express server).

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const bad = (msg, code = 'BAD_REQUEST') => new HttpError(400, msg, code);
export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'NOT_FOUND');

/** Parsed JSON body (Vercel and express.json both give an object; be lenient with strings). */
export function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      throw bad('Request body must be valid JSON');
    }
  }
  return req.body;
}

/**
 * Wrap per-method handlers: route({ GET: fn, POST: fn }).
 * Converts thrown HttpErrors (and database outages) into friendly JSON responses.
 */
export function route(handlers) {
  return async function handler(req, res) {
    const fn = handlers[req.method];
    if (!fn) {
      res.setHeader('Allow', Object.keys(handlers).join(', '));
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    res.setHeader('Cache-Control', 'no-store');
    try {
      await fn(req, res);
    } catch (e) {
      const err = e instanceof HttpError ? e : new HttpError(500, 'Something went wrong on our side. Please try again.', 'SERVER_ERROR');
      if (err.status >= 500) console.error(`[api] ${req.method} ${req.url}:`, e);
      if (!res.headersSent) res.status(err.status).json({ error: err.message, code: err.code });
    }
  };
}
