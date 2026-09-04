import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import themeStore from '../store/themeStore';
import {
  AlertTriangle, ArrowRight, BadgeCheck, BookOpen, Check, ClipboardList, Clock,
  FileSearch, FileText, Gavel, GitBranch, Landmark, Languages, Layers, Lock,
  MessagesSquare, Network, Scale, ScrollText, Search, Server, ShieldCheck,
  Split, Sparkles, X, Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   Content — every claim below maps to something in the codebase.
   ───────────────────────────────────────────────────────────────────────── */

const STATS = [
  { value: '8', label: 'Phases per hearing, prosecution and defence in turn' },
  { value: '0', label: 'Citations that reach the transcript unverified' },
  { value: 'IPC + BNS', label: 'Routed by the date of the incident' },
  { value: '1', label: 'External service — the rest is self-hosted' },
];

const TRUST_STRIP = [
  'EVERY CITATION VERIFIED BEFORE IT IS SHOWN',
  'NO AUTHORITY THE MODEL CANNOT POINT TO',
  'IPC ↔ BNS BY INCIDENT DATE',
  'CONFIDENCE CAPPED TO THE RECORD',
  'DURABLE, RESUMABLE HEARINGS',
  'ONE EXTERNAL CALL',
];

const HEARING_STAGES = [
  {
    n: '01', tag: 'Intake', icon: FileText,
    title: 'File the matter',
    body: 'Type it, dictate it, or drop an FIR, chargesheet, notice or bail order. It is screened for scope, welfare and prompt injection, then parsed into a structured record and shown back for correction.',
  },
  {
    n: '02', tag: 'Research', icon: Search,
    title: 'The record is built',
    body: 'The engaged section is routed IPC ↔ BNS by the incident date. Verified precedent is retrieved by hybrid search. The case file is read against itself for dates that do not add up.',
  },
  {
    n: '03', tag: 'Opening', icon: Scale,
    title: 'Both sides frame it',
    body: 'Prosecution states the offence on the record as it stands; defence identifies the weakest link. A claim ledger starts tracking who claimed what.',
  },
  {
    n: '04', tag: 'Evidence', icon: ClipboardList,
    title: 'The proof is argued',
    body: 'Recovery, seizure, medical findings, witness statements — argued against the statutory elements, with passages pulled from the case’s own documents, page-anchored.',
  },
  {
    n: '05', tag: 'Rebuttal', icon: Split,
    title: 'The points are answered',
    body: 'Each side answers the other’s open claims by id. A point that is right is conceded and the argument moves to firmer ground, so the ledger converges instead of repeating.',
  },
  {
    n: '06', tag: 'Closing', icon: BookOpen,
    title: 'The case is drawn together',
    body: 'The stronger reasoning tier holds the whole record in one submission — the turn that has to make the case as a whole, not one point at a time.',
  },
  {
    n: '07', tag: 'Order', icon: Gavel,
    title: 'The bench rules',
    body: 'A reasoned disposition on the decisive issue. Confidence is capped at what the record supports — no verified authority, unverified statute, or a short hearing each lower the ceiling.',
  },
  {
    n: '08', tag: 'Audit', icon: FileSearch,
    title: 'The record is audited',
    body: 'What the evidence does not establish, how that class of proof is ordinarily obtained and by whom, and an overall read on case strength.',
  },
];

const CAPABILITIES = [
  {
    icon: MessagesSquare, tag: 'The hearing',
    title: 'An adversarial hearing, not a chat',
    body: 'A checkpointed state machine runs the whole matter, and it is durable — closing the tab or restarting the server resumes it rather than losing the argument.',
    points: [
      'Prosecution and defence across four phases',
      'A rolling claim ledger — who answered what',
      'Object mid-hearing, or take a side yourself',
      'Recall counsel for further submissions',
    ],
    span: 'lg:col-span-3', big: true,
  },
  {
    icon: BadgeCheck, tag: 'Trust boundary',
    title: 'Verified citations',
    body: 'Counsel may cite only from the shortlist actually retrieved. Every citation is checked before the turn is shown; anything unmatched is stripped from the argument and the turn is flagged. A precedent also carries its treatment — whether it is still good law.',
    span: 'lg:col-span-3',
  },
  {
    icon: GitBranch, tag: 'Concordance',
    title: 'IPC ↔ BNS',
    body: 'Routed by incident date, the counterpart always shown. The mapping is data, hand-reviewed — never model output.',
    span: 'lg:col-span-2',
  },
  {
    icon: FileText, tag: 'Intake',
    title: 'From a document',
    body: 'An FIR, chargesheet, notice or bail order becomes the same structured record a typed description does — shown back for correction first.',
    span: 'lg:col-span-2',
  },
  {
    icon: Layers, tag: 'Case file',
    title: 'The whole file, quoted',
    body: 'Every document in the matter is chunked, embedded and page-anchored, so counsel argue from the chargesheet itself — not a summary.',
    span: 'lg:col-span-2',
  },
  {
    icon: Clock, tag: 'Timeline',
    title: 'What does not add up',
    body: 'An FIR timestamped before the incident, a witness in two places — found by arithmetic and marked certain, or read from the prose and marked provisional with the passage anchors it rests on.',
    span: 'lg:col-span-3',
  },
  {
    icon: FileSearch, tag: 'Audit',
    title: 'The bench’s audit',
    body: 'After the order: what the evidence does not establish, how that class of proof is ordinarily obtained and by whom, and an overall read on case strength.',
    span: 'lg:col-span-3',
  },
  {
    icon: Languages, tag: 'Reach',
    title: '12 Indian languages, and voice',
    body: 'File and read the hearing in the language the matter was lived in — section numbers and citations stay in their canonical form. Dictate it out loud; hear each persona in a distinct voice.',
    chips: ['English', 'हिन्दी', 'मराठी', 'বাংলা', 'தமிழ்', 'తెలుగు', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'ਪੰਜਾਬੀ', 'ଓଡ଼ିଆ', 'اردو'],
    span: 'lg:col-span-6',
  },
];

const BOUNDARY = [
  {
    icon: Search, label: 'Retrieved shortlist',
    body: 'Hybrid search returns a handful of verified authorities for this matter. That list is the only thing counsel may cite.',
    tone: 'brass',
  },
  {
    icon: X, label: 'An injected citation',
    body: 'Persuading the model to write "cite Sharma v. State" costs an attacker nothing — but it still has to exist in the shortlist. It does not, so it is stripped before the turn is shown.',
    tone: 'dissent',
  },
  {
    icon: Lock, label: 'Curated corpus only',
    body: 'The application never writes to the corpus. Every document carries provenance; retrieval refuses anything not marked verified from a declared source.',
    tone: 'verdict',
  },
  {
    icon: Network, label: 'The open web, walled off',
    body: 'Live results appear in a panel marked outside the record. They are never citable, never Precedent objects, and never enter the debate.',
    tone: 'brass',
  },
];

const SPECIMENS = [
  {
    icon: Gavel, kind: 'Statute · routed',
    title: 'Section 302 — Murder',
    sub: 'IPC · offences before 1 Jul 2024',
    rows: [['BNS counterpart', 'S. 103'], ['Cognizable', 'Yes'], ['Bailable', 'No']],
  },
  {
    icon: Landmark, kind: 'Precedent · verified',
    title: 'State of Punjab v. Gurmit Singh',
    sub: 'Supreme Court · relied on for s. 27 recovery',
    treatment: 'Good law — no negative treatment on record',
  },
  {
    icon: ClipboardList, kind: 'Evidence gap · from the audit',
    title: 'Identity not established',
    sub: 'No test identification parade; sole eyewitness related to the deceased',
    chips: ['TIP under BNSS', 'Independent witness', 'CDR / tower dump'],
  },
];

const ARCHITECTURE = [
  { icon: Server, name: 'FastAPI + Socket.IO', note: 'The durable hearing machine — turns persisted as they stream.' },
  { icon: ScrollText, name: 'MongoDB', note: 'Users, cases, full transcripts and orders. Authenticated.' },
  { icon: Search, name: 'Qdrant', note: 'Hybrid vector search — BM25 sparse fused with dense, RRF.' },
  { icon: Zap, name: 'Redis', note: 'Sessions, rate limits, in-flight hearing state.' },
  { icon: Sparkles, name: 'Google Gemini', note: 'The one external account — argument and the bench’s reasoning.' },
];

const PROFILES = [
  'Local embeddings + cross-encoder reranker',
  'Full-text search over your whole record',
  'Live grounding via self-hosted metasearch',
  'Dictation in, the hearing read out',
];

const FAQS = [
  {
    q: 'Is this legal advice?',
    a: 'No. VaadVivaad simulates how a matter might be argued — a research and drafting aid, not a substitute for a licensed advocate. Check every section number and authority against the official text before any use.',
  },
  {
    q: 'What actually grounds the arguments?',
    a: 'Verified statute text and precedent retrieved by hybrid search, plus passages from the case’s own documents. Every authority a turn relies on is checked against the retrieved shortlist before the turn is shown — a citation the model cannot point to never reaches you.',
  },
  {
    q: 'IPC or BNS?',
    a: 'Both. The Bharatiya Nyaya Sanhita replaced the IPC for offences on or after 1 July 2024, and both stay live in the courts for years. The engaged section is routed by the incident date, and its counterpart is always shown.',
  },
  {
    q: 'Can I run it myself?',
    a: 'Yes — one docker compose up. Five containers in the core stack, everything self-hosted, with Gemini as the only external account. Local embeddings, record search, web grounding and voice are opt-in profiles.',
  },
  {
    q: 'Is my case data private?',
    a: 'Your submissions, transcripts and orders are tied to your account. The case id is a server-minted opaque identifier, so a live hearing cannot be found by guessing. Deleting a matter takes its case file out of the vector store with it.',
  },
  {
    q: 'What happens if I close the tab mid-hearing?',
    a: 'Nothing is lost. Every turn is persisted as it completes; reopen the case and the hearing resumes from where it stopped — the tokens already spent are not spent again.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Small pieces
   ───────────────────────────────────────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay },
});

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Types a string out once, when it scrolls into view. */
function StreamLine({ text, className = '', speed = 22 }) {
  const [shown, setShown] = useState(prefersReducedMotion() ? text : '');
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.6 });

  useEffect(() => {
    if (!inView || prefersReducedMotion() || shown === text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [inView, text, speed, shown]);

  const typing = shown.length < text.length;
  return (
    <span ref={ref} className={className}>
      {shown}
      {typing && <span className="inline-block w-[2px] h-[1em] -mb-[2px] ml-[1px] bg-brass animate-pulse-live" />}
    </span>
  );
}

/** The hero's live-hearing specimen. */
function HearingMock({ dark }) {
  const card = dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10';
  const body = dark ? 'text-gray-300' : 'text-ink-blue/75';
  const faint = dark ? 'text-gray-500' : 'text-ink-blue/45';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className={`rounded-2xl border ${card} shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] overflow-hidden text-left`}
    >
      {/* header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b ${dark ? 'border-white/10' : 'border-ink-blue/10'}`}>
        <span className="docket-label text-[10px] text-brass">The Docket · live hearing</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verdict opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-verdict" />
          </span>
          <span className="docket-label text-[9px] text-verdict">Streaming</span>
        </span>
      </div>

      <div className="p-5 space-y-3.5">
        <p className={`docket-label text-[9.5px] ${faint}`}>Evidence · Round 2</p>

        {/* prosecution */}
        <div className={`rounded-lg border-l-2 border-verdict ${dark ? 'bg-white/[0.03]' : 'bg-parchment/70'} p-3.5`}>
          <p className="text-[11px] font-medium text-verdict mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={12} /> Prosecution counsel
          </p>
          <p className={`text-[12.5px] leading-relaxed ${body}`}>
            Recovery of the weapon at the accused&rsquo;s instance is admissible under Section 27 of the Evidence Act, and corroborates the eyewitness account.
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-verdict/15 text-verdict font-medium">
            <Check size={11} /> State of Punjab v. Gurmit Singh &mdash; verified
          </span>
        </div>

        {/* defence, streaming */}
        <div className={`rounded-lg border-l-2 border-dissent ${dark ? 'bg-white/[0.03]' : 'bg-parchment/70'} p-3.5 ml-4`}>
          <p className="text-[11px] font-medium text-dissent mb-1.5 flex items-center gap-1.5">
            <Gavel size={12} /> Defence counsel
          </p>
          <p className={`text-[12.5px] leading-relaxed ${body}`}>
            <StreamLine text="The seizure memo is unwitnessed and the panch is a police witness — the recovery cannot be put to the accused." />
          </p>
          <span className={`mt-2.5 block font-mono text-[10px] ${faint}`}>
            answers C-3 · prosecution&rsquo;s recovery claim → contested
          </span>
        </div>

        {/* stripped citation */}
        <div className={`rounded-lg border ${dark ? 'border-white/10 bg-white/[0.02]' : 'border-ink-blue/10 bg-white'} p-3 flex gap-2.5`}>
          <AlertTriangle size={14} className="text-brass shrink-0 mt-0.5" />
          <p className={`text-[11.5px] leading-relaxed ${body}`}>
            <span className="line-through opacity-60">&ldquo;Sharma v. State&rdquo;</span> &mdash; not in the retrieved record. Removed before this turn was shown.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

const Landing = () => {
  const navigate = useNavigate();
  const { theme } = themeStore((state) => state);
  const dark = theme === 'dark';

  const controls = useAnimation();
  const [bentoRef, bentoInView] = useInView({ threshold: 0.1, triggerOnce: true });
  useEffect(() => {
    if (bentoInView) controls.start('visible');
  }, [controls, bentoInView]);

  const railRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ['start 70%', 'end 60%'],
  });
  const railHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const muted = dark ? 'text-gray-400' : 'text-ink-blue/60';
  const faint = dark ? 'text-gray-500' : 'text-ink-blue/45';
  const panel = dark ? 'bg-white/[0.02]' : 'bg-white';
  const cardBase = dark
    ? 'bg-white/[0.03] border-white/10'
    : 'bg-white border-ink-blue/10 shadow-sm';

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden ${dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'}`}>

      {/* ══════════ Hero ══════════ */}
      <section className="pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-24 px-4 sm:px-6 md:px-10 lg:px-20 relative overflow-hidden">
        <motion.div
          className="absolute -top-32 left-1/4 w-[34rem] h-[34rem] rounded-full bg-brass/20 blur-[130px] pointer-events-none"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-16 right-1/4 w-[28rem] h-[28rem] rounded-full bg-verdict/15 blur-[120px] pointer-events-none"
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${dark ? '#fff' : '#1B2A4A'} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
            {/* left */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 border border-brass/30 bg-brass/[0.07]"
              >
                <Scale size={12} className="text-brass" />
                <span className="docket-label text-[10px] sm:text-[11px] text-brass">
                  Adversarial legal AI · Indian criminal law · IPC &amp; BNS
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="font-display text-5xl sm:text-6xl md:text-7xl leading-[1.03] mb-6 tracking-tight"
              >
                Your case,
                <br />
                <span className="gradient-text">argued both ways.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`text-base sm:text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-9 ${muted}`}
              >
                File a matter and a structured hearing runs it — prosecution and
                defence across four phases, every citation checked against real
                authority, and a reasoned order from the bench.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start"
              >
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-3.5 px-8 rounded-full text-[15px] shadow-[0_0_50px_-10px_rgba(199,160,70,0.7)] transition-transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  File your case
                  <ArrowRight size={17} />
                </button>
                <a
                  href="#the-hearing"
                  onClick={scrollTo('#the-hearing')}
                  className={`inline-flex items-center gap-2 py-3.5 px-7 rounded-full text-[15px] font-medium border transition-colors ${dark ? 'border-white/15 hover:border-white/30 text-gray-200' : 'border-ink-blue/15 hover:border-ink-blue/30 text-ink-blue/80'}`}
                >
                  See how a hearing works
                </a>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className={`font-mono text-[11px] mt-5 ${faint}`}
              >
                Specimen exchange &rarr; every real hearing is generated fresh for your matter.
              </motion.p>
            </div>

            {/* right */}
            <HearingMock dark={dark} />
          </div>

          {/* stat row */}
          <motion.div
            {...fadeUp(0.1)}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto docket-rule pt-10 mt-16 md:mt-20"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <p className="font-display gradient-text text-3xl sm:text-4xl md:text-5xl mb-2 leading-none">
                  {s.value}
                </p>
                <p className={`text-[11px] sm:text-xs leading-snug ${muted}`}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ Trust strip ══════════ */}
      <div className={`relative py-3.5 overflow-hidden border-y ${dark ? 'bg-white/[0.02] border-white/10' : 'bg-ink-blue border-ink-blue'}`}>
        <div className="flex whitespace-nowrap animate-marquee">
          {[...TRUST_STRIP, ...TRUST_STRIP, ...TRUST_STRIP].map((item, i) => (
            <span key={i} className="flex items-center font-mono text-[11px] tracking-[0.14em] text-white/55 mx-6">
              {item}
              <span className="text-brass mx-6">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ══════════ The hearing — phase rail ══════════ */}
      <section id="the-hearing" className="py-16 md:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16 xl:gap-24">
          {/* sticky intro */}
          <div className="lg:sticky lg:top-28 lg:self-start mb-12 lg:mb-0">
            <motion.div {...fadeUp()}>
              <p className={`docket-label text-xs mb-3 ${faint}`}>Procedure</p>
              <h2 className="font-display text-4xl md:text-5xl mb-4">How a hearing unfolds.</h2>
              <p className={`text-sm md:text-base ${muted}`}>
                One honest flow — no hidden prompt, every stage inspectable, and the
                transcript persisted turn by turn so nothing is lost if you walk away.
              </p>

              <div className={`mt-8 rounded-xl border-l-2 border-brass p-5 ${dark ? 'bg-white/[0.03]' : 'bg-white'}`}>
                <p className={`docket-label text-[10px] mb-2 ${faint}`}>After the order</p>
                <p className={`text-[13px] leading-relaxed ${muted}`}>
                  Recall counsel for further submissions (the prior order is kept,
                  not overwritten), put a question to the bench or either counsel,
                  translate the hearing into one of 12 Indian languages, and export
                  it as a brief in PDF, DOCX or HTML.
                </p>
              </div>
            </motion.div>
          </div>

          {/* rail */}
          <div ref={railRef} className="relative pl-14 md:pl-16">
            <div className={`absolute left-[26px] md:left-[30px] top-2 bottom-2 w-px ${dark ? 'bg-white/12' : 'bg-ink-blue/12'}`}>
              <motion.div
                style={{ height: railHeight }}
                className="w-full bg-gradient-to-b from-verdict via-brass to-dissent"
              />
            </div>

            <div className="space-y-9 md:space-y-11">
              {HEARING_STAGES.map((s) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <div className={`absolute -left-14 md:-left-16 top-0 w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-xl flex items-center justify-center border ${dark ? 'bg-ink border-brass/40 text-brass' : 'bg-parchment border-brass/40 text-brass'}`}>
                    <s.icon size={22} />
                  </div>
                  <p className={`docket-label text-[10px] mb-1.5 ${faint}`}>{s.n} · {s.tag}</p>
                  <h3 className="font-display text-xl md:text-2xl mb-2">{s.title}</h3>
                  <p className={`text-sm leading-relaxed ${muted}`}>{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ Capabilities — bento ══════════ */}
      <section id="features-section" className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${panel}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>What&rsquo;s on the record</p>
            <h2 className="font-display text-4xl md:text-5xl">Built like a practitioner&rsquo;s tool.</h2>
          </motion.div>

          <motion.div
            ref={bentoRef}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate={controls}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-5"
          >
            {CAPABILITIES.map((f) => (
              <motion.div
                key={f.title}
                variants={{ hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5 } } }}
                className={`relative overflow-hidden rounded-2xl p-6 md:p-7 border transition-all duration-300 hover:-translate-y-1 ${f.span} ${f.big ? 'flex flex-col' : ''} ${dark ? 'bg-white/[0.03] border-white/10 hover:border-brass/40' : 'bg-white border-ink-blue/10 shadow-sm hover:border-brass/40'}`}
              >
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                  <f.icon size={f.big ? 24 : 19} />
                </div>
                <span className={`docket-label absolute top-6 right-6 text-[9.5px] ${faint}`}>{f.tag}</span>
                <h3 className={`relative font-display ${f.big ? 'text-2xl md:text-[28px] leading-tight' : 'text-lg'} mb-2.5`}>{f.title}</h3>
                <p className={`relative text-[13px] leading-relaxed ${muted} ${f.big ? 'max-w-md' : ''}`}>{f.body}</p>
                {f.points && (
                  <ul className="relative mt-5 pt-5 space-y-2.5 border-t border-line/10">
                    {f.points.map((p) => (
                      <li key={p} className={`flex items-start gap-2.5 text-[13px] ${muted}`}>
                        <Check size={14} className="text-verdict shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
                {f.chips && (
                  <div className="relative flex flex-wrap gap-2 mt-5">
                    {f.chips.map((c) => (
                      <span key={c} className={`text-[12px] px-2.5 py-1 rounded-full ${dark ? 'bg-white/[0.06] text-gray-300' : 'bg-ink-blue/[0.06] text-ink-blue/75'}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════ Trust boundary ══════════ */}
      <section className="py-16 md:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-16 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>The spine of the system</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4 max-w-3xl mx-auto">A citation the model can&rsquo;t point to never reaches you.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              The trust direction is inverted. Persuading the model is easy and
              doesn&rsquo;t matter — the authority still has to exist in the record
              that was actually retrieved.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {BOUNDARY.map((b, i) => {
              const toneText = b.tone === 'verdict' ? 'text-verdict' : b.tone === 'dissent' ? 'text-dissent' : 'text-brass';
              const toneBorder = b.tone === 'verdict' ? 'border-verdict/40' : b.tone === 'dissent' ? 'border-dissent/40' : 'border-brass/40';
              return (
                <motion.div
                  key={b.label}
                  {...fadeUp(i * 0.08)}
                  className={`rounded-xl p-5 md:p-6 border border-l-2 ${toneBorder} ${cardBase}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${dark ? 'bg-white/5' : 'bg-ink-blue/5'} ${toneText}`}>
                    <b.icon size={18} />
                  </div>
                  <p className={`docket-label text-[10px] mb-2 ${toneText}`}>{b.label}</p>
                  <p className={`text-[13px] leading-relaxed ${muted}`}>{b.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ Grounded specimens ══════════ */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${panel}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Evidentiary basis</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4">Every argument cites something real.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              Not a paraphrase of the law — the actual record it was pulled from,
              with its statutory counterpart and its treatment attached.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {SPECIMENS.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp(i * 0.1)}
                className={`rounded-xl p-6 md:p-7 border ${cardBase}`}
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <s.icon size={16} className="text-brass" />
                  <p className="docket-label text-[10.5px] text-brass">{s.kind}</p>
                </div>
                <h3 className="font-display text-xl md:text-[22px] mb-1 leading-snug">{s.title}</h3>
                <p className={`text-xs font-mono mb-5 ${faint}`}>{s.sub}</p>

                {s.rows && (
                  <div className="grid grid-cols-3 gap-3 docket-rule pt-4">
                    {s.rows.map(([k, v]) => (
                      <div key={k}>
                        <p className={`font-mono text-[9.5px] uppercase tracking-wide mb-1 ${faint}`}>{k}</p>
                        <p className="text-sm font-medium">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
                {s.treatment && (
                  <div className="docket-rule pt-4 flex items-center gap-2">
                    <BadgeCheck size={15} className="text-verdict shrink-0" />
                    <p className="text-[12.5px] font-medium text-verdict">{s.treatment}</p>
                  </div>
                )}
                {s.chips && (
                  <div className="flex flex-wrap gap-2 docket-rule pt-4">
                    {s.chips.map((c) => (
                      <span key={c} className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${dark ? 'bg-brass/10 text-brass/90' : 'bg-ink-blue/5 text-ink-blue/80'}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <p className={`text-center font-mono text-[11px] mt-6 ${faint}`}>
            Representative examples — real specimens are retrieved fresh for your case.
          </p>
        </div>
      </section>

      {/* ══════════ Architecture ══════════ */}
      <section className="py-16 md:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="mb-12 md:mb-16 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Self-hosted by design</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4">One external call.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              The whole stack runs from a single <span className="font-mono text-[13px]">docker&nbsp;compose&nbsp;up</span>.
              Gemini is the only account you need — and even the embeddings can move
              in-house.
            </p>
          </motion.div>

          <div className="space-y-3">
            {ARCHITECTURE.map((a, i) => (
              <motion.div
                key={a.name}
                {...fadeUp(i * 0.06)}
                className={`flex items-center gap-4 rounded-xl p-4 md:p-5 border ${cardBase}`}
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                  <a.icon size={19} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className={`text-[12.5px] ${muted}`}>{a.note}</p>
                </div>
                {a.name === 'Google Gemini' && (
                  <span className="ml-auto docket-label text-[9px] text-brass border border-brass/40 rounded-full px-2 py-0.5 shrink-0">External</span>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.1)} className="mt-8">
            <p className={`docket-label text-[10px] mb-3 ${faint}`}>Opt-in profiles — off until you ask</p>
            <div className="flex flex-wrap gap-2.5">
              {PROFILES.map((p) => (
                <span key={p} className={`inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full border ${dark ? 'border-white/10 text-gray-300' : 'border-ink-blue/12 text-ink-blue/75'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-brass" />
                  {p}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${panel}`}>
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Before you file</p>
            <h2 className="font-display text-4xl md:text-5xl">Questions worth asking.</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {FAQS.map((f, i) => (
              <motion.div
                key={f.q}
                {...fadeUp(i * 0.06)}
                className={`p-6 rounded-lg border-l-2 border-brass/40 ${dark ? 'bg-white/[0.03]' : 'bg-parchment/60'}`}
              >
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{f.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 md:py-36 px-4 sm:px-6 md:px-10 relative overflow-hidden bg-ink-blue">
        <motion.div
          className="absolute -top-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-verdict/25 blur-[110px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-20 w-[32rem] h-[32rem] rounded-full bg-dissent/25 blur-[110px]"
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center relative z-10 text-white"
        >
          <p className="docket-label text-xs text-brass mb-5">Adversarial legal intelligence</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-5 leading-tight">Ready to file?</h2>
          <p className="text-base md:text-xl text-blue-100/70 mb-10">
            Submit your first matter and watch both sides argue it — live, grounded,
            and saved to your record.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-4 px-10 rounded-full text-base md:text-lg shadow-[0_0_60px_-10px_rgba(199,160,70,0.8)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Create your account
            <ArrowRight size={18} />
          </button>
          <p className="font-mono text-[11px] mt-6 text-blue-100/40">
            Not legal advice · a research and drafting aid
          </p>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
