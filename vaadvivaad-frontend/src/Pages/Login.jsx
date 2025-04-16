import React, { useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faBalanceScale, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import authStore from "../store/authStore";
import themeStore from "../store/themeStore";
import { motion } from "framer-motion";

const Login = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Using Zustand for authentication and theme management
  const { setLogIn } = authStore((state) => state);
  const { theme } = themeStore((state) => state);

  const navigate = useNavigate();

  const handlePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // const resp = await axios.post(
      //   "http://localhost:3000/login",
      //   { username, password },
      //   { withCredentials: true }
      // );

      // if (resp.data.status === "success" || true) {
      //   setConfirmation(resp.data.message);
        setTimeout(() => {
          setLogIn({
            user: username,
            role: "user",
          });
          navigate("/user/dashboard");
        }, 1000);
      // } else {
      //   setError(resp.data.message);
      // }
    } catch (err) {
      setError(
        err.response?.data?.message || "An error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`flex flex-col justify-center items-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        theme === "dark" ? "bg-[#121212]" : "bg-gray-50"
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-32 bg-[#0a2463] z-0"></div>
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md relative z-10`}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className={`rounded-full p-4 inline-flex items-center justify-center bg-white shadow-lg`}>
              <FontAwesomeIcon 
                icon={faBalanceScale} 
                className="text-[#d4af37] text-3xl" 
              />
            </div>
          </div>
          <h2 className={`mt-6 text-3xl font-extrabold ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>
            <span className="text-[#0a2463]">Legal</span>
            <span className="text-[#d4af37]">AI</span>
          </h2>
          <p className={`mt-2 text-sm ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}>
            Access your legal assistant platform
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`p-8 rounded-lg shadow-xl transition-colors ${
            theme === "dark"
              ? "bg-[#1f1f1f] text-white border border-gray-700"
              : "bg-white text-gray-800 border border-gray-200"
          }`}
        >
          <div className="flex items-center justify-center mb-6">
            <div className={`h-px flex-grow ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
            <span className={`px-4 text-lg font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Sign In
            </span>
            <div className={`h-px flex-grow ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}></div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
            >
              <p>{error}</p>
            </motion.div>
          )}

          {/* Confirmation Message */}
          {confirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded"
            >
              <p>{confirmation}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faUser} 
                    className={`${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} 
                  />
                </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  required
                  className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-white border-[#444] focus:ring-[#d4af37] focus:border-[#d4af37]"
                      : "bg-white text-gray-900 border-gray-300 focus:ring-[#0a2463] focus:border-[#0a2463]"
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faLock} 
                    className={`${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} 
                  />
                </div>
                <input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  required
                  className={`block w-full pl-10 pr-10 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-white border-[#444] focus:ring-[#d4af37] focus:border-[#d4af37]"
                      : "bg-white text-gray-900 border-gray-300 focus:ring-[#0a2463] focus:border-[#0a2463]"
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon
                    icon={passwordVisible ? faEyeSlash : faEye}
                    className={`cursor-pointer transition-colors ${
                      theme === "dark" ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                    }`}
                    onClick={handlePasswordVisibility}
                    aria-label="Toggle password visibility"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={`h-4 w-4 rounded border-gray-300 ${
                    theme === "dark" 
                      ? "bg-[#2a2a2a] text-[#d4af37] focus:ring-[#d4af37]" 
                      : "bg-white text-[#0a2463] focus:ring-[#0a2463]"
                  }`}
                />
                <label htmlFor="remember-me" className={`ml-2 block text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className={`font-medium hover:underline ${
                  theme === "dark" ? "text-[#d4af37]" : "text-[#0a2463]"
                }`}>
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ${
                  isSubmitting
                    ? "cursor-not-allowed bg-gray-400"
                    : theme === "dark"
                    ? "bg-[#d4af37] hover:bg-[#c4a030] focus:ring-[#d4af37]"
                    : "bg-[#0a2463] hover:bg-[#083057] focus:ring-[#0a2463]"
                }`}
              >
                {isSubmitting ? "Processing..." : "Sign in"}
              </motion.button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${theme === "dark" ? "bg-[#1f1f1f] text-gray-400" : "bg-white text-gray-500"}`}>
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <a
                  href="#"
                  className={`w-full inline-flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-white border-gray-700 hover:bg-[#333]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>

              <div>
                <a
                  href="#"
                  className={`w-full inline-flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-white border-gray-700 hover:bg-[#333]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              Don't have an account?{" "}
              <a
                href="/signup"
                className={`font-medium hover:underline ${
                  theme === "dark" ? "text-[#d4af37]" : "text-[#0a2463]"
                }`}
              >
                Register now
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Legal decoration elements */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden z-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="opacity-10">
          <path 
            fill={theme === "dark" ? "#d4af37" : "#0a2463"} 
            fillOpacity="1" 
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z">
          </path>
        </svg>
      </div>
    </div>
  );
};

export default Login;