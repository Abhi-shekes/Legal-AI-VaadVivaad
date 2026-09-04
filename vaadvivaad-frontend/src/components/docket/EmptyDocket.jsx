import { useNavigate } from "react-router-dom"
import { ArrowRight, Scale } from "lucide-react"

import { EXAMPLE_FILINGS } from "../../lib/filings"

/**
 * The empty docket.
 *
 * A first-time user has nothing to look at and no idea what a good filing looks
 * like, so the empty state does the onboarding: three real matters they can open
 * pre-filled and edit. The previous state was a single line of text.
 */
export default function EmptyDocket({ hasQuery, onClear }) {
  const navigate = useNavigate()

  if (hasQuery) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-content/60 mb-4">No matter matches that search.</p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-accent hover:underline"
        >
          Clear the filters
        </button>
      </div>
    )
  }

  return (
    <div className="py-12 lg:py-16">
      <div className="max-w-xl">
        <div className="w-11 h-11 rounded-lg bg-accent-solid/10 text-accent flex items-center justify-center mb-4">
          <Scale size={20} />
        </div>
        <h3 className="font-display text-2xl mb-2">Nothing on the record yet</h3>
        <p className="text-sm text-content/60 leading-relaxed">
          File a matter and two counsel argue it from the statute and the precedent on record, then
          the bench rules. Start from one of these, or write your own.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mt-7 max-w-4xl">
        {EXAMPLE_FILINGS.map((example) => (
          <button
            key={example.id}
            type="button"
            onClick={() => navigate("/user/case", { state: { prefill: example } })}
            className="group text-left rounded-lg border border-line/10 bg-surface p-4
                       hover:border-accent-solid/40 hover:elev-2 transition-all duration-ui ease-ui"
          >
            <p className="docket-label text-[10px] text-accent mb-1.5">{example.tag}</p>
            <p className="font-medium text-sm mb-1.5">{example.title}</p>
            <p className="text-[12.5px] text-content/55 leading-relaxed line-clamp-3">
              {example.incident}
            </p>
            <span className="inline-flex items-center gap-1 text-[12px] text-accent mt-3 opacity-0
                             group-hover:opacity-100 transition-opacity duration-ui">
              Open pre-filled
              <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
