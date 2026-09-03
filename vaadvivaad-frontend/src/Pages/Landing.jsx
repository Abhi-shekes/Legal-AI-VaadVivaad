import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import themeStore from '../store/themeStore';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Search, ShieldCheck, History, MessagesSquare, ArrowRight,
  Sparkles, Radio, Archive, Gavel, Landmark, ClipboardList, FileText, Swords, Zap,
} from 'lucide-react';

const EXHIBITS = [
  {
    id: '01',
    icon: MessagesSquare,
    title: 'AI-simulated debate',
    body: 'Two AI counsel argue your case live, in real time — one for, one against. No canned responses, no scripted flow.',
    tag: 'Real-time',
    big: true,
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    id: '02',
    icon: Search,
    title: 'Precedent & IPC search',
    body: 'Semantic vector search over case law and IPC sections grounds every argument in something citable.',
    tag: 'Semantic search',
    span: 'lg:col-span-2 lg:row-span-1',
  },
  {
    id: '03',
    icon: ShieldCheck,
    title: 'Evidence guidance',
    body: 'Typical evidence for the relevant IPC section, auto-surfaced alongside the arguments.',
    tag: 'Auto-surfaced',
    span: 'lg:col-span-1 lg:row-span-1',
  },
  {
    id: '04',
    icon: History,
    title: 'Case history',
    body: 'Every debate persisted to your dashboard — round by round, ready to revisit.',
    tag: 'Persistent',
    span: 'lg:col-span-1 lg:row-span-1',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'File your case',
    body: 'Describe the incident and the evidence you have. No formatting required.',
  },
  {
    n: '2',
    title: 'The record is searched',
    body: 'Relevant IPC sections and precedent are pulled in to ground the debate.',
  },
  {
    n: '3',
    title: 'Watch it argued',
    body: 'Supporting and opposing counsel exchange rounds live — saved to your case history.',
  },
];

const PIPELINE = [
  {
    stage: '01',
    tag: 'Intake',
    icon: FileText,
    title: 'Case intake',
    body: 'Incident and evidence normalized into a structured prompt.',
  },
  {
    stage: '02',
    tag: 'Gemini',
    icon: Sparkles,
    title: 'Prompt refinement',
    body: 'Classified and rewritten into a retrieval-ready query.',
  },
  {
    stage: '03',
    tag: 'Qdrant',
    icon: Search,
    title: 'Semantic retrieval',
    body: 'Embedded and matched against case law, IPC sections and evidence corpora.',
  },
  {
    stage: '04',
    tag: 'Gemini',
    icon: Swords,
    title: 'Adversarial synthesis',
    body: 'Supporting and opposing counsel drafted from the retrieved context.',
  },
  {
    stage: '05',
    tag: 'Socket.IO',
    icon: Radio,
    title: 'Real-time transport',
    body: 'Every round streamed the moment it\'s generated, not batched.',
  },
  {
    stage: '06',
    tag: 'MongoDB',
    icon: Archive,
    title: 'Case ledger',
    body: 'The full exchange committed to your private history.',
  },
];

const STATS = [
  { value: '2', label: 'AI counsel, one live exchange' },
  { value: '6', label: 'Stage retrieval-augmented pipeline' },
  { value: 'LIVE', label: 'Every round streamed, never batched' },
];

const MARQUEE_ITEMS = [
  'GEMINI', 'QDRANT VECTOR SEARCH', 'SOCKET.IO', 'MONGODB', 'RETRIEVAL-AUGMENTED GENERATION', 'ADVERSARIAL AI', 'REAL-TIME STREAMING',
];

const FAQS = [
  {
    q: 'Is this legal advice?',
    a: "No. VaadVivaad simulates how a case might be argued — it's a research and drafting aid, not a substitute for a licensed advocate.",
  },
  {
    q: 'What actually grounds the arguments?',
    a: 'IPC sections and precedent pulled in via semantic search, plus the model’s own reasoning — every debate cites something searchable, not just opinion.',
  },
  {
    q: 'Is my case data private?',
    a: 'Your submissions and debate history are tied to your account and never shared publicly.',
  },
  {
    q: 'Which jurisdiction does this cover?',
    a: "Indian Penal Code sections and Indian case law — it isn't built for other legal systems.",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, delay },
});

const Landing = () => {
  const navigate = useNavigate();
  const { theme } = themeStore((state) => state);
  const dark = theme === 'dark';

  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };
  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const muted = dark ? 'text-gray-400' : 'text-ink-blue/60';
  const faint = dark ? 'text-gray-500' : 'text-ink-blue/50';

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden ${dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'}`}>
      {/* ---------- Hero ---------- */}
      <section className="pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-20 px-4 sm:px-6 md:px-10 lg:px-20 relative overflow-hidden">
        {/* aurora glow field */}
        <motion.div
          className="absolute -top-32 left-1/4 w-[36rem] h-[36rem] rounded-full bg-brass/25 blur-[120px] pointer-events-none"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 right-1/4 w-[30rem] h-[30rem] rounded-full bg-verdict/20 blur-[110px] pointer-events-none"
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-dissent/15 blur-[100px] pointer-events-none"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        {/* dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${dark ? '#fff' : '#1B2A4A'} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 border ${dark ? 'border-brass/30 bg-brass/[0.06]' : 'border-brass/30 bg-brass/[0.08]'}`}
          >
            <Zap size={12} className="text-brass" />
            <span className="docket-label text-[10px] sm:text-[11px] text-brass">
              AI-native · Real-time · Retrieval-augmented
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] mb-6 tracking-tight"
          >
            Where arguments meet
            <br />
            <span className="gradient-text">intelligence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-12 ${muted}`}
          >
            Submit a case. Watch a next-gen AI courtroom argue it from both sides —
            grounded in IPC sections and precedent, not just opinion.
          </motion.p>

          {/* Exhibit A / Exhibit B live argument preview */}
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5 text-left max-w-4xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className={`rounded-xl p-5 md:p-6 border-t-2 border-verdict shadow-[0_0_40px_-12px_rgba(62,142,99,0.5)] ${dark ? 'bg-white/[0.04] border-x border-b border-white/10' : 'bg-white border-x border-b border-ink-blue/10'}`}
            >
              <p className="docket-label text-[11px] text-verdict mb-2.5">Exhibit A · For</p>
              <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-ink-blue/75'}`}>
                "The accused acted under grave and sudden provocation — Section 300 Exception 1 squarely applies, reducing the charge from murder to culpable homicide."
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className={`rounded-xl p-5 md:p-6 border-t-2 border-dissent shadow-[0_0_40px_-12px_rgba(166,61,61,0.5)] ${dark ? 'bg-white/[0.04] border-x border-b border-white/10' : 'bg-white border-x border-b border-ink-blue/10'}`}
            >
              <p className="docket-label text-[11px] text-dissent mb-2.5">Exhibit B · Against</p>
              <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-ink-blue/75'}`}>
                "The three-day gap between the alleged insult and the act defeats 'suddenness' entirely — this was premeditation, not provocation."
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="mb-14"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="relative inline-flex items-center gap-2 bg-brass text-ink font-semibold py-4 px-9 rounded-full text-base shadow-[0_0_50px_-8px_rgba(199,160,70,0.7)] transition-colors hover:bg-brass/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              File your case
              <ArrowRight size={18} />
            </motion.button>
            <p className={`font-mono text-[11px] mt-4 ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}>
              Sample exchange above — every real debate is generated fresh for your case.
            </p>
          </motion.div>

          {/* Big stat row */}
          <motion.div
            {...fadeUp(0.1)}
            className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto docket-rule pt-10"
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display gradient-text text-4xl sm:text-5xl md:text-6xl mb-2 leading-none">
                  {s.value}
                </p>
                <p className={`text-[11px] sm:text-xs leading-snug ${muted}`}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- Marquee ---------- */}
      <div className={`relative py-4 overflow-hidden border-y ${dark ? 'bg-white/[0.02] border-white/10' : 'bg-ink-blue border-ink-blue'}`}>
        <div className="flex whitespace-nowrap animate-marquee">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center font-mono text-xs tracking-widest text-white/50 mx-6">
              {item}
              <span className="text-brass mx-6">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- Features: bento grid ---------- */}
      <section id="features-section" className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Core capabilities</p>
            <h2 className="font-display text-4xl md:text-5xl">What's on the record.</h2>
          </motion.div>

          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={controls}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-5"
          >
            {EXHIBITS.map((f) => (
              <motion.div
                key={f.id}
                variants={itemVariants}
                className={`relative overflow-hidden rounded-2xl p-6 md:p-8 border transition-all duration-300 hover:-translate-y-1 ${f.span} ${dark
                  ? 'bg-white/[0.03] border-white/10 hover:border-brass/40 hover:shadow-[0_0_50px_-15px_rgba(199,160,70,0.4)]'
                  : 'bg-white border-ink-blue/10 shadow-sm hover:border-brass/40 hover:shadow-[0_0_50px_-15px_rgba(199,160,70,0.3)]'
                }`}
              >
                {f.big && (
                  <f.icon
                    size={260}
                    strokeWidth={1}
                    className={`absolute -bottom-12 -right-12 pointer-events-none ${dark ? 'text-white/[0.04]' : 'text-ink-blue/[0.04]'}`}
                  />
                )}
                <span className={`font-mono text-xs ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}>{f.id}</span>
                <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mt-4 mb-5 ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                  <f.icon size={f.big ? 26 : 20} />
                </div>
                <h3 className={`relative font-display ${f.big ? 'text-2xl md:text-3xl' : 'text-xl'} mb-3`}>{f.title}</h3>
                <p className={`relative text-sm leading-relaxed ${muted} ${f.big ? 'max-w-sm' : ''}`}>{f.body}</p>
                {f.big && (
                  <div className="relative flex items-center gap-2 mt-8">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verdict opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-verdict" />
                    </span>
                    <span className="docket-label text-[10px] text-verdict">Live now</span>
                  </div>
                )}
                <span className={`docket-label absolute top-6 right-6 md:top-8 md:right-8 text-[10px] ${faint}`}>
                  {f.tag}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- Grounded in the record: IPC + precedent specimens ---------- */}
      <section className="py-16 md:py-24 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Evidentiary basis</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4">Every argument cites something real.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              Not a paraphrase of the law — the actual record it was pulled from.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {/* IPC specimen */}
            <motion.div
              {...fadeUp(0.05)}
              className={`rounded-xl p-6 md:p-7 border transition-shadow hover:shadow-[0_0_40px_-15px_rgba(199,160,70,0.5)] ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <Gavel size={16} className="text-brass" />
                <p className="docket-label text-[11px] text-brass">IPC specimen</p>
              </div>
              <h3 className="font-display text-2xl mb-1">Section 300 — Murder</h3>
              <p className={`text-xs font-mono mb-5 ${faint}`}>Exception 1 · Culpable homicide · Mens rea</p>

              <div className="grid grid-cols-3 gap-3 docket-rule pt-4">
                {[['Cognizable', 'Yes'], ['Bailable', 'No'], ['Compoundable', 'No']].map(([k, v]) => (
                  <div key={k}>
                    <p className={`font-mono text-[10px] uppercase tracking-wide mb-1 ${faint}`}>{k}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Precedent specimen */}
            <motion.div
              {...fadeUp(0.15)}
              className={`rounded-xl p-6 md:p-7 border transition-shadow hover:shadow-[0_0_40px_-15px_rgba(62,142,99,0.5)] ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <Landmark size={16} className="text-brass" />
                <p className="docket-label text-[11px] text-brass">Precedent match · Illustrative</p>
              </div>
              <h3 className="font-display text-2xl mb-1">State v. Respondent</h3>
              <p className={`text-xs font-mono mb-5 ${faint}`}>Sessions Court · IPC 300, 304</p>

              <div className="docket-rule pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`font-mono text-[10px] uppercase tracking-wide ${faint}`}>Semantic similarity</p>
                  <p className="text-sm font-medium">82%</p>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-white/10' : 'bg-ink-blue/10'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '82%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-verdict to-brass rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Evidence specimen */}
            <motion.div
              {...fadeUp(0.25)}
              className={`rounded-xl p-6 md:p-7 border transition-shadow hover:shadow-[0_0_40px_-15px_rgba(166,61,61,0.5)] ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <ClipboardList size={16} className="text-brass" />
                <p className="docket-label text-[11px] text-brass">Evidence specimen</p>
              </div>
              <h3 className="font-display text-2xl mb-1">Typical evidence</h3>
              <p className={`text-xs font-mono mb-5 ${faint}`}>IPC 300 · Culpable homicide</p>

              <div className="flex flex-wrap gap-2 docket-rule pt-4">
                {['Eyewitness testimony', 'Forensic report', 'Weapon recovery', 'Medical exam'].map((tag) => (
                  <span
                    key={tag}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${dark ? 'bg-brass/10 text-brass/90' : 'bg-ink-blue/5 text-ink-blue/80'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <p className={`text-center font-mono text-[11px] mt-6 ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}>
            Representative examples — real specimens are pulled fresh from your case.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 overflow-hidden ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-14 md:mb-16 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Procedure</p>
            <h2 className="font-display text-4xl md:text-5xl">How a debate unfolds.</h2>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-14 md:gap-6">
            {/* connecting line, desktop only */}
            <div className={`hidden md:block absolute top-9 left-0 right-0 h-px ${dark ? 'bg-white/10' : 'bg-ink-blue/10'}`}>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                style={{ originX: 0 }}
                className="h-full bg-gradient-to-r from-verdict via-brass to-dissent"
              />
            </div>

            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative"
              >
                <div className={`relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center font-display text-2xl mb-5 border-2 border-brass shadow-[0_0_35px_-8px_rgba(199,160,70,0.6)] ${dark ? 'bg-ink text-brass' : 'bg-parchment text-brass'}`}>
                  {s.n}
                </div>
                <h3 className="font-display text-xl mb-2">{s.title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- System architecture: pipeline flow diagram ---------- */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-6 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>System architecture</p>
            <h2 className="font-display text-4xl md:text-5xl mb-4">No black box.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              A retrieval-augmented, adversarial debate pipeline — every stage inspectable, nothing hidden behind one opaque prompt.
            </p>
          </motion.div>

          <div className="relative mt-14 md:mt-16">
            {/* connecting flow line — single row only from xl up */}
            <div className={`hidden xl:block absolute top-9 left-[6%] right-[6%] h-px ${dark ? 'bg-white/10' : 'bg-ink-blue/10'}`}>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                style={{ originX: 0 }}
                className="h-full bg-gradient-to-r from-verdict via-brass to-dissent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-4 gap-y-10">
              {PIPELINE.map((s, i) => (
                <motion.div
                  key={s.stage}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative flex flex-col items-center text-center px-2"
                >
                  <div className={`relative z-10 w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-4 border shadow-[0_0_30px_-10px_rgba(199,160,70,0.5)] ${dark ? 'bg-ink border-brass/40 text-brass' : 'bg-parchment border-brass/40 text-brass'}`}>
                    <s.icon size={26} />
                  </div>
                  <p className={`font-mono text-[10px] tracking-wide mb-1.5 ${faint}`}>
                    {s.stage} · {s.tag}
                  </p>
                  <h3 className="font-semibold text-sm mb-1.5">{s.title}</h3>
                  <p className={`text-xs leading-relaxed ${muted}`}>{s.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Before you file</p>
            <h2 className="font-display text-4xl md:text-5xl">Questions worth asking.</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {FAQS.map((f, i) => (
              <motion.div
                key={f.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`flex gap-4 p-6 rounded-lg border-l-2 border-brass/40 ${dark ? 'bg-white/[0.03]' : 'bg-parchment/60'}`}
              >
                <span className={`font-display text-xl flex-shrink-0 ${dark ? 'text-gray-600' : 'text-ink-blue/30'}`}>?</span>
                <div>
                  <h3 className="font-semibold mb-1.5">{f.q}</h3>
                  <p className={`text-sm leading-relaxed ${muted}`}>{f.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full bg-brass/15 blur-[100px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex absolute top-14 right-14 lg:right-28 w-28 h-28 rounded-full border-2 border-brass/50 items-center justify-center text-center shadow-[0_0_40px_-8px_rgba(199,160,70,0.6)]"
        >
          <span className="font-mono text-[9px] tracking-widest text-brass/80 leading-tight px-2">
            AI · ADJUDICATED · DEBATE
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center relative z-10 text-white"
        >
          <p className="docket-label text-xs text-brass mb-5">Next-gen legal intelligence</p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-5 leading-tight">Ready to file?</h2>
          <p className="text-base md:text-xl text-blue-100/70 mb-10">
            Submit your first case and see both sides argued — live, in minutes.
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-4 px-10 rounded-full text-base md:text-lg shadow-[0_0_60px_-10px_rgba(199,160,70,0.8)] transition-colors hover:bg-brass/90"
          >
            Create your account
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
