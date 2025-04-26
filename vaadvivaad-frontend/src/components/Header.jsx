import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'; 
import { Link } from 'react-router-dom';
import themeStore from '../store/themeStore';
import logo from '../assets/nyayavada_logo.png';

const Header = () => {
  const { theme, changeTheme } = themeStore((state) => state);

  const scrollToFeatures = (e) => {
    e.preventDefault();
    const featuresSection = document.querySelector('#features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.href = '/#features-section';
    }
  };

  return (
    <nav className={`w-full h-24 px-10 fixed top-0 left-0 shadow-md flex justify-center items-center z-10 border-b transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#121212] border-gray-600 text-white' : 'bg-white border-gray-200 text-black'
    }`}>
      <div className="w-[85%] h-full flex justify-between items-center">
        
        {/* Logo */}
        <div className="w-[20%] flex items-center">
          <Link to="/">
            <img 
              src={logo}  // <--- If it's inside public/ folder
              alt="NyayaVada Logo"
              className="h-20 w-44"  // adjust height as needed
            />
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="gap-8 w-[60%] flex justify-end items-center h-full">
          
          <div className="relative group">
            <Link to="/" className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Home
            </Link>
          </div>

          <div className="relative group">
            <a href="#features-section" onClick={scrollToFeatures} className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Features
            </a>
          </div>

          <div className="relative group">
            <Link to="/contact" className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Contact
            </Link>
          </div>

          <div className="flex gap-4">
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className={`cursor-pointer hover:text-[#d4af37] transition-colors duration-300 text-xl ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}
              onClick={changeTheme}
            />
          </div>

          <div className="relative group">
            <Link to="/signup" className={`relative py-3 px-4 rounded-md group-hover:bg-[#0a2463] group-hover:text-white transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              Sign Up
            </Link>
          </div>

          <Link to="/login" className={`py-3 px-6 rounded-md transition duration-300 ease-in-out focus:ring-2 focus:ring-[#d4af37] ${
            theme === 'dark' ? 'bg-[#1f1f1f] text-white hover:bg-[#0a2463]' : 'bg-gray-100 text-black hover:bg-[#0a2463] hover:text-white'
          }`}>
            Login
          </Link>
        </div>

      </div>
    </nav>
  );
};

export default Header;
