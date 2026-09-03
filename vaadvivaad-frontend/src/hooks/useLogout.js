import { useNavigate } from "react-router-dom"
import axios from "axios"
import useAuthStore from "../store/authStore"

export default function useLogout() {
  const { setLogOut } = useAuthStore()
  const navigate = useNavigate()
  const apiUrl = import.meta.env.VITE_API_URL

  return async () => {
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
}
