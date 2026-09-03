import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import { faBalanceScale } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import themeStore from '../store/themeStore';

const socials = [
  { icon: faFacebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: faTwitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: faInstagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: faLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
];

const links = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/#features-section' },
  { label: 'Contact', to: '/contact' },
  { label: 'Login', to: '/login' },
];

const Footer = () => {
  const { theme } = themeStore((state) => state);
  const dark = theme === 'dark';
  const year = new Date().getFullYear();

  return (
    <footer className={`w-full border-t transition-colors duration-300 ${dark ? 'bg-ink border-white/10 text-white' : 'bg-parchment border-ink-blue/10 text-ink-blue'
      }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-12 pb-8">
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-8">
          {/* Wordmark + description */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 font-display text-xl">
              <FontAwesomeIcon icon={faBalanceScale} className="text-brass text-lg" />
              <span>Vaad<span className="text-brass">Vivaad</span></span>
            </div>
            <p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
              An AI-adjudicated debate on every case you file — grounded in IPC sections and precedent, argued from both sides.
            </p>
            <div className="flex gap-4 mt-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={`transition-colors duration-200 ${dark ? 'text-gray-500 hover:text-brass' : 'text-ink-blue/40 hover:text-brass'}`}
                >
                  <FontAwesomeIcon icon={s.icon} size="lg" />
                </a>
              ))}
            </div>
          </div>

          {/* Docket-style link index */}
          <div>
            <p className={`docket-label text-[11px] mb-4 ${dark ? 'text-gray-500' : 'text-ink-blue/40'}`}>Index</p>
            <ul className="space-y-2.5">
              {links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className={`text-sm transition-colors duration-200 ${dark ? 'text-gray-300 hover:text-brass' : 'text-ink-blue/70 hover:text-brass'}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer bottom: case-record metadata line */}
        <div className={`docket-rule mt-10 pt-5 flex flex-col sm:flex-row justify-between items-center gap-2 font-mono text-[11px] tracking-wide ${dark ? 'text-gray-500' : 'text-ink-blue/40'
          }`}>
          <span>© {year} VaadVivaad — All rights reserved.</span>
          <span>Doc. Ref. VV-{year}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
