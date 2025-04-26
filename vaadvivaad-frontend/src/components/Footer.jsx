import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import themeStore from '../store/themeStore';

const Footer = () => {
  // Theme Switcher (Got Values from themeStore (Zustand))
  const { theme } = themeStore((state) => state);

  return (
    <footer
      className={`w-full py-8 px-10 border-t transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#121212] border-gray-600 text-white'
          : 'bg-white border-gray-200 text-black'
      }`}
    >
      <div className="max-w-[85%] mx-auto flex flex-col md:flex-row justify-between items-center">
        {/* Logo and Description */}
        <div className="mb-6 md:mb-0">
          <h1 className="text-2xl font-bold flex items-center">
            <FontAwesomeIcon 
              icon={faBalanceScale} 
              className="mr-3 text-[#d4af37]" 
            />
            <span className="text-[#0a2463]">Nyaya</span>
            <span className="text-[#d4af37]">Vada</span>
          </h1>
          <p
            className={`mt-2 transition-colors ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Transforming legal practice with artificial intelligence.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
          <Link
            to="/"
            className={`transition-colors duration-300 ease-in-out hover:text-[#d4af37] ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Home
          </Link>
         
          <Link
            to="/contact"
            className={`transition-colors duration-300 ease-in-out hover:text-[#d4af37] ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Contact
          </Link>
          <Link
            to="/login"
            className={`transition-colors duration-300 ease-in-out hover:text-[#d4af37] ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Login
          </Link>
        </div>

        {/* Social Media Icons */}
        <div className="flex gap-4 mt-6 md:mt-0">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-300 ease-in-out ${
              theme === 'dark' ? 'text-gray-400 hover:text-[#d4af37]' : 'text-gray-600 hover:text-[#d4af37]'
            }`}
          >
            <FontAwesomeIcon icon={faFacebook} size="lg" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-300 ease-in-out ${
              theme === 'dark' ? 'text-gray-400 hover:text-[#d4af37]' : 'text-gray-600 hover:text-[#d4af37]'
            }`}
          >
            <FontAwesomeIcon icon={faTwitter} size="lg" />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-300 ease-in-out ${
              theme === 'dark' ? 'text-gray-400 hover:text-[#d4af37]' : 'text-gray-600 hover:text-[#d4af37]'
            }`}
          >
            <FontAwesomeIcon icon={faInstagram} size="lg" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-300 ease-in-out ${
              theme === 'dark' ? 'text-gray-400 hover:text-[#d4af37]' : 'text-gray-600 hover:text-[#d4af37]'
            }`}
          >
            <FontAwesomeIcon icon={faLinkedin} size="lg" />
          </a>
        </div>
      </div>

      {/* Footer Bottom Section */}
      <div
        className={`mt-8 pt-4 text-center transition-colors duration-300 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        © {new Date().getFullYear()} NyayaVada. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;