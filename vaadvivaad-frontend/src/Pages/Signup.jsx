import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import themeStore from "../store/themeStore";
import AuthLayout from "../components/auth/AuthLayout";
import FormField from "../components/auth/FormField";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";

const Signup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  const navigate = useNavigate();
  const { theme } = themeStore((state) => state);
  const dark = theme === "dark";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Service to continue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await axios.post(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        name,
        email,
        password,
      });

      if (resp.data.status === "success") {
        toast.success("Account created! Redirecting to login…");
        setTimeout(() => navigate("/login"), 1200);
      } else {
        const msg = resp.data.message || "Signup failed. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "An error occurred. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join to start building AI-assisted legal arguments in minutes."
      footer={
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#C7A046] hover:underline">
            Sign in
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
          label="Full name"
          icon={User}
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <FormField
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <FormField
            label="Password"
            icon={Lock}
            isPassword
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrengthMeter password={password} />
        </div>

        <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-400 text-[#C7A046] focus:ring-[#C7A046]"
          />
          <span className={`text-xs leading-relaxed ${dark ? "text-gray-400" : "text-gray-600"}`}>
            I agree to the{" "}
            <a href="#" className={`font-medium hover:underline ${dark ? "text-[#C7A046]" : "text-[#1B2A4A]"}`}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className={`font-medium hover:underline ${dark ? "text-[#C7A046]" : "text-[#1B2A4A]"}`}>
              Privacy Policy
            </a>
          </span>
        </label>

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
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </motion.button>

        <div
          className={`flex items-center justify-center gap-1.5 pt-1 text-[11px] ${
            dark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          <CheckCircle2 size={12} />
          No credit card required — free to get started.
        </div>
      </form>
    </AuthLayout>
  );
};

export default Signup;
