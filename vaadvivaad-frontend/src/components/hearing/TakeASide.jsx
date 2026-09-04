import { useState } from "react"
import { Gavel, Loader2, Scale, ShieldCheck, X } from "lucide-react"
import { toast } from "react-toastify"

import { api } from "../../lib/api"

/**
 * Take a side.
 *
 * `POST /user/cases/{id}/argue` scores an argument the user writes against the
 * statute, the retrieved precedent and the record, and returns a breakdown plus
 * how counsel might have put it. The endpoint has been live the whole time with
 * no interface at all -- this is what turns a hearing you watch into one you
 * can practise against.
 */

const CRITERIA = [
  ["legal_accuracy", "Legal accuracy"],
  ["use_of_precedent", "Use of precedent"],
  ["responsiveness", "Responsiveness"],
  ["procedural_form", "Procedural form"],
]

function ScoreBar({ label, value }) {
  const pct = Math.round((value ?? 0) * 100)
  const tone = pct >= 70 ? "bg-verdict" : pct >= 45 ? "bg-accent-solid" : "bg-dissent"
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] text-content/65">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-content/50">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-content/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function TakeASide({ caseId, answering, onClose }) {
  const [side, setSide] = useState("prosecution")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [score, setScore] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const res = await api.submitArgument(caseId, side, text.trim(), answering || "")
      if (res?.status === "success") setScore(res.data)
      else toast.error("The bench could not score that submission.")
    } catch (err) {
      toast.error(err?.message || "The bench could not score that submission.")
    } finally {
      setBusy(false)
    }
  }

  const overall = Math.round((score?.overall ?? 0) * 100)

  return (
    <section className="rounded-lg border border-line/15 bg-surface-raised elev-2 overflow-hidden">
      <header className="px-5 py-3.5 border-b border-line/10 flex items-center gap-2.5">
        <Scale size={15} className="text-accent" />
        <h3 className="font-display text-base">Take a side</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto p-1 rounded text-content/40 hover:text-content transition-colors duration-ui"
        >
          <X size={15} />
        </button>
      </header>

      {!score ? (
        <form onSubmit={submit} className="p-5 space-y-4">
          {answering && (
            <div className="rounded-lg bg-content/5 p-3">
              <p className="docket-label text-[9.5px] text-content/40 mb-1">Answering</p>
              <p className="text-[12.5px] leading-relaxed text-content/65 line-clamp-3">{answering}</p>
            </div>
          )}

          <div>
            <p className="text-[12.5px] font-medium mb-2">Which side are you arguing?</p>
            <div className="flex gap-2">
              {[
                { id: "prosecution", label: "Prosecution", Icon: ShieldCheck, tone: "verdict" },
                { id: "defence", label: "Defence", Icon: Gavel, tone: "dissent" },
              ].map(({ id, label, Icon, tone }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSide(id)}
                  aria-pressed={side === id}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg
                              text-[13px] font-medium border transition-colors duration-ui ${
                                side === id
                                  ? tone === "verdict"
                                    ? "border-verdict bg-verdict/10 text-verdict"
                                    : "border-dissent bg-dissent/10 text-dissent"
                                  : "border-line/15 text-content/55 hover:text-content"
                              }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="user-argument" className="block text-[12.5px] font-medium mb-2">
              Your submission
            </label>
            <textarea
              id="user-argument"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              required
              placeholder="Make the point as counsel would — take it to a statutory element, and cite an authority from the record if one helps."
              className="w-full rounded-lg px-3.5 py-3 text-[13px] leading-relaxed bg-surface border border-line/10
                         placeholder:text-content/30 focus:outline-none focus:border-accent-solid
                         transition-colors duration-ui resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="w-full inline-flex items-center justify-center gap-2 bg-accent-solid text-accent-on
                       font-semibold py-2.5 rounded-lg text-[13px] hover:brightness-105 disabled:opacity-50
                       transition-all duration-ui"
          >
            {busy ? (
              <><Loader2 size={15} className="animate-spin" />The bench is reading it…</>
            ) : (
              "Put it to the bench"
            )}
          </button>
        </form>
      ) : (
        <div className="p-5 space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl tabular-nums">{overall}%</span>
            <span className="text-[12.5px] text-content/55">
              overall, arguing for the {side}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {CRITERIA.map(([key, label]) => (
              <ScoreBar key={key} label={label} value={score[key]} />
            ))}
          </div>

          {(score.strengths || []).length > 0 && (
            <div>
              <p className="docket-label text-[10px] text-verdict mb-2">What worked</p>
              <ul className="space-y-1.5">
                {score.strengths.map((s, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-content/70 flex gap-2">
                    <span className="text-verdict mt-0.5 shrink-0">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(score.improvements || []).length > 0 && (
            <div>
              <p className="docket-label text-[10px] text-dissent mb-2">What to tighten</p>
              <ul className="space-y-1.5">
                {score.improvements.map((s, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-content/70 flex gap-2">
                    <span className="text-dissent mt-0.5 shrink-0">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.model_answer && (
            <div className="rounded-lg bg-content/5 p-4">
              <p className="docket-label text-[10px] text-accent mb-2">How counsel might have put it</p>
              <p className="text-[12.5px] leading-relaxed text-content/70 measure">{score.model_answer}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setScore(null)
                setText("")
              }}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-medium border border-line/15
                         hover:bg-content/5 transition-colors duration-ui"
            >
              Argue it again
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-medium bg-content/5
                         hover:bg-content/10 transition-colors duration-ui"
            >
              Back to the hearing
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
