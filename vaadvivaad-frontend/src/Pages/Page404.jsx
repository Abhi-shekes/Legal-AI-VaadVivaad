import React from 'react';
import { Link } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import themeStore from '../store/themeStore';

const Page404 = () => {
  const { theme } = themeStore((state) => state);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen px-4 py-8 space-y-6 text-center transition-colors ${
        theme === 'dark' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
      }`}
    >
      {/* Lottie Animation with Dynamic Size */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <DotLottieReact
          src="https://lottie.host/b16147f4-25a8-4f06-9df2-8e8722d42beb/QnBYBwBaI0.lottie"
          loop
          autoplay
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '300px', // limits height for better visual balance
          }}
        />
      </div>

      {/* Heading */}
      <h1 className="text-8xl md:text-9xl font-extrabold text-blue-500">
        404
      </h1>
      <h2 className="text-3xl md:text-4xl font-semibold">
        Oops! Page Not Found
      </h2>
      <p className="text-lg max-w-md md:max-w-lg">
        The page you are looking for might have been removed, renamed, or is temporarily unavailable.
      </p>

      {/* Back to Home Button */}
      <Link
        to="/"
        className="mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition duration-300"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default Page404;