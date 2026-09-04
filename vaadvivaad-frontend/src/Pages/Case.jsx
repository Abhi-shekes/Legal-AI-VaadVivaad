import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, Hand, Info, LifeBuoy, Loader2, Scale } from "lucide-react"
import { toast } from "react-toastify"

import AppShell from "../layouts/AppShell"
import Composer from "../components/intake/Composer"
import ConsultPanel from "../components/hearing/ConsultPanel"
import ElementsChecklist from "../components/hearing/ElementsChecklist"
import PriorRulings from "../components/hearing/PriorRulings"
import StageRail from "../components/hearing/StageRail"
import TakeASide from "../components/hearing/TakeASide"
import Transcript from "../components/hearing/Transcript"
import VerdictBanner from "../components/hearing/VerdictBanner"
import EvidenceGapsCard from "../components/case/EvidenceGapsCard"
import StrengthCard from "../components/case/StrengthCard"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"
import { useDebateSocket } from "../hooks/useDebateSocket"
import { api } from "../lib/api"
import { hydrateFromDoc, titleFromDoc } from "../lib/caseDoc"

/**
 * File a case, then watch it argued.
 *
 * The page used to show both states at once -- a 384px intake form beside a
 * transcript in a 760px scroll box -- so each got half the screen and neither
 * was good. Intake now owns the full width until it is submitted, and the
 * hearing takes the room after that.
 *
 * With an `:id` in the route this resumes an existing case: the server replays
 * a finished hearing from storage and continues an unfinished one, which is
 * what `resume_url` in every create response has been pointing at.
 */
export default function Case() {
  const { id: routeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { user } = useAuthStore((s) => s)
  const { theme, changeTheme } = themeStore((s) => s)
  const handleLogout = useLogout()

  const [caseId, setCaseId] = useState(routeId || null)
  const [guard, setGuard] = useState(null)
  const [title, setTitle] = useState("")
  const [objection, setObjection] = useState("")
  const [takingSide, setTakingSide] = useState(false)
  const [translation, setTranslation] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [resuming, setResuming] = useState(Boolean(routeId))
  const [resumeError, setResumeError] = useState(null)

  const transcriptEnd = useRef(null)
  const pinned = useRef(true)
  const debate = useDebateSocket()

  const prefill = location.state?.prefill || null

  // Resuming. The document gives us the transcript immediately; the socket then
  // joins the room, so a hearing still in flight keeps streaming into the same
  // view rather than sitting frozen at whatever had been saved.
  useEffect(() => {
    if (!routeId) return undefined
    let cancelled = false
    const resume = async () => {
      try {
        const res = await api.getCase(routeId)
        if (cancelled) return
        if (res?.status !== "success" || !res.data) {
          setResumeError("That case could not be found.")
          return
        }
        setTitle(titleFromDoc(res.data))
        debate.hydrate(hydrateFromDoc(res.data))
        debate.start(routeId, { preserve: true })
      } catch (err) {
        if (!cancelled) setResumeError(err?.message || "That case could not be reopened.")
      } finally {
        if (!cancelled) setResuming(false)
      }
    }
    resume()
    return () => {
      cancelled = true
    }
    // `debate` is stable in the ways that matter here; re-running on every
    // reducer tick would restart the hearing on each streamed token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  // Follow the transcript, but stop following the moment the user scrolls up to
  // re-read something. The old page yanked the view to the bottom on every
  // token regardless of where the reader was.
  useEffect(() => {
    const el = document.scrollingElement
    if (!el) return undefined
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 220
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (pinned.current) transcriptEnd.current?.scrollIntoView({ block: "end" })
  }, [debate.turns, debate.streaming, debate.ruling])

  const opened = useCallback((res) => {
    setGuard(res.guard || null)
    // A rejection is a routing decision, not an error: the old flow raised an
    // error and dropped the socket, so the only way back was a page reload.
    if (res.status === "rejected") return
    setCaseId(res.debate_id)
    if (res.extracted?.crime_type) setTitle(res.extracted.crime_type)
    debate.start(res.debate_id)
    // Stamp the resumable URL in place without going through the router --
    // navigating would set `:id`, which would fire the resume effect and
    // restart the hearing that has only just begun.
    const base = import.meta.env.BASE_URL.replace(/\/$/, "")
    window.history.replaceState(null, "", `${base}/user/case/${res.debate_id}`)
  }, [debate])

  const sendObjection = () => {
    const text = objection.trim()
    if (!text) return
    debate.object(text)
    setObjection("")
    toast.info("Objection noted — counsel will address it.")
  }

  const continueHearing = async () => {
    if (continuing) return
    setContinuing(true)
    try {
      const res = await api.continueHearing(caseId)
      if (res?.status !== "success") {
        toast.error(res?.message || "This matter could not be argued further.")
        return
      }
      toast.info("Counsel have been recalled for further submissions.")
      // The REST call only reopens the hearing; the socket argues it, so the
      // new turns stream into the transcript the same way the first ones did.
      setTakingSide(false)
      debate.start(caseId, { preserve: true })
    } catch (err) {
      toast.error(err?.message || "This matter could not be argued further.")
    } finally {
      setContinuing(false)
    }
  }

  const fileAnother = () => {
    navigate("/user/case", { replace: true })
    window.location.reload()
  }

  const live = Boolean(caseId) && !debate.concluded && debate.stage !== "failed"
  const finished = debate.concluded || debate.stage === "failed"
  const lastOpposing = useMemo(() => {
    const last = [...debate.turns].reverse()[0]
    return last?.turn?.argument || ""
  }, [debate.turns])

  const header = {
    user,
    onLogout: handleLogout,
    changeTheme,
    dark: theme === "dark",
    center: (
      <Link
        to="/user/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-content/60 hover:text-accent transition-colors duration-ui"
      >
        <ArrowLeft size={14} />
        Back to the docket
      </Link>
    ),
  }

  // ── Intake ──────────────────────────────────────────────────────────────
  if (!caseId && !resuming) {
    return (
      <AppShell header={header}>
        <div className="mb-7 max-w-2xl">
          <p className="docket-label text-[10px] text-accent mb-2">New filing</p>
          <h1 className="font-display text-3xl lg:text-4xl mb-3">File your case</h1>
          <p className="text-[14px] leading-relaxed text-content/60">
            Describe the incident and what evidence you actually hold. Both sides argue it from the
            statute and the precedent on record, then the bench rules.
          </p>
        </div>

        {guard && guard.decision !== "in_scope" && (
          <GuardNotice guard={guard} onDismiss={() => setGuard(null)} />
        )}

        <Composer prefill={prefill} onOpened={opened} />
      </AppShell>
    )
  }

  // ── Resuming ────────────────────────────────────────────────────────────
  if (resuming) {
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 size={26} className="animate-spin text-accent" />
          <p className="text-[13px] text-content/55">Reopening the case record…</p>
        </div>
      </AppShell>
    )
  }

  if (resumeError) {
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
          <AlertTriangle size={24} className="text-dissent" />
          <h2 className="font-display text-2xl">Unable to reopen this case</h2>
          <p className="text-[13px] text-content/55 max-w-md">{resumeError}</p>
          <Link
            to="/user/dashboard"
            className="mt-2 inline-flex items-center gap-2 bg-accent-solid text-accent-on font-semibold
                       px-5 py-2.5 rounded-lg text-[13px]"
          >
            Back to the docket
          </Link>
        </div>
      </AppShell>
    )
  }

  // ── The hearing ─────────────────────────────────────────────────────────
  return (
    <AppShell header={header} bleed>
      <StageRail
        stage={debate.stage}
        statusMessage={debate.statusMessage}
        connected={debate.connected}
        startedAt={debate.startedAt}
        tokens={debate.tokens}
        title={title}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left rail -- what has to be proved, and what was found */}
          <aside className="xl:col-span-3 order-2 xl:order-1">
            <div className="xl:sticky xl:top-24 space-y-4">
              <ElementsChecklist details={debate.caseDetails} turns={debate.turns} />
            </div>
          </aside>

          {/* The record */}
          <section className="xl:col-span-6 order-1 xl:order-2 min-w-0">
            {guard && guard.decision !== "in_scope" && (
              <div className="mb-4">
                <GuardNotice guard={guard} />
              </div>
            )}

            <div
              aria-live="polite"
              aria-busy={live}
              aria-label="Hearing transcript"
            >
              <Transcript
                turns={translation?.turns
                  ? debate.turns.map((t) => {
                      const tr = translation.turns.find((x) => x.index === t.index)
                      return tr ? { ...t, turn: { ...t.turn, headline: tr.headline, argument: tr.argument } } : t
                    })
                  : debate.turns}
                streaming={debate.streaming}
                objections={debate.objections}
                empty={{
                  title: "The hearing is opening",
                  body: "Counsel are being briefed on the record.",
                }}
              />
            </div>

            {debate.error && (
              <div className="mt-4 rounded-lg border border-dissent/40 bg-dissent/5 p-4 flex gap-2.5">
                <AlertTriangle size={15} className="text-dissent shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed">{debate.error}</p>
              </div>
            )}

            {finished && (
              <div className="mt-6 space-y-5">
                <VerdictBanner
                  ruling={debate.ruling}
                  caseId={caseId}
                  onFileAnother={fileAnother}
                  onTranslated={setTranslation}
                  translation={translation}
                  onContinue={continueHearing}
                  continuing={continuing}
                  remainingContinuations={debate.remainingContinuations}
                />

                <PriorRulings rulings={debate.priorRulings} />

                <ConsultPanel
                  caseId={caseId}
                  precedents={debate.caseDetails?.precedents || []}
                />

                {takingSide && (
                  <TakeASide
                    caseId={caseId}
                    answering={lastOpposing}
                    onClose={() => setTakingSide(false)}
                  />
                )}
              </div>
            )}

            <div ref={transcriptEnd} />
          </section>

          {/* Right rail -- live scoring */}
          <aside className="xl:col-span-3 order-3">
            <div className="xl:sticky xl:top-24 space-y-4">
              {debate.gaps && <EvidenceGapsCard gaps={debate.gaps} />}
              {debate.strength && <StrengthCard strength={debate.strength} />}
              {!debate.gaps && !debate.strength && (
                <div className="rounded-lg border border-line/10 bg-surface p-5 elev-1">
                  <p className="docket-label text-[10px] text-content/40 mb-2">Audit</p>
                  <p className="text-[12.5px] leading-relaxed text-content/55">
                    Evidence gaps and case strength are scored once the bench has ruled.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Action bar -- objections while it runs, take-a-side once it has ruled */}
      {/* Sits above the mobile nav bar, which is fixed to the bottom of the
          viewport; at md the rail takes over and the bar goes flush. */}
      <div className="sticky bottom-16 md:bottom-0 z-20 border-t border-line/10 bg-surface-raised/95 backdrop-blur-md">
        <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-3 flex flex-wrap items-center gap-2">
          {live ? (
            <>
              <input
                value={objection}
                onChange={(e) => setObjection(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendObjection()}
                placeholder="Object — add a fact, or challenge a point counsel just made…"
                aria-label="Raise an objection"
                className="flex-1 min-w-[220px] rounded-lg px-3.5 py-2.5 text-[13px] bg-surface border border-line/10
                           placeholder:text-content/30 focus:outline-none focus:border-accent-solid
                           transition-colors duration-ui"
              />
              <button
                type="button"
                onClick={sendObjection}
                disabled={!objection.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium
                           bg-accent-solid/15 text-accent disabled:opacity-40 hover:bg-accent-solid/25
                           transition-colors duration-ui"
              >
                <Hand size={14} />
                Object
              </button>
            </>
          ) : (
            <>
              <p className="text-[12.5px] text-content/50 flex-1 min-w-[200px]">
                The hearing has concluded. Argue it yourself and the bench will score you against the
                same record.
              </p>
              <button
                type="button"
                onClick={() => setTakingSide((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold
                           bg-accent-solid text-accent-on hover:brightness-105 transition-all duration-ui"
              >
                <Scale size={15} />
                {takingSide ? "Hide" : "Take a side"}
              </button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

/** Out of scope, or a welfare referral. Both are routing decisions, not errors. */
function GuardNotice({ guard, onDismiss }) {
  const welfare = guard.welfare
  return (
    <div
      className={`rounded-lg border p-4 ${
        welfare ? "border-dissent/40 bg-dissent/5" : "border-accent-solid/40 bg-accent-solid/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {welfare ? (
          <LifeBuoy size={15} className="text-dissent" />
        ) : (
          <Info size={15} className="text-accent" />
        )}
        <p className="text-[13px] font-medium">
          {welfare ? "Support comes first" : "Outside what this service argues"}
        </p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto text-[12px] text-content/45 hover:text-content transition-colors duration-ui"
          >
            Dismiss
          </button>
        )}
      </div>
      <p className="text-[13px] leading-relaxed text-content/65">{guard.reason}</p>
      {guard.suggestion && (
        <p className="text-[13px] leading-relaxed text-content/65 mt-2">{guard.suggestion}</p>
      )}
      {welfare && (guard.helplines || []).length > 0 && (
        <ul className="mt-3 space-y-1">
          {guard.helplines.map((h) => (
            <li key={h.number} className="text-[13px]">
              <span className="font-medium">{h.name}</span>
              <span className="font-mono ml-2 text-dissent">{h.number}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
