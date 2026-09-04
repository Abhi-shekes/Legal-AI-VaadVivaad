import { Fragment } from "react"
import { Hand, MessagesSquare } from "lucide-react"

import TurnBlock from "./TurnBlock"

/**
 * The record of the hearing.
 *
 * Turns are grouped under the round they belong to, and accepted objections are
 * rendered where they landed. The reducer had been collecting `objections[]`
 * from the socket the whole time and nothing displayed them -- a user could
 * raise one, get a toast, and then find no trace of it in the record.
 */

function RoundDivider({ round, phase }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="docket-label text-[10px] text-content/40 shrink-0">
        Round {round}
        {phase ? ` · ${phase}` : ""}
      </span>
      <span className="flex-1 h-px bg-line/10" />
    </div>
  )
}

function Objection({ text }) {
  return (
    <div className="max-w-[min(100%,52rem)] mx-auto">
      <div className="rounded-lg border border-accent-solid/40 bg-accent-solid/5 px-4 py-3 flex gap-2.5">
        <Hand size={14} className="text-accent shrink-0 mt-0.5" />
        <div>
          <p className="docket-label text-[9.5px] text-accent mb-1">Your objection</p>
          <p className="text-[13px] leading-relaxed text-content/75">{text}</p>
        </div>
      </div>
    </div>
  )
}

export default function Transcript({ turns, streaming, objections = [], empty }) {
  if (!turns.length && !streaming) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24">
        <div className="w-12 h-12 mb-4 rounded-full bg-content/5 flex items-center justify-center">
          <MessagesSquare size={20} className="text-content/35" />
        </div>
        <h3 className="font-display text-lg mb-1.5">{empty?.title || "Ready for proceedings"}</h3>
        <p className="text-[13px] text-content/55 max-w-xs">
          {empty?.body || "Submit your case to open the session."}
        </p>
      </div>
    )
  }

  // Objections keyed by the turn they interrupted, so they can be dropped in
  // at the right point rather than appended in a block at the end.
  const interruptions = objections.reduce((map, o) => {
    const list = map.get(o.afterIndex) || []
    list.push(o)
    map.set(o.afterIndex, list)
    return map
  }, new Map())

  let lastRound = null

  return (
    <div className="flex flex-col gap-4">
      {(interruptions.get(-1) || []).map((o, i) => (
        <Objection key={`pre-${i}`} text={o.text} />
      ))}

      {turns.map((turn) => {
        const newRound = turn.round !== lastRound
        lastRound = turn.round
        return (
          <Fragment key={turn.index}>
            {newRound && <RoundDivider round={turn.round} phase={turn.phase} />}
            <TurnBlock turn={turn} />
            {(interruptions.get(turn.index) || []).map((o, i) => (
              <Objection key={`${turn.index}-${i}`} text={o.text} />
            ))}
          </Fragment>
        )
      })}

      {streaming && <TurnBlock turn={streaming} streaming />}
    </div>
  )
}
