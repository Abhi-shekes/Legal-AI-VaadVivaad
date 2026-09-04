import { useEffect, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"

import { api } from "../lib/api"

/**
 * Look up a section without leaving the page.
 *
 * `GET /user/statute/{section}` resolves a section across the IPC and the BNS,
 * with an optional incident date to pick the right code. It had no caller.
 *
 * Hand-rolled rather than pulled from a popover library: it needs a trigger, an
 * outside click, Escape, and a focus return, which is a couple of dozen lines
 * against a dependency the app does not otherwise carry.
 */

const cache = new Map()

export default function StatutePopover({ section, code = "IPC", incidentDate = "", children }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(() => cache.get(`${code}:${section}`) || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || data || loading) return
    const key = `${code}:${section}`
    setLoading(true)
    api.statute(section, code, incidentDate)
      .then((res) => {
        if (res?.status === "success") {
          cache.set(key, res.data)
          setData(res.data)
        } else {
          setError("That section could not be found.")
        }
      })
      .catch((err) => setError(err?.message || "That section could not be looked up."))
      .finally(() => setLoading(false))
  }, [open, data, loading, section, code, incidentDate])

  return (
    <span className="relative inline-block" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-content/5 text-content/70
                   hover:bg-accent-solid/15 hover:text-accent transition-colors duration-ui"
      >
        {children || `s.${section}`}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Section ${section}`}
          className="absolute z-40 left-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-lg
                     border border-line/15 bg-surface-raised elev-3 p-4 text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-display text-[15px] leading-tight">
              {code} s.{section}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="p-0.5 rounded text-content/40 hover:text-content transition-colors duration-ui"
            >
              <X size={13} />
            </button>
          </div>

          {loading && (
            <p className="flex items-center gap-2 text-[12.5px] text-content/50 py-3">
              <Loader2 size={13} className="animate-spin text-accent" />
              Looking it up…
            </p>
          )}

          {error && <p className="text-[12.5px] text-dissent py-2">{error}</p>}

          {data && !loading && (
            <div className="space-y-3">
              {data.definition && (
                <p className="text-[12.5px] leading-relaxed text-content/70">{data.definition}</p>
              )}

              {(data.elements || []).length > 0 && (
                <div>
                  <p className="docket-label text-[9.5px] text-accent mb-1.5">Elements</p>
                  <ul className="space-y-1">
                    {data.elements.map((el, i) => (
                      <li key={i} className="text-[12px] leading-snug">
                        <span className="font-medium">{el.element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-line/10">
                {data.punishment && (
                  <div className="col-span-2">
                    <dt className="docket-label text-[9.5px] text-content/40">Punishment</dt>
                    <dd className="text-[12px] mt-0.5">{data.punishment}</dd>
                  </div>
                )}
                {data.cognizable !== null && data.cognizable !== undefined && (
                  <div>
                    <dt className="docket-label text-[9.5px] text-content/40">Cognizable</dt>
                    <dd className="text-[12px] mt-0.5">{data.cognizable ? "Yes" : "No"}</dd>
                  </div>
                )}
                {data.bailable !== null && data.bailable !== undefined && (
                  <div>
                    <dt className="docket-label text-[9.5px] text-content/40">Bailable</dt>
                    <dd className="text-[12px] mt-0.5">{data.bailable ? "Yes" : "No"}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </span>
  )
}
