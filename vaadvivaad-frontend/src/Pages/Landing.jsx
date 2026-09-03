import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import themeStore from '../store/themeStore';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Scale, Search, ShieldCheck, History, MessagesSquare, ArrowRight,
  Sparkles, Database, Radio, Archive, Gavel, Landmark, ClipboardList,
} from 'lucide-react';

const EXHIBITS = [
  {
    id: '01',
    icon: MessagesSquare,
    title: 'AI-simulated debate',
    body: 'Two AI counsel argue your case live, in real time, over Socket.IO — one for, one against.',
    tag: 'Real-time',
  },
  {
    id: '02',
    icon: Search,
    title: 'Precedent & IPC search',
    body: 'Semantic search over case law and IPC sections grounds every argument in something citable.',
    tag: 'Semantic search',
  },
  {
    id: '03',
    icon: ShieldCheck,
    title: 'Evidence guidance',
    body: 'Typical evidence for the relevant IPC section is surfaced alongside the arguments.',
    tag: 'Auto-surfaced',
  },
  {
    id: '04',
    icon: History,
    title: 'Case history',
    body: 'Every debate is saved to your dashboard — round by round, ready to revisit.',
    tag: 'Persistent',
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

const STACK = [
  { icon: Sparkles, name: 'Gemini', body: 'Drafts every argument and computes the embeddings behind search.' },
  { icon: Database, name: 'Qdrant', body: 'Self-hosted vector search over case law, IPC sections and evidence.' },
  { icon: Radio, name: 'Socket.IO', body: 'Streams each round of the debate to you live, not in one batch.' },
  { icon: Archive, name: 'MongoDB', body: 'Keeps your case history private and tied to your account.' },
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
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'}`}>
      {/* ---------- Hero ---------- */}
      <section className="pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-24 px-4 sm:px-6 md:px-10 lg:px-20 relative overflow-hidden">
        {/* faint dot-grid texture, matches auth pages */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${dark ? '#fff' : '#1B2A4A'} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-7xl mx-auto relative z-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`docket-label text-xs mb-5 ${faint}`}
          >
            In the matter of — an AI-adjudicated debate
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] mb-5"
          >
            Where arguments meet <span className="text-brass">intelligence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`text-base sm:text-lg max-w-2xl mx-auto mb-12 ${muted}`}
          >
            Submit a case. Watch it argued from both sides — grounded in IPC sections and precedent, not just opinion.
          </motion.p>

          {/* Exhibit A / Exhibit B live argument preview */}
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5 text-left max-w-4xl mx-auto mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className={`rounded-lg p-5 border-t-2 border-verdict ${dark ? 'bg-white/[0.03] border-x border-b border-white/10' : 'bg-white border-x border-b border-ink-blue/10'}`}
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
              className={`rounded-lg p-5 border-t-2 border-dissent ${dark ? 'bg-white/[0.03] border-x border-b border-white/10' : 'bg-white border-x border-b border-ink-blue/10'}`}
            >
              <p className="docket-label text-[11px] text-dissent mb-2.5">Exhibit B · Against</p>
              <p className={`text-sm leading-relaxed ${dark ? 'text-gray-300' : 'text-ink-blue/75'}`}>
                "The three-day gap between the alleged insult and the act defeats 'suddenness' entirely — this was premeditation, not provocation."
              </p>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className={`font-mono text-[11px] mb-8 ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}
          >
            Sample exchange — every real debate is generated fresh for your case.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/signup')}
              className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-3.5 px-7 rounded-full shadow-lg transition-colors hover:bg-brass/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              File your case
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ---------- Features: docket ledger ---------- */}
      <section id="features-section" className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Docket · Capabilities</p>
            <h2 className="font-display text-3xl md:text-4xl">What's on the record.</h2>
          </motion.div>

          <motion.div ref={ref} variants={containerVariants} initial="hidden" animate={controls}>
            {EXHIBITS.map((f, i) => (
              <motion.div
                key={f.id}
                variants={itemVariants}
                className={`flex items-center gap-5 md:gap-8 py-6 md:py-7 ${i !== 0 ? 'docket-rule' : ''}`}
              >
                <span className={`font-mono text-xs flex-shrink-0 w-8 ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}>
                  {f.id}
                </span>
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                  <f.icon size={18} />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                  <p className={`text-sm leading-relaxed max-w-xl ${muted}`}>{f.body}</p>
                </div>
                <span className={`docket-label hidden md:block text-[10px] flex-shrink-0 ${faint}`}>
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
            <h2 className="font-display text-3xl md:text-4xl mb-4">Every argument cites something real.</h2>
            <p className={`max-w-2xl mx-auto text-sm md:text-base ${muted}`}>
              Not a paraphrase of the law — the actual record it was pulled from.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {/* IPC specimen */}
            <motion.div
              {...fadeUp(0.05)}
              className={`rounded-xl p-6 md:p-7 border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
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
              className={`rounded-xl p-6 md:p-7 border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
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
                    className="h-full bg-brass rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Evidence specimen */}
            <motion.div
              {...fadeUp(0.25)}
              className={`rounded-xl p-6 md:p-7 border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
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
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-14 md:mb-16 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Procedure</p>
            <h2 className="font-display text-3xl md:text-4xl">How a debate unfolds.</h2>
          </motion.div>

          <div className="relative grid md:grid-cols-3 gap-10 md:gap-6">
            {/* connecting line, desktop only */}
            <div className={`hidden md:block absolute top-6 left-0 right-0 h-px ${dark ? 'bg-white/10' : 'bg-ink-blue/10'}`}>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                style={{ originX: 0 }}
                className="h-full bg-brass"
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
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-display text-lg mb-4 ${dark ? 'bg-ink border border-brass/40 text-brass' : 'bg-parchment border border-brass/40 text-brass'}`}>
                  {s.n}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className={`text-sm leading-relaxed ${muted}`}>{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Built on: tech stack strip ---------- */}
      <section className="py-16 md:py-20 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-12 text-center">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Under the hood</p>
            <h2 className="font-display text-3xl md:text-4xl">No black box.</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {STACK.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`rounded-lg p-5 border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10'}`}
              >
                <t.icon size={18} className="text-brass mb-3" />
                <h3 className="font-semibold text-sm mb-1.5">{t.name}</h3>
                <p className={`text-xs leading-relaxed ${muted}`}>{t.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className={`py-16 md:py-24 px-4 sm:px-6 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp()} className="mb-10 md:mb-14">
            <p className={`docket-label text-xs mb-3 ${faint}`}>Before you file</p>
            <h2 className="font-display text-3xl md:text-4xl">Questions worth asking.</h2>
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
      <section className="py-20 md:py-28 px-4 sm:px-6 md:px-10 relative overflow-hidden bg-ink-blue">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-verdict/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-dissent/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="hidden md:flex absolute top-10 right-10 lg:right-24 w-24 h-24 rounded-full border-2 border-brass/40 items-center justify-center text-center"
        >
          <span className="font-mono text-[8px] tracking-widest text-brass/70 leading-tight px-2">
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
          <h2 className="font-display text-3xl md:text-4xl mb-4">Ready to file?</h2>
          <p className="text-base md:text-lg text-blue-100/70 mb-8">
            Submit your first case and see both sides argued in minutes.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-3.5 px-8 rounded-full shadow-lg transition-colors hover:bg-brass/90"
          >
            Create your account
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
