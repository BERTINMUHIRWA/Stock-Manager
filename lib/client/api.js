// All communication between the screens and the backend lives in this one file.
//
// The backend is the Next.js app itself (app/api/...), so every URL starts with /api and
// there is nothing to configure. Login is a secure cookie that the browser sends
// automatically, so this file never touches the login token.

// App.jsx registers a function here that returns to the login screen when the server says "401".
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api/${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, value);
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection and try again.', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* the server did not send JSON */
  }

  // A 401 on any normal request means the login expired. (auth/* calls handle their own 401.)
  if (response.status === 401 && !path.startsWith('auth/')) onUnauthorized();
  if (!response.ok) {
    throw new ApiError(data?.error || `The server answered with an error (${response.status}).`, response.status);
  }
  return data;
}

export const api = {
  // accounts
  register: (body) => request('auth/register', { method: 'POST', body }),
  login: (body) => request('auth/login', { method: 'POST', body }),
  logout: () => request('auth/logout', { method: 'POST' }),
  me: () => request('auth/me'),

  // budget list
  items: () => request('items'),
  addItem: (body) => request('items', { method: 'POST', body }),
  updateItem: (id, body) => request(`items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => request(`items/${id}`, { method: 'DELETE' }),

  // purchases
  purchases: (limit = 200) => request('purchases', { query: { limit } }),
  addPurchase: (body) => request('purchases', { method: 'POST', body }),
  voidPurchase: (id) => request(`purchases/${id}`, { method: 'DELETE' }),

  // members (admin)
  users: () => request('users'),
  setRole: (id, role) => request(`users/${id}`, { method: 'PATCH', body: { role } }),
};
