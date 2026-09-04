import { NavLink } from "react-router-dom"
import { FilePlus2, House, LayoutGrid, Mail, Scale, Search } from "lucide-react"

import { openSearch } from "../lib/search"

/**
 * The rail.
 *
 * 64px of icons that widens to 232px on hover or focus, and collapses to a
 * bottom bar under `md`. The expansion is presentation only -- the labels are
 * in the DOM at all times, so screen readers and keyboard users get the same
 * names without needing a pointer.
 */

const LINKS = [
  { to: "/user/dashboard", icon: LayoutGrid, label: "Docket", end: true },
  { to: "/user/case", icon: FilePlus2, label: "New filing" },
  { to: "/contact", icon: Mail, label: "Contact" },
  // Back out to the public site. `end` matters here: without it every route
  // matches "/" as a prefix and Home would render active on every page.
  { to: "/", icon: House, label: "Home", end: true },
]

const label =
  "text-sm whitespace-nowrap opacity-0 transition-opacity duration-ui ease-ui " +
  "group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"

export default function SideNav() {
  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Main"
        className="hidden md:flex group/rail fixed left-0 top-0 bottom-0 z-40
                   w-16 hover:w-[232px] focus-within:w-[232px]
                   flex-col gap-1 px-3 py-4 border-r border-line/10 bg-surface-sunken
                   transition-[width] duration-enter ease-ui overflow-hidden"
      >
        <div className="flex items-center gap-3 h-11 px-2.5 mb-3 shrink-0">
          <Scale size={20} className="text-accent shrink-0" />
          <span className={`font-display text-base ${label}`}>
            Vaad<span className="text-accent">Vivaad</span>
          </span>
        </div>

        {/* Not a NavLink: search is an overlay, not a route. It sits with the
            links because that is where people look for it, and the shortcut
            is shown so the rail teaches it. */}
        <button
          type="button"
          onClick={openSearch}
          className="relative flex items-center gap-3 h-11 px-2.5 rounded-lg outline-none
                     text-content/50 hover:text-content hover:bg-content/5
                     focus-visible:ring-2 focus-visible:ring-accent-solid
                     transition-colors duration-ui ease-ui"
        >
          <Search size={18} className="shrink-0" />
          <span className={`${label} flex-1 text-left`}>Search</span>
          <span className={`${label} font-mono text-[10px] text-content/35`}>⌘K</span>
        </button>

        {LINKS.map(({ to, icon: Icon, label: text, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center gap-3 h-11 px-2.5 rounded-lg outline-none
               transition-colors duration-ui ease-ui ${
                 isActive
                   ? "bg-accent-solid/10 text-accent"
                   : "text-content/50 hover:text-content hover:bg-content/5"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent-solid
                              transition-opacity duration-ui ${isActive ? "opacity-100" : "opacity-0"}`}
                />
                <Icon size={18} className="shrink-0" />
                <span className={label}>{text}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Mobile bar */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-line/10
                   bg-surface-raised/95 backdrop-blur-md"
      >
        {LINKS.map(({ to, icon: Icon, label: text, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px]
               transition-colors duration-ui ${isActive ? "text-accent" : "text-content/50"}`
            }
          >
            <Icon size={18} />
            {text}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
