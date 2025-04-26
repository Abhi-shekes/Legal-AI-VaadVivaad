import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faPhone, 
  faMapMarkerAlt, 
  faUserTie 
} from '@fortawesome/free-solid-svg-icons';
import themeStore from '../store/themeStore';

const ContactUs = () => {
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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-black'}`}>
      {/* Hero Section */}
      <motion.section 
        className="pt-32 pb-16 px-4 md:px-10 lg:px-20 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="w-full max-w-7xl mx-auto">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-[#0a2463]">Meet</span> <span className="text-[#d4af37]">Our</span> <span>Team</span>
            </h1>
            <p className={`text-lg md:text-xl mb-12 max-w-3xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Our team of legal experts and mentors are dedicated to revolutionizing the legal industry through AI-powered solutions and expert guidance.
            </p>
          </motion.div>
        </div>
      </motion.section>
      
      {/* Team Members Section */}
      <section className={`py-16 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <motion.div 
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={controls}
            className="grid grid-cols-1 md:grid-cols-2 gap-10"
          >
            {/* Team Member 1 */}
            <motion.div 
              variants={itemVariants}
              className={`p-8 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2 flex flex-col md:flex-row gap-6`}
            >
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-r from-[#0a2463] to-[#0a2463]/70 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="text-white text-4xl" />
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-2">Abhishek Tiwari</h3>
                <p className="text-[#d4af37] font-semibold mb-3">Student</p>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  With over 2 years of experience in machine learning and artificial intelligence, Abhishek specializes in AI-driven legal research and case analysis methodologies.
                </p>
                <div className="flex gap-4">
                  <a href="mailto:abhishek.tiwari24@spit.ac.in" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Email</span>
                  </a>
                  <a href="tel:+1234567890" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faPhone} />
                    <span>Contact</span>
                  </a>
                </div>
              </div>
            </motion.div>
            
            {/* Team Member 2 */}
            <motion.div 
              variants={itemVariants}
              className={`p-8 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2 flex flex-col md:flex-row gap-6`}
            >
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-r from-[#d4af37] to-[#d4af37]/70 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="text-white text-4xl" />
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-2">Deepak Yadav</h3>
                <p className="text-[#d4af37] font-semibold mb-3">Student</p>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Deepak bridges the gap between legal expertise and technology, specializing in AI algorithms for predictive legal analytics.
                </p>
                <div className="flex gap-4">
                  <a href="mailto:deepak.yadav24@spit.ac.in" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Email</span>
                  </a>
                  <a href="tel:+1234567891" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faPhone} />
                    <span>Contact</span>
                  </a>
                </div>
              </div>
            </motion.div>
            
            {/* Team Member 3 */}
            <motion.div 
              variants={itemVariants}
              className={`p-8 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2 flex flex-col md:flex-row gap-6`}
            >
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-r from-[#0a2463] to-[#0a2463]/70 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="text-white text-4xl" />
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-2">Iffat Patel</h3>
                <p className="text-[#d4af37] font-semibold mb-3">Student</p>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Iffat leads our legal research initiatives, with expertise in constitutional law and developing AI-powered research methodologies.
                </p>
                <div className="flex gap-4">
                  <a href="mailto:iffat.patel24@spit.ac.in" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Email</span>
                  </a>
                  <a href="tel:+1234567892" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faPhone} />
                    <span>Contact</span>
                  </a>
                </div>
              </div>
            </motion.div>
            
            {/* Team Member 4 */}
            <motion.div 
              variants={itemVariants}
              className={`p-8 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-[#1f1f1f] hover:bg-[#252525]' : 'bg-white hover:bg-gray-50'} transition-all duration-300 transform hover:-translate-y-2 flex flex-col md:flex-row gap-6`}
            >
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-r from-[#d4af37] to-[#d4af37]/70 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserTie} className="text-white text-4xl" />
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-bold mb-2">Aarti Karande</h3>
                <p className="text-[#d4af37] font-semibold mb-3">Mentor</p>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Aarti specializes in legal document automation and AI-driven contract analysis, helping firms streamline their documentation processes.
                </p>
                <div className="flex gap-4">
                  <a href="mailto:aarti@legalai.com" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Email</span>
                  </a>
                  <a href="tel:+1234567893" className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-black'}`}>
                    <FontAwesomeIcon icon={faPhone} />
                    <span>Contact</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Contact Form Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-10 grid md:grid-cols-2 gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center"
          >
            <div className="inline-block rounded-lg bg-[#0a2463] text-white px-4 py-2 text-sm mb-4">Get in Touch</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Have Questions? <span className="text-[#d4af37]">Contact Us</span>
            </h2>
            <p className={`mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Our team of legal AI experts is ready to answer your questions and help you leverage our platform for your practice.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#0a2463] text-white p-3 rounded-lg">
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Our Location</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    Sardar Patel Institute of Technology, Munshi Nagar<br />
                    Azad Nagar.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#d4af37] text-white p-3 rounded-lg">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Email Us</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    info@legalai.com<br />
                    support@legalai.com
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-[#0a2463] text-white p-3 rounded-lg">
                  <FontAwesomeIcon icon={faPhone} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Call Us</h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    +1 (555) 123-4567<br />
                    +1 (555) 987-6543
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className={`rounded-xl shadow-lg p-8 ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-white'}`}
          >
            <h3 className="text-2xl font-bold mb-6">Send Us a Message</h3>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className={`block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Your Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    className={`w-full px-4 py-3 rounded-md border ${theme === 'dark' ? 'bg-[#252525] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#d4af37]`} 
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className={`block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Your Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    className={`w-full px-4 py-3 rounded-md border ${theme === 'dark' ? 'bg-[#252525] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#d4af37]`} 
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className={`block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
                <input 
                  type="text" 
                  id="subject" 
                  className={`w-full px-4 py-3 rounded-md border ${theme === 'dark' ? 'bg-[#252525] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#d4af37]`} 
                  placeholder="How can we help you?"
                />
              </div>
              
              <div>
                <label htmlFor="message" className={`block mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Your Message</label>
                <textarea 
                  id="message" 
                  rows={5} 
                  className={`w-full px-4 py-3 rounded-md border ${theme === 'dark' ? 'bg-[#252525] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-[#d4af37]`} 
                  placeholder="Write your message here..."
                ></textarea>
              </div>
              
              <motion.button 
                type="submit"
                className="bg-[#0a2463] hover:bg-[#071952] text-white font-bold py-3 px-8 rounded-md shadow-lg transition duration-300 ease-in-out w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Send Message
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>
      

      
      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a2463] opacity-90 z-0"></div>
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#d4af37] rounded-full opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#d4af37] rounded-full opacity-20 transform translate-x-1/3 translate-y-1/3"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 md:px-10 relative z-10">
          <motion.div 
            className="text-center text-white"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Legal Practice?</h2>
            <p className="text-xl mb-10 text-gray-100">
              Join thousands of legal professionals who are already leveraging our AI platform to win more cases and serve clients better.
            </p>
            <motion.button 
              className="bg-[#d4af37] hover:bg-[#c4a030] text-[#0a2463] font-bold py-4 px-10 rounded-md shadow-lg transition duration-300 ease-in-out text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Schedule a Demo
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;