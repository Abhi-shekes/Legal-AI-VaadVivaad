import { useEffect, useRef, useState } from "react"
import { AlertTriangle, BookOpen, Gavel, Loader2, Scale, Send, ShieldCheck } from "lucide-react"
import { toast } from "react-toastify"

import { api } from "../../lib/api"

/**
 * Questions put after the order.
 *
 * One panel serves all three participants because the exchange is the same
 * shape whoever answers it -- what differs is the persona and what the answer
 * carries. The bench returns whether the answer would actually disturb the
 * order, which is the field a user is really asking about; counsel return the
 * authorities they relied on, checked against the same shortlist their turns
 * were checked against.
 *
 * Read-only consumers pass `readOnly` to show the thread without the composer.
 */

const ROLES = [
  { id: "bench", label: "The bench", Icon: Scale, hint: "About the order that was made" },
  { id: "prosecution", label: "Prosecution", Icon: ShieldCheck, hint: "Their case, in their words" },
  { id: "defence", label: "Defence", Icon: Gavel, hint: "Their case, in their words" },
]

const TONE = {
  bench: { text: "text-accent", chip: "bg-accent-solid/15 text-accent", edge: "border-l-accent-solid" },
  prosecution: { text: "text-verdict", chip: "bg-verdict/15 text-verdict", edge: "border-l-verdict" },
  defence: { text: "text-dissent", chip: "bg-dissent/15 text-dissent", edge: "border-l-dissent" },
}

const PROMPTS = {
  bench: [
    "What would have changed your mind?",
    "Which finding was the closest call?",
    "If the main exhibit were ruled inadmissible, what then?",
  ],
  prosecution: [
    "What was the weakest part of your case?",
    "Why does the defence's best point not answer you?",
  ],
  defence: [
    "What would you have needed to win outright?",
    "Where is the prosecution's case thinnest?",
  ],
}

function Answer({ item, precedents }) {
  const tone = TONE[item.role] || TONE.bench
  const role = ROLES.find((r) => r.id === item.role)
  const cited = (item.relies_on || [])
    .map((id) => precedents.find((p) => p.citation_id === id))
    .filter(Boolean)

  return (
    <li className="space-y-2">
      {/* The question, as the user put it */}
      <p className="text-[13px] leading-relaxed text-content/60 pl-3 border-l-2 border-line/15">
        {item.question}
      </p>

      <div className={`rounded-lg border border-line/10 border-l-2 ${tone.edge} bg-surface p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${tone.chip}`}>
            {role?.Icon ? <role.Icon size={11} /> : <Scale size={11} />}
          </span>
          <span className={`text-[12.5px] font-medium ${tone.text}`}>
            {role?.label || item.role}
          </span>

          {item.role === "bench" && (
            <span
              className={`ml-auto docket-label text-[9px] px-2 py-0.5 rounded-full ${
                item.changes_outcome
                  ? "bg-dissent/15 text-dissent"
                  : "bg-content/10 text-content/55"
              }`}
            >
              {item.changes_outcome ? "Would disturb the order" : "Order stands"}
            </span>
          )}
        </div>

        <p className="text-[13.5px] leading-relaxed text-content/80 measure whitespace-pre-wrap">
          {item.answer}
        </p>

        {(item.basis || []).length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-line/10">
            <p className="docket-label text-[9px] text-content/40 mb-1.5">Rests on</p>
            <ul className="space-y-1">
              {item.basis.map((b, i) => (
                <li key={i} className="text-[11.5px] leading-snug text-content/60 flex gap-1.5">
                  <span className="text-content/30 shrink-0">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {cited.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-line/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen size={10} className="text-accent" />
              <span className="docket-label text-[9px] text-accent">Relies on</span>
            </div>
            <ul className="space-y-1">
              {cited.map((c) => (
                <li key={c.citation_id} className="text-[11.5px] leading-snug">
                  <span className="font-medium">{c.case_name}</span>
                  {c.court && <span className="text-content/45"> · {c.court}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {typeof item.confidence === "number" && item.confidence > 0 && (
          <p className="font-mono text-[10px] text-content/35 mt-2.5 tabular-nums">
            confidence {item.confidence.toFixed(2)}
          </p>
        )}
      </div>
    </li>
  )
}

export default function ConsultPanel({ caseId, precedents = [], readOnly = false }) {
  const [role, setRole] = useState("bench")
  const [question, setQuestion] = useState("")
  const [thread, setThread] = useState([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef(null)

  // The thread is stored on the case, so a reload does not lose it.
  useEffect(() => {
    let cancelled = false
    api.consultations(caseId)
      .then((res) => {
        if (!cancelled && res?.status === "success") setThread(res.data || [])
      })
      .catch(() => {
        /* an empty thread is the correct fallback here */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseId])

  const ask = async (e, preset) => {
    e?.preventDefault()
    const text = (preset || question).trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const res = await api.consult(caseId, role, text)
      if (res?.status === "success") {
        setThread((t) => [...t, res.data])
        setQuestion("")
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }))
      }
    } catch (err) {
      toast.error(err?.message || "That question could not be answered.")
    } finally {
      setBusy(false)
    }
  }

  const active = ROLES.find((r) => r.id === role)
  const unused = PROMPTS[role].filter(
    (p) => !thread.some((t) => t.question === p && t.role === role)
  )

  return (
    <section className="rounded-lg border border-line/10 bg-surface-raised elev-2 overflow-hidden">
      <header className="px-5 py-4 border-b border-line/10">
        <h3 className="font-display text-lg leading-tight">Put a question</h3>
        <p className="text-[12.5px] text-content/55 mt-1">
          The order has been made. You can ask the bench about it, or either counsel about their side.
        </p>
      </header>

      {!readOnly && (
        <div className="px-5 pt-4">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Who to ask">
            {ROLES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={role === id}
                onClick={() => setRole(id)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium
                            transition-colors duration-ui ${
                              role === id
                                ? `${TONE[id].chip}`
                                : "text-content/55 hover:text-content hover:bg-content/5"
                            }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-content/40 mt-2">{active?.hint}</p>
        </div>
      )}

      <div className="p-5">
        {loading ? (
          <p className="text-[12.5px] text-content/45 py-4">Loading the exchange…</p>
        ) : thread.length === 0 ? (
          <p className="text-[12.5px] text-content/50 py-2">
            {readOnly
              ? "No questions were put in this matter."
              : "Nothing asked yet. Pick a question below, or write your own."}
          </p>
        ) : (
          <ul className="space-y-5 mb-5">
            {thread.map((item, i) => (
              <Answer key={i} item={item} precedents={precedents} />
            ))}
          </ul>
        )}

        <div ref={endRef} />

        {!readOnly && (
          <>
            {unused.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {unused.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    onClick={(e) => ask(e, p)}
                    className="text-[12px] px-2.5 py-1.5 rounded-full border border-line/15
                               text-content/60 hover:text-accent hover:border-accent-solid/40
                               disabled:opacity-40 transition-colors duration-ui"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={ask} className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ask ${active?.label.toLowerCase()}…`}
                aria-label={`Ask ${active?.label}`}
                disabled={busy}
                className="flex-1 rounded-lg px-3.5 py-2.5 text-[13px] bg-surface border border-line/10
                           placeholder:text-content/30 focus:outline-none focus:border-accent-solid
                           disabled:opacity-60 transition-colors duration-ui"
              />
              <button
                type="submit"
                disabled={busy || !question.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold
                           bg-accent-solid text-accent-on hover:brightness-105 disabled:opacity-40
                           transition-all duration-ui"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Ask
              </button>
            </form>

            <p className="text-[11px] leading-relaxed text-content/40 mt-3 flex gap-2">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              <span>
                Answers are generated from the record of this hearing, for study and research.
                Not legal advice, and not reviewed by an advocate.
              </span>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
