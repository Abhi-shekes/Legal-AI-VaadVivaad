import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, Loader2, Radio } from "lucide-react"

import AppShell from "../layouts/AppShell"
import ConsultPanel from "../components/hearing/ConsultPanel"
import ElementsChecklist from "../components/hearing/ElementsChecklist"
import PriorRulings from "../components/hearing/PriorRulings"
import Transcript from "../components/hearing/Transcript"
import VerdictBanner from "../components/hearing/VerdictBanner"
import CaseFilePanel from "../components/case/CaseFilePanel"
import EvidenceGapsCard from "../components/case/EvidenceGapsCard"
import OutsideRecordPanel from "../components/case/OutsideRecordPanel"
import TimelinePanel from "../components/case/TimelinePanel"
import StrengthCard from "../components/case/StrengthCard"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"
import { api } from "../lib/api"
import { hydrateFromDoc, titleFromDoc } from "../lib/caseDoc"

/**
 * The record of a concluded hearing.
 *
 * Previously this read `response.data.status` -- an axios envelope the API
 * client does not produce -- and then `debate_history` and `ipc_section`, which
 * the backend stopped sending, so the page reliably rendered nothing.
 *
 * It now reads the stored document through the shared mapper and renders it
 * with the same transcript, checklist and verdict components the live hearing
 * uses, so the record and the hearing cannot drift apart.
 */
export default function CaseDetails() {
  const { id } = useParams()
  const [doc, setDoc] = useState(null)
  const [view, setView] = useState(null)
  const [translation, setTranslation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { user } = useAuthStore((state) => state)
  const { theme, changeTheme } = themeStore((state) => state)
  const handleLogout = useLogout()

  useEffect(() => {
    let cancelled = false
    const fetchCase = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.getCase(id)
        if (cancelled) return
        if (response?.status !== "success" || !response.data) {
          setError("That case could not be found.")
          return
        }
        setDoc(response.data)
        setView(hydrateFromDoc(response.data))
      } catch (err) {
        if (!cancelled) setError(err?.message || "The case record could not be loaded.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCase()
    return () => {
      cancelled = true
    }
  }, [id])

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

  if (loading) {
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center justify-center gap-3 py-32">
          <Loader2 size={26} className="animate-spin text-accent" />
          <p className="text-[13px] text-content/55">Loading the case record…</p>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell header={header}>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
          <div className="w-12 h-12 rounded-full bg-dissent/15 flex items-center justify-center">
            <AlertTriangle size={22} className="text-dissent" />
          </div>
          <h2 className="font-display text-2xl">Unable to load this case</h2>
          <p className="text-[13px] text-content/55 max-w-md">{error}</p>
          <Link
            to="/user/dashboard"
            className="mt-2 inline-flex items-center gap-2 bg-accent-solid text-accent-on font-semibold
                       px-5 py-2.5 rounded-lg text-[13px] hover:brightness-105 transition-all duration-ui"
          >
            Back to the docket
          </Link>
        </div>
      </AppShell>
    )
  }

  const unfinished = doc?.stage !== "done" && doc?.stage !== "failed"
  const filed = doc?.created_at
    ? new Date(doc.created_at).toLocaleDateString(undefined, {
        year: "numeric", month: "long", day: "numeric",
      })
    : null

  const turns = translation?.turns
    ? view.turns.map((t) => {
        const tr = translation.turns.find((x) => x.index === t.index)
        return tr ? { ...t, turn: { ...t.turn, headline: tr.headline, argument: tr.argument } } : t
      })
    : view.turns

  return (
    <AppShell header={header}>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="docket-label text-[10px] text-accent mb-2">On the record</p>
          <h1 className="font-display text-3xl lg:text-4xl mb-2">{titleFromDoc(doc)}</h1>
          <p className="font-mono text-[11.5px] text-content/45">
            {filed ? `Filed ${filed} · ` : ""}
            {view.turns.length} {view.turns.length === 1 ? "turn" : "turns"} · {id}
          </p>
        </div>

        {unfinished && (
          <Link
            to={`/user/case/${id}`}
            className="inline-flex items-center gap-2 bg-accent-solid text-accent-on font-semibold
                       px-5 py-2.5 rounded-lg text-[13px] hover:brightness-105 transition-all duration-ui"
          >
            <Radio size={15} />
            Resume this hearing
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        <aside className="xl:col-span-3 order-2 xl:order-1">
          <div className="xl:sticky xl:top-24">
            <ElementsChecklist details={view.caseDetails} turns={view.turns} />
          </div>
        </aside>

        <section className="xl:col-span-6 order-1 xl:order-2 min-w-0 space-y-6">
          <Transcript
            turns={turns}
            objections={view.objections.map((text, i) => ({
              // Stored objections carry no position, so they sit at the head of
              // the record rather than being invented into the middle of it.
              text: typeof text === "string" ? text : text.text,
              afterIndex: -1,
              at: i,
            }))}
            empty={{
              title: "Nothing was argued",
              body: "This matter has no turns on the record.",
            }}
          />

          {view.ruling && (
            <VerdictBanner
              ruling={view.ruling}
              caseId={id}
              onFileAnother={null}
              onTranslated={setTranslation}
              translation={translation}
            />
          )}

          <PriorRulings rulings={view.priorRulings} />

          {/* The record shows the exchange but does not take new questions --
              asking is done from the hearing itself. */}
          {view.consultations.length > 0 && (
            <ConsultPanel
              caseId={id}
              precedents={view.caseDetails?.precedents || []}
              readOnly
            />
          )}
        </section>

        <aside className="xl:col-span-3 order-3">
          <div className="xl:sticky xl:top-24 space-y-4">
            {view.gaps && <EvidenceGapsCard gaps={view.gaps} />}
            {view.strength && <StrengthCard strength={view.strength} />}
            <TimelinePanel caseId={id} />
            <CaseFilePanel caseId={id} />
            <OutsideRecordPanel caseId={id} />
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
