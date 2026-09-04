import { useState } from "react"
import { Check, Plus, X } from "lucide-react"

/**
 * Evidence as items, each marked held or not held.
 *
 * The free-text box this replaces produced a paragraph, and the gaps analysis
 * downstream works item by item -- so a list of specific things, each with a
 * clear answer to "do you actually have it", is worth considerably more than
 * the same content as prose.
 *
 * It still serialises to the single `evidence` string the API takes, so nothing
 * changes on the server.
 */
export default function EvidenceChips({ items, onChange }) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const text = draft.trim()
    if (!text) return
    if (items.some((i) => i.text.toLowerCase() === text.toLowerCase())) {
      setDraft("")
      return
    }
    onChange([...items, { text, held: true }])
    setDraft("")
  }

  const toggle = (index) =>
    onChange(items.map((item, i) => (i === index ? { ...item, held: !item.held } : item)))

  const remove = (index) => onChange(items.filter((_, i) => i !== index))

  return (
    <div>
      <ul className="flex flex-wrap gap-2 mb-3">
        {items.map((item, i) => (
          <li key={item.text}>
            <span
              className={`group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg border text-[12.5px]
                          transition-colors duration-ui ${
                            item.held
                              ? "border-verdict/40 bg-verdict/10 text-verdict"
                              : "border-line/15 bg-content/5 text-content/55"
                          }`}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                title={item.held ? "You hold this — click if you do not" : "You do not hold this — click if you do"}
                className="inline-flex items-center gap-1.5"
              >
                {item.held ? <Check size={12} /> : <X size={12} />}
                <span className={item.held ? "" : "line-through decoration-content/30"}>{item.text}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${item.text}`}
                className="p-0.5 rounded text-content/30 hover:text-dissent transition-colors duration-ui"
              >
                <X size={11} />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="CCTV footage, a witness, an invoice…"
          aria-label="Add an item of evidence"
          className="flex-1 rounded-lg px-3 py-2 text-[13px] bg-surface-sunken border border-line/10
                     placeholder:text-content/35 focus:outline-none focus:border-accent-solid
                     transition-colors duration-ui"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1.5 px-3 rounded-lg text-[13px] font-medium
                     bg-content/5 text-content/70 hover:bg-content/10 disabled:opacity-40
                     transition-colors duration-ui"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <p className="text-[11px] text-content/40 mt-2 leading-relaxed">
        Click an item to switch it between <span className="text-verdict">held</span> and
        {" "}<span className="text-content/60">referred to but not held</span>. Counsel argues the
        difference, and the bench takes it seriously.
      </p>
    </div>
  )
}
