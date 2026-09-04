import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

import CommandPalette from "../components/CommandPalette"
import SideNav from "../components/SideNav"
import AppHeader from "../components/AppHeader"

/**
 * The authenticated frame.
 *
 * Every authenticated page used to centre itself in a `max-w-7xl` column, which
 * left roughly a third of a 1920px display as gutter. The shell is full-bleed
 * instead: a fixed rail on the left, fluid padding on the content, and no width
 * cap on the frame. Reading measure is handled where the text actually lives
 * (`.measure`), not by squeezing the whole page.
 *
 * `bleed` drops the content padding for pages that manage their own -- the
 * hearing, which runs edge to edge.
 */
export default function AppShell({ children, header, bleed = false }) {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false
  )

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  return (
    <div className="min-h-screen bg-ground text-content">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
                   focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-solid focus:text-accent-on
                   focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>

      <SideNav />
      {/* Mounted once for the whole authenticated app; it opens itself on ⌘K. */}
      <CommandPalette />

      {/* Offset for the rail; the mobile bar sits at the bottom instead. */}
      <div className="md:pl-16 pb-16 md:pb-0">
        <AppHeader {...header} />

        {offline && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 2xl:px-12 py-2
                       bg-dissent/10 border-b border-dissent/20 text-[12.5px] text-dissent"
          >
            <WifiOff size={13} />
            You are offline. A hearing in progress will resume when the connection returns.
          </div>
        )}

        <main id="main" className={bleed ? "" : "w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 lg:py-10"}>
          {children}
        </main>
      </div>
    </div>
  )
}
