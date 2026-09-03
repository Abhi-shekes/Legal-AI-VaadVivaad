import React from 'react';
import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import themeStore from '../store/themeStore';

const Page404 = () => {
  const { theme } = themeStore((state) => state);

  const dark = theme === 'dark';

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen px-4 py-8 space-y-5 text-center transition-colors ${
        dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'
      }`}
    >
      {/* Lottie Animation with Dynamic Size */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
        <DotLottieReact
          src="https://lottie.host/b16147f4-25a8-4f06-9df2-8e8722d42beb/QnBYBwBaI0.lottie"
          loop
          autoplay
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '260px',
          }}
        />
      </div>

      <p className={`docket-label text-xs ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}>
        Case not found
      </p>
      <h1 className="font-display text-7xl md:text-8xl text-brass">404</h1>
      <h2 className="font-display text-2xl md:text-3xl">
        This page isn't on the docket.
      </h2>
      <p className={`text-base max-w-md ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
        The page you're looking for may have been moved, renamed, or never filed.
      </p>

      <Link
        to="/"
        className="mt-4 px-6 py-3 rounded-full bg-brass text-ink font-semibold hover:bg-brass/90 transition-colors"
      >
        Return to home
      </Link>
    </div>
  );
};

export default Page404;