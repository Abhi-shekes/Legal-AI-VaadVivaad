import authStore from '../store/authStore';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import themeStore from '../store/themeStore';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBalanceScale, faGavel, faBrain, faSearch, faFileAlt, faChartLine } from '@fortawesome/free-solid-svg-icons';

const Landing = () => {
  const navigate = useNavigate();

  const { isLoggedIn } = authStore((state) => state);
  const { theme } = themeStore((state) => state);

  // Animation controls
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
      <Header />

      {/* Hero Section */}
      <motion.section
        className="pt-20 md:pt-28 lg:pt-32 pb-12 md:pb-16 px-4 sm:px-6 md:px-10 lg:px-20 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-10">
          <motion.div
            className="lg:w-1/2 w-full"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-2 leading-tight text-center lg:text-left">
              <span className="text-[#0a2463]">Vaad</span> <span className="text-[#d4af37]">Vivaad</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-medium mb-4 md:mb-6 text-[#d4af37] text-center lg:text-left">
              <span className="font-semibold">वाद विवाद</span>
            </p>
            <p className={`text-base sm:text-lg md:text-xl mb-6 md:mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-center lg:text-left`}>
              Revolutionize your legal practice with AI-powered case analysis, research assistance, and document automation.
            </p>
            <div className="flex justify-center lg:justify-start">
              <motion.button
                className="bg-[#0a2463] hover:bg-[#071952] text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
              >
                Start Your Case Now
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            className="lg:w-1/2 w-full mt-8 lg:mt-0 relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-[400px] rounded-xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a2463]/80 to-[#0a2463]/40 z-10"></div>
              <img
                src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Legal AI Platform Interface"
                className="w-full h-full object-cover"
              />

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-center px-4">
                <div className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4">Intelligent Legal Analysis</div>
                <div className="bg-white/20 backdrop-blur-sm p-3 md:p-4 rounded-lg">
                  <div className="text-white text-sm md:text-base">Powered by advanced AI algorithms</div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              className="hidden sm:block absolute -top-6 -right-6 md:-top-10 md:-right-10 bg-[#d4af37] text-white p-2 md:p-4 rounded-full shadow-lg"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <FontAwesomeIcon icon={faBalanceScale} className="text-lg md:text-2xl" />
            </motion.div>

            <motion.div
              className="hidden sm:block absolute -bottom-4 -left-4 md:-bottom-5 md:-left-5 bg-[#0a2463] text-white p-2 md:p-3 rounded-full shadow-lg"
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 0.5
              }}
            >
              <FontAwesomeIcon icon={faGavel} className="text-base md:text-lg" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features-section" className={`py-12 md:py-16 lg:py-20 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div
            className="text-center mb-8 md:mb-12 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">
              <span className="text-[#d4af37]">Powerful</span> Features
            </h2>
            <p className={`max-w-2xl mx-auto text-sm sm:text-base md:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Our AI-powered platform offers a comprehensive suite of tools designed specifically for legal professionals.
            </p>
          </motion.div>

          <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={controls}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
          >
            {/* Feature 1 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#0a2463] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faBrain} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">AI Case Analysis</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Our advanced algorithms analyze case details to identify precedents, potential arguments, and success probabilities.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#d4af37] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faSearch} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Legal Research Assistant</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Instantly search and analyze thousands of legal documents, statutes, and case law to support your arguments.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#0a2463] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faFileAlt} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Document Automation</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Generate legal documents, contracts, and briefs with intelligent templates that adapt to your specific needs.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#d4af37] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faChartLine} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Predictive Analytics</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Leverage historical case data to predict outcomes and develop winning strategies for your clients.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#0a2463] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faGavel} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Jurisdiction Analysis</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Compare case outcomes across different jurisdictions to identify the most favorable venue for your case.
              </p>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              variants={itemVariants}
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2`}
            >
              <div className="bg-[#d4af37] text-white p-2 md:p-3 rounded-lg inline-block mb-3 md:mb-4">
                <FontAwesomeIcon icon={faBalanceScale} className="text-lg md:text-xl" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Risk Assessment</h3>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Identify potential risks and challenges in your case with our comprehensive risk assessment tools.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a2463] opacity-90 z-0"></div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-[#d4af37] rounded-full opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-[#d4af37] rounded-full opacity-20 transform translate-x-1/3 translate-y-1/3"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 relative z-10">
          <motion.div
            className="text-center text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Ready to Transform Your Legal Practice?</h2>
            <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 text-gray-100 px-4">
              Join thousands of legal professionals who are already leveraging our AI platform to win more cases and serve clients better.
            </p>
            <motion.button
              className="bg-[#d4af37] hover:bg-[#c4a030] text-[#0a2463] font-bold py-3 px-6 md:py-4 md:px-10 rounded-md shadow-lg transition duration-300 ease-in-out text-sm sm:text-base md:text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
            >
              Start Your Case Now
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={`py-12 md:py-16 lg:py-20 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div
            className="text-center mb-8 md:mb-12 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">
              Trusted by <span className="text-[#d4af37]">Legal Professionals</span>
            </h2>
            <p className={`max-w-2xl mx-auto text-sm sm:text-base md:text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              See what attorneys and law firms are saying about our AI-powered legal platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Testimonial 1 */}
            <motion.div
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-300 mr-3 md:mr-4"></div>
                <div>
                  <h4 className="font-bold text-sm md:text-base">Dr. Aarti Karande</h4>
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Mentor</p>
                </div>
              </div>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "This platform has revolutionized how we approach case research. We've reduced research time by 70% while improving the quality of our arguments."
              </p>
            </motion.div>

            {/* Testimonial 2 */}
            <motion.div
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-300 mr-3 md:mr-4"></div>
                <div>
                  <h4 className="font-bold text-sm md:text-base">Abhishek Tiwari</h4>
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Senior Attorney, Legal Defenders</p>
                </div>
              </div>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "The predictive analytics feature has been a game-changer for our practice. We can now provide clients with much more accurate assessments of their cases."
              </p>
            </motion.div>

            {/* Testimonial 3 */}
            <motion.div
              className={`p-5 md:p-6 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-300 mr-3 md:mr-4"></div>
                <div>
                  <h4 className="font-bold text-sm md:text-base">Deepak Yadav</h4>
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>High Court Judge</p>
                </div>
              </div>
              <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "Document automation alone has saved our firm countless hours. The AI understands legal nuances that other platforms miss completely."
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Landing;