// Small helpers shared by every API route (server only).
import { NextResponse } from 'next/server';

/** Throw this anywhere in a route to answer with a clear error message. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/** Reads the JSON body; an empty body gives {}. */
export async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.');
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'The request body must be a JSON object.');
  }
  return data;
}

/** Reads and validates the [id] part of the URL. */
export async function readId(context) {
  const { id } = await context.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, 'A valid id is required.');
  return n;
}

// Extra protection on top of SameSite cookies: a request that changes data must
// come from this same website, never from another site.
function assertSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  let originHost = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* malformed Origin header */
  }
  if (originHost !== host) throw new HttpError(403, 'Cross-site request blocked.');
}

/** Wraps a route so errors become tidy JSON instead of crashing. */
export function route(handler) {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error('[community-budget]', error);
      const body = { error: 'Something went wrong on the server. Please try again.' };
      if (process.env.NODE_ENV !== 'production') body.detail = error.message;
      return json(body, 500);
    }
  };
}
