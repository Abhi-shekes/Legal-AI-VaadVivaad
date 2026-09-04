import { Link } from "react-router-dom"
import { LogOut, Moon, Sun } from "lucide-react"
import logo from "../assets/nyayavada_logo.png"

/**
 * The header for every authenticated page.
 *
 * Colours now come from the token layer rather than a `dark` boolean branched
 * on at each element, so the same markup renders correctly in both themes.
 * `center` takes whatever the page wants in the middle -- a search field, a
 * back link, a case title.
 */
export default function AppHeader({ user, onLogout, center, changeTheme, dark }) {
  const displayName = user?.name || user?.email || ""

  return (
    <header
      className="sticky top-0 z-30 border-b border-line/10 bg-ground/85 backdrop-blur-md"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center gap-4">
        <Link
          to="/user/dashboard"
          className="flex items-center gap-2.5 shrink-0 md:hidden"
          aria-label="VaadVivaad — dashboard"
        >
          <img src={logo} alt="" className="h-7 w-auto" />
        </Link>

        {center && <div className="flex-1 min-w-0">{center}</div>}
        {!center && <div className="flex-1" />}

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={changeTheme}
            className="p-2 rounded-full text-content/60 hover:text-content hover:bg-content/5 transition-colors duration-ui"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user && (
            <div
              className="hidden lg:flex items-center gap-2 pl-2 ml-1 border-l border-line/10"
              title={user.email}
            >
              <div className="w-7 h-7 rounded-full bg-accent-solid/15 text-accent flex items-center justify-center font-mono text-xs font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-content/60 max-w-[16ch] truncate">{displayName}</span>
            </div>
          )}

          <button
            onClick={onLogout}
            className="p-2 rounded-full text-content/60 hover:text-content hover:bg-content/5 transition-colors duration-ui"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
