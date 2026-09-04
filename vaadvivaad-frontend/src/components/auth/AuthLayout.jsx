import { motion } from "framer-motion";
import { Scale, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import themeStore from "../../store/themeStore";
import logo from "../../assets/nyayavada_logo.png";

const FEATURES = [
  {
    icon: Scale,
    title: "AI-Simulated Debates",
    desc: "Watch supporting and opposing counsel argue your case in real time.",
  },
  {
    icon: Search,
    title: "Instant Case Law Search",
    desc: "Semantic search across precedents, IPC sections and evidence types.",
  },
  {
    icon: ShieldCheck,
    title: "Structured & Auditable",
    desc: "Every debate round is saved to your case history for later review.",
  },
];

const Orb = ({ className, delay = 0, duration = 10 }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl ${className}`}
    animate={{
      scale: [1, 1.15, 1],
      opacity: [0.35, 0.55, 0.35],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }) {
  const { theme } = themeStore((state) => state);
  const dark = theme === "dark";

  return (
    <div
      className={`min-h-screen w-full grid lg:grid-cols-2 pt-16 md:pt-20 lg:pt-0 transition-colors ${
        dark ? "bg-ink" : "bg-parchment"
      }`}
    >
      {/* Left: brand / storytelling panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-ink via-[#1B2A4A] to-black px-12 xl:px-16 py-16 pt-28">
        {/* animated decorative orbs */}
        <Orb className="w-96 h-96 bg-[#C7A046]/30 -top-24 -left-24" duration={12} />
        <Orb className="w-80 h-80 bg-[#3E8E63]/30 bottom-0 -right-16" delay={2} duration={14} />
        <Orb className="w-64 h-64 bg-[#C7A046]/10 top-1/3 right-1/4" delay={4} duration={9} />

        {/* dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logo} alt="VaadVivaad" className="h-11 w-auto" />
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-16 max-w-md"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-medium text-[#DBB968] backdrop-blur-sm">
              <Sparkles size={13} />
              AI-Powered Legal Analysis
            </span>
            <h1 className="mt-5 text-3xl xl:text-4xl font-display font-bold text-white leading-tight">
              Where arguments meet{" "}
              <span className="text-[#C7A046]">intelligence</span>.
            </h1>
            <p className="mt-4 text-sm xl:text-base text-blue-100/70 leading-relaxed">
              Submit a case, and let an AI courtroom simulate the debate —
              backed by real precedent search and IPC section analysis.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative z-10 space-y-4"
        >
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#C7A046]/15 text-[#C7A046]">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-blue-100/60 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: form panel */}
      <div
        className={`relative flex flex-col justify-center items-center px-4 sm:px-6 py-10 lg:py-16 ${
          dark ? "bg-ink" : "bg-parchment"
        }`}
      >
        {/* subtle background accent, visible on mobile too where left panel is hidden */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#1B2A4A]/90 to-transparent lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm sm:max-w-md"
        >
          <div className="lg:hidden flex justify-center mb-6">
            <div className="rounded-full p-3 bg-white shadow-lg">
              <Scale className="text-[#C7A046]" size={26} />
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C7A046] mb-2">
                {eyebrow}
              </p>
            )}
            <h2
              className={`text-2xl sm:text-3xl font-display font-bold ${
                dark ? "text-white" : "text-ink-blue"
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p className={`mt-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {subtitle}
              </p>
            )}
          </div>

          <div
            className={`rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-colors ${
              dark
                ? "bg-white/[0.03] border-white/10 shadow-black/40"
                : "bg-white/80 border-white/60 shadow-gray-200/60"
            }`}
          >
            {children}
          </div>

          {footer && <div className="mt-6 text-center">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
