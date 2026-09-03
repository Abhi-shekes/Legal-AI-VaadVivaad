import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"
import useAuthStore from "../store/authStore"

/**
 * Waits for the session check before deciding.
 *
 * The previous version redirected purely on a localStorage flag, which both
 * flashed the login page for signed-in users and let a stale flag admit
 * someone whose session had actually expired.
 */
export default function ProtectedRoute({ children }) {
  const { isLoggedIn, checked } = useAuthStore((s) => s)
  const location = useLocation()

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-brass" />
        <span className="sr-only">Checking your session</span>
      </div>
    )
  }
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
