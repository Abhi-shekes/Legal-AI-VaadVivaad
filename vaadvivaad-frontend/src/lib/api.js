/**
 * API client.
 *
 * Two problems this fixes:
 *
 * 1. The access token lasted 30 minutes with no refresh, so a debate that ran
 *    past it failed to save with a silent 401 — while the UI still showed the
 *    user as signed in because `isLoggedIn` lived in localStorage and was
 *    never revalidated.
 * 2. Every call open-coded its own axios invocation and error handling, so
 *    failures surfaced inconsistently (or not at all).
 *
 * A 401 now triggers a single refresh attempt and one replay of the original
 * request. Concurrent 401s share that one refresh rather than stampeding.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export class ApiError extends Error {
  constructor(message, { status, code, retryable = false, fields = [] } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.retryable = retryable
    this.fields = fields
  }
}

let refreshInFlight = null
const listeners = new Set()

/** Notified when the session is definitively gone, so the app can sign out. */
export function onSessionExpired(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function announceExpiry() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* a bad listener must not break the others */
    }
  })
}

async function refreshSession() {
  // Collapse concurrent refreshes: several requests failing at once should
  // rotate the refresh token once, not once each (which would invalidate it
  // for the others, logging the user out mid-session).
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        // Release on the next tick so callers awaiting this promise all see
        // the same result before a new attempt can start.
        setTimeout(() => {
          refreshInFlight = null
        }, 0)
      })
  }
  return refreshInFlight
}

async function parse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function request(path, { method = "GET", body, retry = true, raw = false } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", {
      code: "network_error",
      retryable: true,
    })
  }

  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      return request(path, { method, body, retry: false, raw })
    }
    announceExpiry()
    throw new ApiError("Your session has expired. Please sign in again.", {
      status: 401,
      code: "session_expired",
    })
  }

  if (raw) {
    if (!res.ok) throw new ApiError("Download failed.", { status: res.status })
    return res
  }

  const data = await parse(res)
  if (!res.ok) {
    throw new ApiError(data?.message || "Something went wrong.", {
      status: res.status,
      code: data?.code,
      retryable: data?.retryable ?? res.status >= 500,
      fields: data?.fields || [],
    })
  }
  return data
}

export const api = {
  signup: (name, email, password) =>
    request("/auth/signup", { method: "POST", body: { name, email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  /** Source of truth for "am I signed in", replacing trust in localStorage. */
  me: () => request("/auth/me"),

  createCase: (incident_description, evidence) =>
    request("/user/cases", { method: "POST", body: { incident_description, evidence } }),
  listCases: () => request("/user/cases"),
  getCase: (id) => request(`/user/cases/${id}`),
  deleteCase: (id) => request(`/user/cases/${id}`, { method: "DELETE" }),
  objection: (id, text) =>
    request(`/user/cases/${id}/objection`, { method: "POST", body: { text } }),
  submitArgument: (id, side, text, answering = "") =>
    request(`/user/cases/${id}/argue`, { method: "POST", body: { side, text, answering } }),
  statute: (section, code = "IPC", incidentDate = "") =>
    request(
      `/user/statute/${encodeURIComponent(section)}?code=${code}` +
        (incidentDate ? `&incident_date=${incidentDate}` : "")
    ),
  briefUrl: (id, fmt = "pdf") => `${BASE}/user/cases/${id}/brief?fmt=${fmt}`,
  downloadBrief: (id, fmt = "pdf") => request(`/user/cases/${id}/brief?fmt=${fmt}`, { raw: true }),
}

export { BASE as API_BASE }
