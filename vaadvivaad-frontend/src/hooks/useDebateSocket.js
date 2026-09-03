/**
 * Live hearing socket.
 *
 * Replaces the ad-hoc socket wiring that lived inside `Case.jsx`, which
 * connected with no credentials, joined a room by a client-generated ten-digit
 * number, and listened for a `case_details` event the server never emitted —
 * so the case-analysis panel it gated on could never render.
 *
 * Here the connection carries the auth token, the room is the server-issued
 * case id, and reducer-managed state keeps streamed deltas separate from
 * committed turns so a mid-turn tier fallback can discard partial text
 * cleanly.
 */

import { useCallback, useEffect, useReducer, useRef } from "react"
import { io } from "socket.io-client"

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:8000"

const initialState = {
  connected: false,
  stage: "idle",
  statusMessage: "",
  caseDetails: null,
  structure: null,
  turns: [],
  streaming: null, // { index, side, phase, round, text }
  ruling: null,
  gaps: null,
  strength: null,
  error: null,
  concluded: false,
  tokens: null,
  objections: [],
}

function reducer(state, action) {
  switch (action.type) {
    case "reset":
      return { ...initialState, connected: state.connected }
    case "connected":
      return { ...state, connected: action.value }
    case "status":
      return { ...state, stage: action.stage || state.stage, statusMessage: action.message }
    case "structure":
      return { ...state, structure: action.payload, stage: "researching" }
    case "details":
      return { ...state, caseDetails: action.payload, stage: "arguing" }
    case "turn_start":
      return {
        ...state,
        stage: "arguing",
        streaming: {
          index: action.payload.index,
          side: action.payload.side,
          phase: action.payload.phase,
          round: action.payload.round,
          text: "",
        },
      }
    case "delta":
      if (!state.streaming || state.streaming.index !== action.payload.index) return state
      return {
        ...state,
        streaming: { ...state.streaming, text: state.streaming.text + action.payload.text },
      }
    case "restart":
      // The server dropped to a cheaper model mid-turn; the partial text is
      // stale, so clear it rather than letting two drafts run together.
      if (!state.streaming) return state
      return { ...state, streaming: { ...state.streaming, text: "" } }
    case "turn_complete": {
      const without = state.turns.filter((t) => t.index !== action.payload.index)
      return {
        ...state,
        streaming: null,
        turns: [...without, action.payload].sort((a, b) => a.index - b.index),
      }
    }
    case "turn_failed":
      return { ...state, streaming: null, error: action.payload.message }
    case "objection":
      return { ...state, objections: [...state.objections, action.payload.text] }
    case "ruling":
      return { ...state, ruling: action.payload, stage: "analysing" }
    case "gaps":
      return { ...state, gaps: action.payload }
    case "strength":
      return { ...state, strength: action.payload }
    case "concluded":
      return {
        ...state,
        stage: "done",
        concluded: true,
        streaming: null,
        tokens: action.payload.tokens,
        statusMessage: action.payload.truncated ? action.payload.message : "",
      }
    case "failed":
      return { ...state, stage: "failed", error: action.payload.message, streaming: null }
    case "hydrate":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export function useDebateSocket() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const socketRef = useRef(null)
  const caseIdRef = useRef(null)

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      // The cookie is httpOnly so the browser sends it on the handshake; the
      // server also accepts an explicit auth payload for non-browser clients.
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 800,
    })
    socketRef.current = socket

    socket.on("connect", () => {
      dispatch({ type: "connected", value: true })
      // Rejoin after a reconnect so a dropped connection resumes the hearing
      // instead of stranding the user on a silent page.
      if (caseIdRef.current) socket.emit("join_case", { debate_id: caseIdRef.current })
    })
    socket.on("disconnect", () => dispatch({ type: "connected", value: false }))
    socket.on("connect_error", (err) =>
      dispatch({
        type: "failed",
        payload: {
          message:
            err?.message === "authentication required" || /invalid|expired/i.test(err?.message || "")
              ? "Your session has expired. Please sign in again."
              : "Could not connect to the hearing.",
        },
      })
    )

    socket.on("status", (d) => dispatch({ type: "status", stage: d.stage, message: d.message }))
    socket.on("case_structured", (d) => dispatch({ type: "structure", payload: d }))
    socket.on("case_details", (d) => dispatch({ type: "details", payload: d }))
    socket.on("turn_start", (d) => dispatch({ type: "turn_start", payload: d }))
    socket.on("turn_delta", (d) => dispatch({ type: "delta", payload: d }))
    socket.on("turn_restart", () => dispatch({ type: "restart" }))
    socket.on("turn_complete", (d) => dispatch({ type: "turn_complete", payload: d }))
    socket.on("turn_failed", (d) => dispatch({ type: "turn_failed", payload: d }))
    socket.on("objection_accepted", (d) => dispatch({ type: "objection", payload: d }))
    socket.on("ruling", (d) => dispatch({ type: "ruling", payload: d }))
    socket.on("evidence_gaps", (d) => dispatch({ type: "gaps", payload: d }))
    socket.on("strength", (d) => dispatch({ type: "strength", payload: d }))
    socket.on("concluded", (d) => dispatch({ type: "concluded", payload: d }))
    socket.on("failed", (d) => dispatch({ type: "failed", payload: d }))

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  const start = useCallback((caseId) => {
    const socket = socketRef.current
    if (!socket) return
    caseIdRef.current = caseId
    dispatch({ type: "reset" })
    dispatch({ type: "status", stage: "connecting", message: "Opening the hearing…" })

    const begin = () => {
      socket.emit("join_case", { debate_id: caseId }, (joined) => {
        if (joined?.status !== "ok") {
          dispatch({ type: "failed", payload: { message: joined?.message || "Could not open the case." } })
          return
        }
        socket.emit("start_debate", { debate_id: caseId })
      })
    }

    if (socket.connected) begin()
    else {
      socket.once("connect", begin)
      socket.connect()
    }
  }, [])

  const object = useCallback((text) => {
    const socket = socketRef.current
    if (!socket || !caseIdRef.current) return
    socket.emit("object", { debate_id: caseIdRef.current, text })
  }, [])

  const hydrate = useCallback((payload) => dispatch({ type: "hydrate", payload }), [])

  return { ...state, start, object, hydrate }
}
