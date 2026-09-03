import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import themeStore from '../store/themeStore';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Scale, Search, ShieldCheck, History, FileText, MessagesSquare, ArrowRight,
} from 'lucide-react';

const EXHIBITS = [
  {
    id: '01',
    icon: MessagesSquare,
    title: 'AI-simulated debate',
    body: 'Two AI counsel argue your case live, in real time, over Socket.IO — one for, one against.',
  },
  {
    id: '02',
    icon: Search,
    title: 'Precedent & IPC search',
    body: 'Semantic search over case law and IPC sections grounds every argument in something citable.',
  },
  {
    id: '03',
    icon: ShieldCheck,
    title: 'Evidence guidance',
    body: 'Typical evidence for the relevant IPC section is surfaced alongside the arguments.',
  },
  {
    id: '04',
    icon: History,
    title: 'Case history',
    body: 'Every debate is saved to your dashboard — round by round, ready to revisit.',
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

        <div className="w-full max-w-5xl mx-auto relative z-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`docket-label text-xs mb-5 ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}
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
            className={`text-base sm:text-lg max-w-2xl mx-auto mb-12 ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}
          >
            Submit a case. Watch it argued from both sides — grounded in IPC sections and precedent, not just opinion.
          </motion.p>

          {/* Exhibit A / Exhibit B live argument preview */}
          <div className="grid sm:grid-cols-2 gap-4 md:gap-5 text-left max-w-3xl mx-auto mb-10">
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
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 md:mb-14"
          >
            <p className={`docket-label text-xs mb-3 ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}>Docket · Capabilities</p>
            <h2 className="font-display text-3xl md:text-4xl">What's on the record.</h2>
          </motion.div>

          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            {EXHIBITS.map((f, i) => (
              <motion.div
                key={f.id}
                variants={itemVariants}
                className={`flex items-start gap-5 md:gap-8 py-6 md:py-7 ${i !== 0 ? 'docket-rule' : ''}`}
              >
                <span className={`font-mono text-xs pt-1 flex-shrink-0 w-8 ${dark ? 'text-gray-600' : 'text-ink-blue/35'}`}>
                  {f.id}
                </span>
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                  <f.icon size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                  <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>{f.body}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="py-16 md:py-24 px-4 sm:px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10 md:mb-14 text-center"
          >
            <p className={`docket-label text-xs mb-3 ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}>Procedure</p>
            <h2 className="font-display text-3xl md:text-4xl">How a debate unfolds.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                <span className="font-display text-5xl text-brass/30 leading-none">{s.n}</span>
                <h3 className="font-semibold text-lg mt-3 mb-2">{s.title}</h3>
                <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="py-16 md:py-24 px-4 sm:px-6 md:px-10 relative overflow-hidden bg-ink-blue">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-verdict/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-dissent/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center relative z-10 text-white"
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
