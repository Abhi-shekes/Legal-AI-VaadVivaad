import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'react-router-dom';
import themeStore from '../store/themeStore';
import logo from '../assets/nyayavada_logo.png';

const Header = () => {
  const { theme, changeTheme } = themeStore((state) => state);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const scrollToFeatures = (e) => {
    e.preventDefault();
    setIsOpen(false);

    if (location.pathname !== '/') {
      window.location.href = '/#features-section';
      return;
    }

    const featuresSection = document.querySelector('#features-section');
    if (featuresSection) {
      const headerHeight = document.querySelector('nav')?.offsetHeight || 0;
      const sectionPosition = featuresSection.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: sectionPosition - headerHeight - 20,
        behavior: 'smooth'
      });
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Navigation items for consistency
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Features', onClick: scrollToFeatures, isLink: false },
    { label: 'Contact', path: '/contact' },
    { label: 'Sign Up', path: '/signup' },
  ];

  return (
    <nav className={`w-full h-16 md:h-20 lg:h-24 px-4 sm:px-6 md:px-8 lg:px-10 fixed top-0 left-0 z-50 transition-all duration-300 ${theme === 'dark'
      ? 'bg-[#121212] border-gray-800 text-white'
      : 'bg-white/95 backdrop-blur-sm border-gray-100 text-black'
      } ${isScrolled ? 'shadow-lg border-b' : 'border-b'
      }`}>
      <div className="w-full max-w-7xl mx-auto h-full flex justify-between items-center">

        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link to="/" onClick={() => setIsOpen(false)} className="focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded">
            <img
              src={logo}
              alt="NyayaVada Logo"
              className="h-10 md:h-14 lg:h-16 w-auto transition-transform hover:scale-105"
            />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
          {navItems.slice(0, 3).map((item) => (
            item.isLink === false ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`relative py-2.5 px-4 xl:px-5 rounded-lg font-medium transition-all duration-300 hover:bg-[#0a2463] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                  ? 'text-gray-200 hover:text-white'
                  : 'text-gray-700 hover:text-white'
                  }`}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.path}
                className={`relative py-2.5 px-4 xl:px-5 rounded-lg font-medium transition-all duration-300 hover:bg-[#0a2463] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                  ? 'text-gray-200 hover:text-white'
                  : 'text-gray-700 hover:text-white'
                  }`}
              >
                {item.label}
              </Link>
            )
          ))}

          {/* Theme Toggle - Desktop */}
          <button
            onClick={changeTheme}
            className={`p-2.5 mx-2 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark' ? 'text-yellow-300' : 'text-gray-700'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className="text-lg"
            />
          </button>

          {/* Auth Buttons - Desktop */}
          <div className="flex items-center space-x-2 ml-2">
            <Link
              to="/signup"
              className={`py-2.5 px-5 rounded-lg font-medium transition-all duration-300 hover:bg-[#0a2463] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                ? 'text-gray-200 hover:text-white'
                : 'text-gray-700 hover:text-white'
                }`}
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className={`py-2.5 px-6 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                ? 'bg-[#1f1f1f] text-white hover:bg-[#0a2463]'
                : 'bg-gray-100 text-gray-800 hover:bg-[#0a2463] hover:text-white'
                }`}
            >
              Login
            </Link>
          </div>
        </div>

        {/* Tablet Navigation (Simplified) */}
        <div className="hidden md:flex lg:hidden items-center space-x-4">
          <button
            onClick={changeTheme}
            className={`p-2 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 ${theme === 'dark' ? 'text-yellow-300' : 'text-gray-700'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className="text-lg"
            />
          </button>
          <Link
            to="/login"
            className={`py-2 px-4 rounded-lg font-medium transition-all duration-300 ${theme === 'dark'
              ? 'bg-[#1f1f1f] text-white hover:bg-[#0a2463]'
              : 'bg-gray-100 text-gray-800 hover:bg-[#0a2463] hover:text-white'
              }`}
          >
            Login
          </Link>
          <button onClick={toggleMenu} className="p-2 focus:outline-none">
            <FontAwesomeIcon
              icon={isOpen ? faTimes : faBars}
              className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}
            />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-4">
          <button
            onClick={changeTheme}
            className={`p-2 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 ${theme === 'dark' ? 'text-yellow-300' : 'text-gray-700'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className="text-lg"
            />
          </button>
          <button
            onClick={toggleMenu}
            className="p-2 focus:outline-none focus:ring-2 focus:ring-[#d4af37] rounded"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <FontAwesomeIcon
              icon={isOpen ? faTimes : faBars}
              className={`text-xl transition-transform ${theme === 'dark' ? 'text-white' : 'text-gray-700'} ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - Slides from TOP */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out ${isOpen
        ? 'opacity-100 visible'
        : 'opacity-0 invisible pointer-events-none'
        }`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 ${theme === 'dark' ? 'bg-black/70' : 'bg-black/50'}`}
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel - Comes from top */}
        <div className={`absolute top-0 left-0 w-full h-auto transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : '-translate-y-full'
          } ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
          <div className="flex flex-col p-6">
            {/* Close button at top right */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsOpen(false)}
                className={`p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                  ? 'hover:bg-gray-800 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
                  }`}
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>


            <div className="flex-1 flex flex-col space-y-1">
              {navItems.map((item) => (
                item.isLink === false ? (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`py-4 px-4 rounded-lg text-left font-medium transition-all duration-200 hover:bg-[#0a2463] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                      ? 'text-gray-200 hover:text-white'
                      : 'text-gray-700 hover:text-white'
                      }`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`py-4 px-4 rounded-lg text-left font-medium transition-all duration-200 hover:bg-[#0a2463] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                      ? 'text-gray-200 hover:text-white'
                      : 'text-gray-700 hover:text-white'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            <div className="pt-6 border-t mt-4">
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className={`w-full py-4 px-4 rounded-lg font-medium text-center transition-all duration-300 mb-3 focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${theme === 'dark'
                  ? 'bg-[#2d2d2d] text-white hover:bg-[#0a2463]'
                  : 'bg-gray-100 text-gray-800 hover:bg-[#0a2463] hover:text-white'
                  }`}
              >
                Login
              </Link>
              <div className={`text-xs text-center mt-4 pb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                © NyayaVada {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;