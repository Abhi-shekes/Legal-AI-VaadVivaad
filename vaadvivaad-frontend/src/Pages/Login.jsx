import { useState } from "react";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import authStore from "../store/authStore";
import themeStore from "../store/themeStore";
import AuthLayout from "../components/auth/AuthLayout";
import FormField from "../components/auth/FormField";

const Login = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const { setLogIn } = authStore((state) => state);
  const { theme } = themeStore((state) => state);
  const dark = theme === "dark";

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // `api` returns the parsed body -- `{status, data}` -- not an axios
      // envelope. Testing `resp.data.status` read a field off the user object,
      // so a successful 200 login fell into the failure branch and the user was
      // told "Login failed" while their session cookie was already set.
      const resp = await api.login(email, password);

      if (resp?.status === "success") {
        toast.success("Welcome back! Redirecting to your dashboard…");
        const { name, email: confirmedEmail } = resp.data || {};
        setLogIn({ name: name || "", email: confirmedEmail || email }, "user");
        setTimeout(() => navigate("/user/dashboard"), 900);
      } else {
        const msg = resp?.message || "Login failed";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      // ApiError already carries a message written for the user, and sets
      // `code` to "network_error" when the server could not be reached.
      const msg = err?.message || "An unexpected error occurred.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Pick up where you left off with your saved cases."
      footer={
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-[#C7A046] hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <FormField
          label="Password"
          icon={Lock}
          isPassword
          name="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-400 text-[#C7A046] focus:ring-[#C7A046]"
            />
            <span className={`text-xs ${dark ? "text-gray-400" : "text-gray-600"}`}>
              Remember me
            </span>
          </label>
          <a
            href="#"
            className={`text-xs font-medium hover:underline ${
              dark ? "text-[#C7A046]" : "text-[#1B2A4A]"
            }`}
          >
            Forgot password?
          </a>
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          className={`group relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-lg py-3 text-sm font-semibold text-[#1B2A4A] transition-all ${
            isSubmitting ? "cursor-not-allowed opacity-70" : ""
          }`}
          style={{
            backgroundImage: "linear-gradient(135deg, #DBB968 0%, #C7A046 55%, #A8813A 100%)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </motion.button>

        <div
          className={`flex items-center justify-center gap-1.5 pt-1 text-[11px] ${
            dark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          <ShieldCheck size={12} />
          Your session is secured with encrypted, HTTP-only cookies.
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
