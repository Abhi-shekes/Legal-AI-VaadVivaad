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

/**
 * Upload a case document.
 *
 * The endpoint takes the file as the raw request body rather than multipart
 * form data -- there is one file and no other fields -- with the filename
 * riding on a header. That does not fit `request()`, which assumes a JSON
 * body, so it gets its own path with the same 401-refresh behaviour.
 */
async function uploadDocument(file, { retry = true } = {}) {
  let res
  try {
    res = await fetch(`${BASE}/user/cases/upload`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        // Header values must be latin-1; a filename in any other script
        // would otherwise throw before the request is sent.
        "X-Filename": encodeURIComponent(file.name || "upload"),
      },
      body: file,
    })
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", {
      code: "network_error",
      retryable: true,
    })
  }

  if (res.status === 401 && retry) {
    if (await refreshSession()) return uploadDocument(file, { retry: false })
    announceExpiry()
    throw new ApiError("Your session has expired. Please sign in again.", {
      status: 401,
      code: "session_expired",
    })
  }

  const data = await parse(res)
  if (!res.ok) {
    throw new ApiError(data?.message || "That document could not be read.", {
      status: res.status,
      code: data?.code,
      retryable: data?.retryable ?? res.status >= 500,
    })
  }
  return data
}

/** Add a document to an existing case file.
 *
 *  Same raw-body shape as `uploadDocument`, against a different endpoint, and
 *  it carries the document kind so the panel can label an FIR as an FIR.
 *  Kept separate rather than generalised: the two differ in URL, in what a
 *  401 should retry, and in what a failure means to the user.
 */
async function uploadToCase(caseId, file, kind = "document", { retry = true } = {}) {
  let res
  try {
    res = await fetch(`${BASE}/user/cases/${caseId}/documents`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name || "document"),
        "X-Document-Kind": kind,
      },
      body: file,
    })
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", {
      code: "network_error",
      retryable: true,
    })
  }

  if (res.status === 401 && retry) {
    if (await refreshSession()) return uploadToCase(caseId, file, kind, { retry: false })
    announceExpiry()
    throw new ApiError("Your session has expired. Please sign in again.", {
      status: 401,
      code: "session_expired",
    })
  }

  const data = await parse(res)
  if (!res.ok) {
    throw new ApiError(data?.message || "That document could not be added.", {
      status: res.status,
      code: data?.code,
      retryable: data?.retryable ?? res.status >= 500,
    })
  }
  return data
}

/** Send a recording for transcription. Raw body, like the document uploads. */
async function postAudio(blob, language = "", { retry = true } = {}) {
  const query = language ? `?language=${encodeURIComponent(language)}` : ""
  let res
  try {
    res = await fetch(`${BASE}/user/transcribe${query}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": blob.type || "audio/webm" },
      body: blob,
    })
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", {
      code: "network_error",
      retryable: true,
    })
  }

  if (res.status === 401 && retry) {
    if (await refreshSession()) return postAudio(blob, language, { retry: false })
    announceExpiry()
    throw new ApiError("Your session has expired. Please sign in again.", {
      status: 401,
      code: "session_expired",
    })
  }

  const data = await parse(res)
  if (!res.ok) {
    throw new ApiError(data?.message || "That recording could not be transcribed.", {
      status: res.status,
      code: data?.code,
    })
  }
  return data
}

/** What `POST /user/cases/upload` will accept, mirrored from the server so the
 *  file picker and the client-side check agree with it. */
export const UPLOAD = {
  accept: "application/pdf,image/jpeg,image/png,image/webp,text/plain",
  types: ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"],
  maxBytes: 12 * 1024 * 1024,
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
  /** Open a case from an FIR, chargesheet, notice or bail order. */
  uploadCase: uploadDocument,
  listCases: () => request("/user/cases"),
  // Free-text search across the record. An empty q is valid and returns the
  // most recent matters, so the palette is useful before anything is typed.
  search: (q = "", { section = "", outcome = "", limit = 20 } = {}) =>
    request(
      `/user/search?q=${encodeURIComponent(q)}` +
        `&section=${encodeURIComponent(section)}` +
        `&outcome=${encodeURIComponent(outcome)}&limit=${limit}`
    ),
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
  /** Recall counsel for further submissions on a concluded matter. */
  continueHearing: (id) => request(`/user/cases/${id}/continue`, { method: "POST" }),
  /** Put a question to the bench, or to either counsel, after the order. */
  consult: (id, role, question) =>
    request(`/user/cases/${id}/consult`, { method: "POST", body: { role, question } }),
  consultations: (id) => request(`/user/cases/${id}/consult`),
  languages: () => request("/user/languages"),
  translateCase: (id, target) =>
    request(`/user/cases/${id}/translate?target=${encodeURIComponent(target)}`, { method: "POST" }),
  // Material the corpus does not hold, from the official publishers. Never
  // citable -- every item comes back with citable:false and the panel says so.
  outsideTheRecord: (id) => request(`/user/cases/${id}/outside`),
  // The case file: documents filed in this matter, indexed for the hearing.
  caseDocuments: (id) => request(`/user/cases/${id}/documents`),
  addCaseDocument: (id, file, kind = "document") =>
    uploadToCase(id, file, kind),
  searchCaseDocuments: (id, q) =>
    request(`/user/cases/${id}/documents/search?q=${encodeURIComponent(q)}`),
  // Sequence of events across the file, plus anything that does not add up.
  caseTimeline: (id) => request(`/user/cases/${id}/timeline`),
  // Voice. Dictation and playback are reported independently; either may be
  // switched off, and the UI hides what is not there rather than failing.
  voiceCapabilities: () => request("/user/voice"),
  transcribe: (blob, language = "") => postAudio(blob, language),
  turnAudioUrl: (id, index) => `${BASE}/user/cases/${id}/turns/${index}/audio`,
  briefUrl: (id, fmt = "pdf") => `${BASE}/user/cases/${id}/brief?fmt=${fmt}`,
  downloadBrief: (id, fmt = "pdf") => request(`/user/cases/${id}/brief?fmt=${fmt}`, { raw: true }),
}

export { BASE as API_BASE }
