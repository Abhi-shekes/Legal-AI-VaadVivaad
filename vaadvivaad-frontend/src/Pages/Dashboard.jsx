import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Plus, Search, FileStack, CalendarClock, Clock3,
  ArrowRight, MessagesSquare, ShieldCheck,
} from "lucide-react"
import RecentCasesList from "../components/RecentCasesList"
import AppHeader from "../components/AppHeader"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import useLogout from "../hooks/useLogout"
import axios from "axios"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
})

const STEPS = [
  { n: "1", icon: FileStack, title: "File your case", body: "Describe the incident and evidence." },
  { n: "2", icon: Search, title: "The record is searched", body: "IPC sections and precedent are pulled in." },
  { n: "3", icon: MessagesSquare, title: "Watch it argued", body: "Both sides exchange rounds live." },
]

export default function Dashboard() {
  const { user } = useAuthStore()
  const { theme, changeTheme } = themeStore((state) => state)
  const dark = theme === "dark"

  const [recentCases, setRecentCases] = useState([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [query, setQuery] = useState("")

  const navigate = useNavigate()
  const apiUrl = import.meta.env.VITE_API_URL

  useEffect(() => {
    const fetchRecentCases = async () => {
      try {
        const response = await axios.get(`${apiUrl}/user/debate`, { withCredentials: true })
        if (response.data.status === "success") {
          setRecentCases(response.data.data)
        }
      } catch (error) {
        console.error("Error fetching recent cases:", error)
      } finally {
        setLoadingCases(false)
      }
    }
    fetchRecentCases()
  }, [apiUrl])

  const handleLogout = useLogout()

  // Real, honest stats derived from what the API actually returns --
  // no fabricated "success rate" with nothing behind it.
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = recentCases.filter((c) => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const latest = [...recentCases].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return { total: recentCases.length, thisMonth, latest }
  }, [recentCases])

  const filteredCases = useMemo(() => {
    if (!query.trim()) return recentCases
    const q = query.toLowerCase()
    return recentCases.filter((c) => (c.title || "").toLowerCase().includes(q))
  }, [recentCases, query])

  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const faint = dark ? "text-gray-500" : "text-ink-blue/50"
  const displayName = user?.name || user?.email || "there"
  const firstName = user?.name ? user.name.split(" ")[0] : displayName

  return (
    <div className={`min-h-screen ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
      <AppHeader
        dark={dark}
        changeTheme={changeTheme}
        user={user}
        onLogout={handleLogout}
        center={
          <div className="relative">
            <Search size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${faint}`} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your cases…"
              className={`w-full pl-10 pr-4 py-2 rounded-full text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-brass ${dark
                ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                : "bg-white border-ink-blue/10 text-ink-blue placeholder:text-ink-blue/30"
                }`}
            />
          </div>
        }
      />

      {/* Welcome band -- full width, aurora glow, matches Landing's hero/CTA treatment */}
      <section className="relative overflow-hidden bg-ink-blue px-4 sm:px-6 md:px-10 py-14 md:py-20">
        <motion.div
          className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-brass/20 blur-[110px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-0 w-[28rem] h-[28rem] rounded-full bg-verdict/20 blur-[110px]"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <motion.div {...fadeUp()}>
            <p className="docket-label text-xs text-brass mb-3">Your docket</p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white mb-3">
              Welcome back, <span className="text-brass">{firstName}</span>.
            </h1>
            <p className="text-blue-100/70 text-sm md:text-base max-w-xl">
              Every case gets argued from both sides. Pick up where you left off, or file a new one.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/user/case")}
              className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-3.5 px-7 rounded-full text-sm md:text-base shadow-[0_0_40px_-8px_rgba(199,160,70,0.7)] transition-colors hover:bg-brass/90"
            >
              <Plus size={18} />
              File a new case
            </motion.button>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14">
        {/* Real stats -- nothing fabricated */}
        <motion.div {...fadeUp(0.05)} className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-10 md:mb-12">
          {[
            { icon: FileStack, label: "Total cases", value: stats.total },
            { icon: CalendarClock, label: "This month", value: stats.thisMonth },
            {
              icon: Clock3,
              label: "Latest case",
              value: stats.latest ? new Date(stats.latest.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`group rounded-xl p-5 md:p-7 border transition-all duration-300 hover:-translate-y-0.5 ${dark
                ? "bg-white/[0.03] border-white/10 hover:border-brass/40 hover:shadow-[0_0_40px_-15px_rgba(199,160,70,0.4)]"
                : "bg-white border-ink-blue/10 shadow-sm hover:border-brass/40 hover:shadow-[0_0_40px_-15px_rgba(199,160,70,0.3)]"
                }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${dark ? "bg-brass/10 text-brass" : "bg-ink-blue/5 text-ink-blue"}`}>
                <s.icon size={18} />
              </div>
              <p className="font-display text-3xl md:text-4xl mb-1">{s.value}</p>
              <p className={`docket-label text-[10px] ${faint}`}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Two-column: case ledger + sidebar */}
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Recent cases */}
          <motion.div
            {...fadeUp(0.1)}
            className={`lg:col-span-2 rounded-xl border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}
          >
            <div className={`px-5 md:px-7 py-5 border-b flex items-center justify-between ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
              <h2 className="font-display text-xl">On the record</h2>
              <span className={`font-mono text-[11px] ${faint}`}>{filteredCases.length} case{filteredCases.length === 1 ? "" : "s"}</span>
            </div>
            <div className="px-5 md:px-7">
              <RecentCasesList cases={filteredCases} loading={loadingCases} dark={dark} hasQuery={!!query.trim()} />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div {...fadeUp(0.15)} className="space-y-6">
            {/* File a new case */}
            <div className={`relative overflow-hidden rounded-xl border p-6 ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
              <ShieldCheck size={120} strokeWidth={1} className={`absolute -bottom-8 -right-8 pointer-events-none ${dark ? "text-white/[0.04]" : "text-ink-blue/[0.04]"}`} />
              <p className="docket-label text-[11px] text-brass mb-2 relative">Ready when you are</p>
              <h3 className="font-display text-xl mb-2 relative">File a new case</h3>
              <p className={`text-sm leading-relaxed mb-5 relative ${muted}`}>
                Submit an incident and evidence — grounded arguments, argued from both sides, in minutes.
              </p>
              <Link
                to="/user/case"
                className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-brass hover:underline"
              >
                Get started
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* How it works, compact */}
            <div className={`rounded-xl border p-6 ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}>
              <p className={`docket-label text-[11px] mb-4 ${faint}`}>How it works</p>
              <div className="space-y-4">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center font-mono text-[11px] border border-brass/40 text-brass`}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className={`text-xs mt-0.5 ${muted}`}>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
