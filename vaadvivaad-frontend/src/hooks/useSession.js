import { useEffect } from "react"
import { api, onSessionExpired } from "../lib/api"
import useAuthStore from "../store/authStore"

/**
 * Validates the persisted session against the server once per load, and signs
 * the user out if the API ever reports the session is gone.
 *
 * Mounted once, at the app root.
 */
export function useSession() {
  const { setLogIn, setLogOut, setChecked } = useAuthStore((s) => s)

  useEffect(() => {
    let cancelled = false

    api
      .me()
      .then((res) => {
        if (cancelled) return
        setLogIn(res.data, "user")
      })
      .catch(() => {
        if (cancelled) return
        setLogOut()
      })
      .finally(() => {
        if (!cancelled) setChecked(true)
      })

    const stop = onSessionExpired(() => setLogOut())
    return () => {
      cancelled = true
      stop()
    }
  }, [setLogIn, setLogOut, setChecked])
}
