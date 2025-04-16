import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import themeStore from '../store/themeStore';

const Header = () => {
  // Theme Switcher (Got Values from themeStore (Zustand))
  const { theme, changeTheme } = themeStore((state) => state);

  return (
    <nav
      className={`w-full h-24 px-10 fixed top-0 left-0 shadow-md flex justify-center items-center z-10 border-b transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#121212] border-gray-600 text-white'
          : 'bg-white border-gray-200 text-black'
      }`}
    >
      <div className="w-[85%] h-full flex justify-between">
        {/* Logo */}
        <div className="font-bold text-xl w-[20%] flex items-center">
          <FontAwesomeIcon 
            icon={faBalanceScale} 
            className={`mr-3 text-[#d4af37]`} 
          />
          <span className="text-[#0a2463]">Legal</span>
          <span className="text-[#d4af37]">AI</span>
        </div>

        {/* Navigation Links */}
        <div className="gap-12 w-[50%] flex justify-end items-center h-full">
          {/* Home Link */}
          <div className="relative group">
            <Link
              to="/"
              className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}
            >
              Home
            </Link>
          </div>

          {/* Features Link */}
          <div className="relative group">
            <Link
              to="/features"
              className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}
            >
              Features
            </Link>
          </div>

          {/* Theme Toggle Icon */}
          <div className="flex gap-4">
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className={`cursor-pointer hover:text-[#d4af37] transition-colors duration-300 text-xl ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}
              onClick={changeTheme}
            />
          </div>


          {/* Features Link */}
          <div className="relative group">
            <Link
              to="/signup"
              className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}
            >
              Sign Up
            </Link>
          </div>

         

        


          {/* Login Button */}
          <Link
            to="/login"
            className={`py-3 px-6 rounded-md transition duration-300 ease-in-out focus:ring-2 focus:ring-[#d4af37] ${
              theme === 'dark'
                ? 'bg-[#1f1f1f] text-white hover:bg-[#0a2463]'
                : 'bg-gray-100 text-black hover:bg-[#0a2463] hover:text-white'
            }`}
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Header;