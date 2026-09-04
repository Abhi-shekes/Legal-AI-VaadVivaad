import { useEffect, useState } from "react"
import { AlertTriangle, Download, FileText, Gavel, Languages, Loader2, MessagesSquare, RotateCcw } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"

import { api } from "../../lib/api"

/**
 * The order of the bench.
 *
 * On conclusion the ruling takes the full width rather than arriving as one
 * more card at the bottom of a scrolling well -- it is the answer the whole
 * hearing was for.
 *
 * The language selector calls `/user/languages` and `/user/cases/{id}/translate`,
 * which have been in the backend since translation was built and which no part
 * of the UI had ever called.
 */
export default function VerdictBanner({
  ruling, caseId, onFileAnother, onTranslated, translation,
  onContinue, continuing, remainingContinuations,
}) {
  const [languages, setLanguages] = useState([])
  const [target, setTarget] = useState("")
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.languages()
      .then((res) => {
        if (!cancelled && res?.status === "success") setLanguages(res.data || [])
      })
      .catch(() => {
        /* the hearing is readable in English; a missing list is not an error
           worth interrupting the user over */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const translate = async (code) => {
    setTarget(code)
    if (!code) {
      onTranslated(null)
      return
    }
    setTranslating(true)
    try {
      const res = await api.translateCase(caseId, code)
      if (res?.status === "success") onTranslated(res.data)
    } catch (err) {
      toast.error(err?.message || "That translation could not be produced.")
      setTarget("")
    } finally {
      setTranslating(false)
    }
  }

  if (!ruling) return null

  const pct = Math.round((ruling.confidence ?? 0) * 100)
  const prosecution = ruling.favoured_side === "prosecution"
  const band = pct >= 70 ? "Firm on this record" : pct >= 45 ? "Ordinary balance" : "The record is thin"
  const tone = pct >= 70 ? "bg-verdict" : pct >= 45 ? "bg-accent-solid" : "bg-dissent"

  return (
    <section className="rounded-lg border border-accent-solid/30 bg-surface-raised elev-2 overflow-hidden">
      <header className="px-5 lg:px-7 py-4 border-b border-accent-solid/20 flex flex-wrap items-center gap-3">
        <Gavel size={17} className="text-accent" />
        <h2 className="font-display text-xl">Order of the bench</h2>
        <span
          className={`docket-label text-[10px] px-2.5 py-1 rounded-full ${
            prosecution ? "bg-verdict/15 text-verdict" : "bg-dissent/15 text-dissent"
          }`}
        >
          Favours the {prosecution ? "prosecution" : "defence"}
        </span>
        {ruling.revises > 0 && (
          <span className="docket-label text-[10px] px-2.5 py-1 rounded-full bg-content/10 text-content/60">
            Revised order · {ruling.revises + 1}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {languages.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Languages size={14} className="text-content/40" />
              <label className="sr-only" htmlFor="verdict-language">Read this hearing in</label>
              <select
                id="verdict-language"
                value={target}
                onChange={(e) => translate(e.target.value)}
                disabled={translating}
                className="py-1.5 pl-2 pr-7 rounded text-[12px] bg-surface border border-line/10
                           focus:outline-none focus:border-accent-solid transition-colors duration-ui"
              >
                <option value="">English (original)</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              {translating && <Loader2 size={13} className="animate-spin text-accent" />}
            </div>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 p-5 lg:p-7">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <p className="docket-label text-[10px] text-accent mb-1.5">Decisive issue</p>
            <p className="text-[14px] leading-relaxed measure">
              {translation?.ruling?.decisive_issue || ruling.decisive_issue}
            </p>
          </div>

          {ruling.revision_note && (
            <div className="rounded-lg border border-accent-solid/30 bg-accent-solid/5 p-4">
              <p className="docket-label text-[10px] text-accent mb-1.5">
                What the further submissions changed
              </p>
              <p className="text-[13px] leading-relaxed measure">{ruling.revision_note}</p>
            </div>
          )}

          <div>
            <p className="docket-label text-[10px] text-accent mb-1.5">Disposition</p>
            <p className="text-[14px] leading-relaxed measure">
              {translation?.ruling?.disposition || ruling.disposition}
            </p>
          </div>

          {(ruling.findings || []).length > 0 && (
            <div>
              <p className="docket-label text-[10px] text-accent mb-2">Findings</p>
              <ul className="space-y-2">
                {ruling.findings.map((f, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed">
                    <span className="font-medium">{f.issue}</span>
                    <span className="text-content/60"> — {f.resolution}</span>
                    <span
                      className={`ml-1.5 font-mono text-[10px] ${
                        f.favoured === "prosecution" ? "text-verdict" : "text-dissent"
                      }`}
                    >
                      ({f.favoured})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(ruling.would_change_if || []).length > 0 && (
            <div className="rounded-lg bg-content/5 p-4">
              <p className="docket-label text-[10px] text-accent mb-2">What would change this</p>
              <ul className="space-y-1.5">
                {ruling.would_change_if.map((item, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-content/65 flex gap-2">
                    <span className="text-accent mt-0.5 shrink-0">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="docket-label text-[10px] text-accent">Confidence</p>
              <span className="font-display text-2xl tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-content/10">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11.5px] text-content/50 mt-2">{band}</p>
          </div>

          <div className="space-y-2">
            <a
              href={api.briefUrl(caseId, "pdf")}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent-solid text-accent-on
                         font-semibold py-2.5 rounded-lg text-[13px] hover:brightness-105 transition-all duration-ui"
            >
              <Download size={15} />
              Download the case brief
            </a>
            <div className="flex gap-2">
              <a
                href={api.briefUrl(caseId, "docx")}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px]
                           font-medium border border-line/15 hover:bg-content/5 transition-colors duration-ui"
              >
                <FileText size={13} />
                DOCX
              </a>
              <Link
                to={`/case/${caseId}`}
                className="flex-1 inline-flex items-center justify-center py-2 rounded-lg text-[12px]
                           font-medium border border-line/15 hover:bg-content/5 transition-colors duration-ui"
              >
                Open record
              </Link>
            </div>
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                disabled={continuing || remainingContinuations === 0}
                title={
                  remainingContinuations === 0
                    ? "This matter has been argued further the maximum number of times."
                    : "Recall counsel to argue the point further, then have the bench rule again."
                }
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg
                           text-[13px] font-medium border border-accent-solid/40 text-accent
                           hover:bg-accent-solid/10 disabled:opacity-40 transition-colors duration-ui"
              >
                {continuing ? (
                  <><Loader2 size={14} className="animate-spin" />Recalling counsel…</>
                ) : (
                  <><MessagesSquare size={14} />Argue it further</>
                )}
              </button>
            )}
            {typeof remainingContinuations === "number" && remainingContinuations >= 0 && onContinue && (
              <p className="text-[11px] text-content/40 text-center">
                {remainingContinuations === 0
                  ? "No further submissions remain on this matter."
                  : `${remainingContinuations} further ${remainingContinuations === 1 ? "hearing" : "hearings"} remaining`}
              </p>
            )}

            {onFileAnother && (
              <button
                type="button"
                onClick={onFileAnother}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[12px]
                           text-content/50 hover:text-content transition-colors duration-ui"
              >
                <RotateCcw size={12} />
                File another case
              </button>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-content/45 flex gap-2 pt-3 border-t border-line/10">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            <span>
              Generated analysis for study and research. Not legal advice, and not reviewed by an advocate.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
