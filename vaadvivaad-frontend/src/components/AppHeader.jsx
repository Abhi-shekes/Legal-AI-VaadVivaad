import { Link } from "react-router-dom"
import { LogOut, Sun, Moon } from "lucide-react"
import logo from "../assets/nyayavada_logo.png"

// Shared sticky header for every authenticated page (Dashboard, Case, CaseDetails, ...)
// so logo/theme-toggle/user-badge/logout never drift out of sync across pages.
export default function AppHeader({ dark, changeTheme, user, onLogout, center }) {
  const muted = dark ? "text-gray-400" : "text-ink-blue/60"
  const displayName = user?.name || user?.email || ""

  return (
    <header className={`border-b ${dark ? "border-white/10 bg-ink/90" : "border-ink-blue/10 bg-parchment/90"} backdrop-blur-md sticky top-0 z-30`}>
      <div className="w-full px-4 sm:px-6 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link to="/user/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <img src={logo} alt="VaadVivaad" className="h-8 md:h-9 w-auto" />
          <span className="hidden sm:block font-display text-lg leading-none">
            Vaad<span className="text-brass">Vivaad</span>
          </span>
        </Link>

        {center && <div className="flex-1 max-w-md hidden sm:block">{center}</div>}

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-auto">
          <button
            onClick={changeTheme}
            className={`p-2 rounded-full transition-colors ${dark ? "text-brass hover:bg-white/10" : "text-ink-blue/70 hover:bg-ink-blue/5"}`}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {user && (
            <div className="hidden md:flex items-center gap-2 pr-2 border-r border-current/10" title={user.email}>
              <div className="w-7 h-7 rounded-full bg-brass/15 text-brass flex items-center justify-center font-mono text-xs font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className={`text-sm ${muted}`}>{displayName}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`p-2 rounded-full transition-colors ${dark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-ink-blue/60 hover:text-ink-blue hover:bg-ink-blue/5"}`}
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
