import React, { useState } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faBalanceScale, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import authStore from "../store/authStore";
import themeStore from "../store/themeStore";
import { motion } from "framer-motion";
import backendURL from "../config"; 

const Login = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    setConfirmation("");  

    try {
      const resp = await axios.post(
        `${backendURL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (resp.data.status === "success") {
        setConfirmation("Login successful!");
        
        
        setLogIn(email,"user");

        setTimeout(() => {
          navigate("/user/dashboard");
        }, 1000);
        
      } else {
        setError(resp.data.message || "Login failed");
      }
    } catch (err) {
      if (err.response) {
        setError(
          err.response?.data?.message || "An error occurred. Please try again."
        );
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred.");
      }
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
              <label htmlFor="email" className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FontAwesomeIcon 
                    icon={faUser} 
                    className={`${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} 
                  />
                </div>
                <input
                  id="email"
                  type="text"
                  name="email"
                  placeholder="Enter your email"
                  required
                  className={`block w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    theme === "dark"
                      ? "bg-[#2a2a2a] text-white border-[#444] focus:ring-[#d4af37] focus:border-[#d4af37]"
                      : "bg-white text-gray-900 border-gray-300 focus:ring-[#0a2463] focus:border-[#0a2463]"
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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

      
    </div>
  );
};

export default Login;