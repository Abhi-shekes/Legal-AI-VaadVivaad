import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBars, faTimes, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import themeStore from '../store/themeStore';
import authStore from '../store/authStore';
import logo from '../assets/nyayavada_logo.png';

const Header = () => {
  const { theme, changeTheme } = themeStore((state) => state);
  const { isLoggedIn, setLogOut } = authStore((state) => state);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dark = theme === 'dark';

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setLogOut();
      navigate('/');
    }
  };

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
  ];

  const isActive = (path) => path && location.pathname === path;

  const navLinkClass = (active) =>
    `relative py-2.5 px-3.5 xl:px-4 font-medium text-sm tracking-wide transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded ${
      active
        ? 'text-brass'
        : dark
        ? 'text-gray-300 hover:text-white'
        : 'text-ink-blue/70 hover:text-ink-blue'
    }`;

  return (
    <nav className={`w-full h-16 md:h-20 lg:h-24 px-4 sm:px-6 md:px-8 lg:px-10 fixed top-0 left-0 z-50 transition-all duration-300 backdrop-blur-md ${dark
      ? 'bg-ink/90 text-white'
      : 'bg-parchment/90 text-ink-blue'
      } ${isScrolled ? 'shadow-[0_1px_0_0_rgba(0,0,0,0.06)]' : ''} border-b ${dark ? 'border-white/10' : 'border-ink-blue/10'
      }`}>
      <div className="w-full h-full flex justify-between items-center">

        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <Link to="/" onClick={() => setIsOpen(false)} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded flex items-center gap-2.5">
            <img
              src={logo}
              alt="VaadVivaad"
              className="h-9 md:h-11 lg:h-12 w-auto transition-transform hover:scale-105"
            />
            <span className={`hidden sm:block font-display text-lg md:text-xl leading-none ${dark ? 'text-white' : 'text-ink-blue'}`}>
              Vaad<span className="text-brass">Vivaad</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center">
          {navItems.map((item) => (
            item.isLink === false ? (
              <button key={item.label} onClick={item.onClick} className={navLinkClass(false)}>
                {item.label}
              </button>
            ) : (
              <Link key={item.label} to={item.path} className={navLinkClass(isActive(item.path))}>
                {item.label}
              </Link>
            )
          ))}

          {/* Theme Toggle - Desktop */}
          <button
            onClick={changeTheme}
            className={`p-2.5 mx-2 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass ${dark ? 'text-brass hover:bg-white/10' : 'text-ink-blue/70 hover:bg-ink-blue/5'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon
              icon={theme === 'light' ? faMoon : faSun}
              className="text-base"
            />
          </button>

          {/* Auth Buttons - Desktop */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-current/10">
            {isLoggedIn ? (
              <>
                <button onClick={handleLogout} className={navLinkClass(false)}>
                  Logout
                </button>
                <Link
                  to="/user/dashboard"
                  className="py-2.5 px-5 rounded-full font-medium text-sm transition-all duration-200 bg-brass text-ink hover:bg-brass/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/signup" className={navLinkClass(isActive('/signup'))}>
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="py-2.5 px-5 rounded-full font-medium text-sm transition-all duration-200 bg-brass text-ink hover:bg-brass/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Tablet Navigation (Simplified) */}
        <div className="hidden md:flex lg:hidden items-center space-x-4">
          <button
            onClick={changeTheme}
            className={`p-2 rounded-full transition-colors duration-200 ${dark ? 'text-brass hover:bg-white/10' : 'text-ink-blue/70 hover:bg-ink-blue/5'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-base" />
          </button>
          <Link
            to={isLoggedIn ? '/user/dashboard' : '/login'}
            className="py-2 px-4 rounded-full font-medium text-sm bg-brass text-ink hover:bg-brass/90 transition-colors"
          >
            {isLoggedIn ? 'Dashboard' : 'Login'}
          </Link>
          <button onClick={toggleMenu} className="p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded">
            <FontAwesomeIcon
              icon={isOpen ? faTimes : faBars}
              className={`text-xl ${dark ? 'text-white' : 'text-ink-blue'}`}
            />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-3">
          <button
            onClick={changeTheme}
            className={`p-2 rounded-full transition-colors duration-200 ${dark ? 'text-brass hover:bg-white/10' : 'text-ink-blue/70 hover:bg-ink-blue/5'
              }`}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-base" />
          </button>
          <button
            onClick={toggleMenu}
            className="p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <FontAwesomeIcon
              icon={isOpen ? faTimes : faBars}
              className={`text-xl transition-transform ${dark ? 'text-white' : 'text-ink-blue'} ${isOpen ? 'rotate-90' : ''}`}
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
          className="absolute inset-0 bg-ink/70"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu Panel - Comes from top */}
        <div className={`absolute top-0 left-0 w-full h-auto transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : '-translate-y-full'
          } ${dark ? 'bg-ink' : 'bg-parchment'}`}>
          <div className="flex flex-col p-6">
            {/* Close button at top right */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsOpen(false)}
                className={`p-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brass ${dark ? 'hover:bg-white/10 text-white' : 'hover:bg-ink-blue/5 text-ink-blue'
                  }`}
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            <div className="flex-1 flex flex-col divide-y divide-current/10 border-t border-b border-current/10">
              {navItems.map((item) => (
                item.isLink === false ? (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    className={`py-4 text-left font-medium transition-colors duration-200 ${dark ? 'text-gray-200 hover:text-brass' : 'text-ink-blue/80 hover:text-brass'
                      }`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`py-4 text-left font-medium transition-colors duration-200 ${isActive(item.path) ? 'text-brass' : dark ? 'text-gray-200 hover:text-brass' : 'text-ink-blue/80 hover:text-brass'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            <div className="pt-6 mt-2">
              {isLoggedIn ? (
                <>
                  <Link
                    to="/user/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full block py-3.5 px-4 rounded-full font-medium text-center bg-brass text-ink hover:bg-brass/90 transition-colors mb-3"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full font-medium transition-colors mb-4 ${dark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-ink-blue/70 hover:text-ink-blue hover:bg-ink-blue/5'
                      }`}
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="text-sm" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full block py-3.5 px-4 rounded-full font-medium text-center bg-brass text-ink hover:bg-brass/90 transition-colors mb-3"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className={`w-full block py-3 px-4 rounded-full font-medium text-center transition-colors mb-4 ${dark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-ink-blue/70 hover:text-ink-blue hover:bg-ink-blue/5'
                      }`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
              <div className={`font-mono text-[11px] text-center tracking-wide ${dark ? 'text-gray-500' : 'text-ink-blue/40'}`}>
                © VaadVivaad {new Date().getFullYear()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
