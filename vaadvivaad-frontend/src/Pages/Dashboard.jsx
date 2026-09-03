import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Scale, LogOut, Plus, Search, Sun, Moon, FileStack, CalendarClock, Clock3 } from "lucide-react"
import RecentCasesList from "../components/RecentCasesList"
import useAuthStore from "../store/authStore"
import themeStore from "../store/themeStore"
import axios from "axios"
import logo from "../assets/nyayavada_logo.png"

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
})

export default function Dashboard() {
  const { user, setLogOut } = useAuthStore()
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

  const handleLogout = async () => {
    try {
      const resp = await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true })
      if (resp.data.status === "success") {
        setLogOut()
        navigate("/login")
      }
    } catch (error) {
      console.error("Error logging out:", error)
      setLogOut()
      navigate("/login")
    }
  }

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

  return (
    <div className={`min-h-screen ${dark ? "bg-ink text-white" : "bg-parchment text-ink-blue"}`}>
      {/* Header */}
      <header className={`border-b ${dark ? "border-white/10 bg-ink/90" : "border-ink-blue/10 bg-parchment/90"} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={logo} alt="VaadVivaad" className="h-8 md:h-9 w-auto" />
            <span className="hidden sm:block font-display text-lg leading-none">
              Vaad<span className="text-brass">Vivaad</span>
            </span>
          </Link>

          <div className="flex-1 max-w-md relative hidden sm:block">
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

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button
              onClick={changeTheme}
              className={`p-2 rounded-full transition-colors ${dark ? "text-brass hover:bg-white/10" : "text-ink-blue/70 hover:bg-ink-blue/5"}`}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {user && (
              <div className="hidden md:flex items-center gap-2 pr-2 border-r border-current/10">
                <div className="w-7 h-7 rounded-full bg-brass/15 text-brass flex items-center justify-center font-mono text-xs font-medium">
                  {user.charAt(0).toUpperCase()}
                </div>
                <span className={`text-sm ${muted}`}>{user}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`p-2 rounded-full transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-ink-blue/60 hover:text-ink-blue hover:bg-ink-blue/5"}`}
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 md:py-14">
        <motion.div {...fadeUp()} className="flex items-center justify-between mb-10">
          <div>
            <p className={`docket-label text-xs mb-2 ${faint}`}>Your docket</p>
            <h1 className="font-display text-3xl md:text-4xl">Dashboard</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/user/case")}
            className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-2.5 px-5 rounded-full text-sm shadow-lg transition-colors hover:bg-brass/90"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Case</span>
          </motion.button>
        </motion.div>

        {/* Real stats -- nothing fabricated */}
        <motion.div {...fadeUp(0.05)} className="grid grid-cols-3 gap-3 md:gap-5 mb-10">
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
              className={`rounded-xl p-4 md:p-6 border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}
            >
              <s.icon size={16} className="text-brass mb-3" />
              <p className={`font-display text-2xl md:text-3xl mb-1`}>{s.value}</p>
              <p className={`docket-label text-[10px] ${faint}`}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Recent cases */}
        <motion.div
          {...fadeUp(0.1)}
          className={`rounded-xl border ${dark ? "bg-white/[0.03] border-white/10" : "bg-white border-ink-blue/10 shadow-sm"}`}
        >
          <div className={`px-5 md:px-7 py-5 border-b flex items-center justify-between ${dark ? "border-white/10" : "border-ink-blue/10"}`}>
            <h2 className="font-display text-xl">On the record</h2>
            <span className={`font-mono text-[11px] ${faint}`}>{filteredCases.length} case{filteredCases.length === 1 ? "" : "s"}</span>
          </div>
          <div className="px-5 md:px-7">
            <RecentCasesList cases={filteredCases} loading={loadingCases} dark={dark} hasQuery={!!query.trim()} />
          </div>
        </motion.div>
      </main>
    </div>
  )
}
