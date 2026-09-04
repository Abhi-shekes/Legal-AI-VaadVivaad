import { Component, lazy } from "react"

/**
 * Lazy routes that survive a deploy.
 *
 * Vite gives every chunk a content hash, so a rebuild renames them all. A tab
 * that was open across a deploy still holds the previous shell in memory, and
 * the moment it navigates it asks for a chunk filename that no longer exists:
 *
 *   TypeError: Failed to fetch dynamically imported module: .../CaseDetails-<old>.js
 *
 * The import rejects, nothing catches it, and the route renders as a blank
 * page. Since `index.html` is served `no-cache`, one reload is all that is
 * needed to pick up the new shell -- so do exactly that, once, guarded by a
 * per-tab flag so a genuinely missing chunk cannot cause a reload loop.
 */
export function lazyWithReload(factory, key) {
  const flag = `vv-chunk-reload:${key}`

  const read = () => {
    try {
      return sessionStorage.getItem(flag) === "1"
    } catch {
      return false // private mode: fall through and just surface the error
    }
  }
  const write = (value) => {
    try {
      if (value) sessionStorage.setItem(flag, "1")
      else sessionStorage.removeItem(flag)
    } catch {
      /* the guard is best-effort */
    }
  }

  return lazy(() =>
    factory()
      .then((mod) => {
        write(false) // loaded cleanly -- arm the guard again for a later deploy
        return mod
      })
      .catch((error) => {
        if (read()) throw error // already retried; this is a real failure
        write(true)
        window.location.reload()
        // Never resolves: the reload replaces the document before React
        // would have anything to render.
        return new Promise(() => {})
      })
  )
}

/**
 * Last line of defence.
 *
 * If a route throws for any other reason, show something the user can act on
 * rather than the white page a thrown render leaves behind.
 */
export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error("Route failed to render:", error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-ground text-content">
        <h1 className="font-display text-2xl">This page did not load</h1>
        <p className="text-sm text-content/60 max-w-md">
          Something went wrong rendering it. Reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent-solid text-accent-on"
        >
          Reload the page
        </button>
      </div>
    )
  }
}
