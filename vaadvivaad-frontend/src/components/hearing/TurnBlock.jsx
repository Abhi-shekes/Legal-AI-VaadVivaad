import { motion } from "framer-motion"
import { AlertTriangle, BookOpen, Gavel, ShieldCheck } from "lucide-react"

import { turnEnter } from "../../lib/motion"

/**
 * One turn, drawn on the side that is speaking.
 *
 * Prosecution sits flush left in verdict green, defence is indented and sits in
 * dissent red. The previous card gave both sides identical geometry and changed
 * only a left border, so an adversarial exchange read as a chat log.
 *
 * Citations are the verified authorities the turn actually resolved to; if the
 * citation check stripped anything, the card says so rather than quietly
 * showing shortened text.
 */
export default function TurnBlock({ turn, streaming = false }) {
  const prosecution = turn.side === "prosecution"
  const Icon = prosecution ? ShieldCheck : Gavel
  const content = turn.turn || {}
  const body = streaming ? turn.text : content.argument
  const citations = turn.citations || []

  const tone = prosecution
    ? { text: "text-verdict", chip: "bg-verdict/15 text-verdict", edge: "border-l-verdict" }
    : { text: "text-dissent", chip: "bg-dissent/15 text-dissent", edge: "border-l-dissent" }

  return (
    <motion.article
      {...turnEnter(turn.side)}
      className={`max-w-[min(100%,52rem)] ${prosecution ? "mr-auto" : "ml-auto"}`}
    >
      <div
        className={`rounded-lg border border-line/10 border-l-2 ${tone.edge} bg-surface elev-1 p-4 lg:p-5`}
      >
        <header className="flex items-center gap-2.5 mb-3">
          <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${tone.chip}`}>
            <Icon size={12} />
          </span>
          <span className="min-w-0">
            <span className={`block text-[13px] font-medium leading-tight ${tone.text}`}>
              {prosecution ? "Prosecution" : "Defence"} counsel
            </span>
            <span className="block docket-label text-[9.5px] text-content/40">
              Round {turn.round} · {turn.phase}
            </span>
          </span>
          {turn.claim_id && (
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-content/5 text-content/45">
              {turn.claim_id}
            </span>
          )}
        </header>

        {content.headline && !streaming && (
          <p className="text-[13.5px] font-medium leading-snug mb-2 measure">{content.headline}</p>
        )}

        <p className="text-[13.5px] leading-relaxed text-content/75 measure whitespace-pre-wrap">
          {body}
          {streaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent-solid align-text-bottom animate-pulse-live" />
          )}
        </p>

        {!streaming && content.element_addressed && (
          <p className="text-[11.5px] mt-2.5 text-content/45">
            Goes to: <span className="font-medium text-content/70">{content.element_addressed}</span>
          </p>
        )}

        {citations.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-line/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen size={11} className="text-accent" />
              <span className="docket-label text-[9px] text-accent">Relies on</span>
            </div>
            <ul className="space-y-1">
              {citations.map((c) => (
                <li key={c.citation_id} className="text-[11.5px] leading-snug">
                  <span className="font-medium">{c.case_name}</span>
                  {c.court && <span className="text-content/45"> · {c.court}</span>}
                  {c.source_url && (
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent ml-1.5 hover:underline"
                    >
                      read
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(turn.unsupported || []).length > 0 && (
          <p className="text-[11.5px] mt-2.5 text-dissent flex gap-1.5">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            <span>An authority that is not in the retrieved record was removed from this submission.</span>
          </p>
        )}
      </div>
    </motion.article>
  )
}
