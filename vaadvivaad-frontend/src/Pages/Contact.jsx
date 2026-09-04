import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, MapPin, ArrowRight, Linkedin } from 'lucide-react';
import themeStore from '../store/themeStore';
import abhishekPhoto from '../assets/team/abhishek.jpg';
import deepakPhoto from '../assets/team/deepak.jpg';
import iffatPhoto from '../assets/team/iffat.jpg';
import aartiPhoto from '../assets/team/aarti.jpg';

const TEAM = [
  {
    name: 'Abhishek Tiwari',
    role: 'Student',
    bio: 'Specializes in AI-driven legal research and case-analysis methodology.',
    email: 'abhishek.tiwari24@spit.ac.in',
    linkedin: 'https://www.linkedin.com/in/abhishek-tiwari-6172a6223/',
    photo: abhishekPhoto,
  },
  {
    name: 'Deepak Yadav',
    role: 'Student',
    bio: 'Bridges legal expertise and technology — AI algorithms for predictive legal analytics.',
    email: 'deepak.yadav24@spit.ac.in',
    linkedin: 'https://www.linkedin.com/in/deepak7449/',
    photo: deepakPhoto,
  },
  {
    name: 'Iffat Patel',
    role: 'Student',
    bio: 'Leads legal research, with expertise in constitutional law and AI research methodology.',
    email: 'iffat.patel24@spit.ac.in',
    linkedin: 'https://www.linkedin.com/in/iffatspatel',
    photo: iffatPhoto,
  },
  {
    name: 'Aarti Karande',
    role: 'Mentor',
    bio: 'Specializes in legal document automation and AI-driven contract analysis.',
    email: 'aartimkarande@gmail.com',
    linkedin: 'https://www.linkedin.com/in/aartimkarande/',
    photo: aartiPhoto,
  },
];

const ContactUs = () => {
  const { theme } = themeStore((state) => state);
  const navigate = useNavigate();
  const dark = theme === 'dark';

  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    if (inView) controls.start('visible');
  }, [controls, inView]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const inputClass = `w-full px-4 py-3 rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brass ${dark
    ? 'bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600'
    : 'bg-white border-ink-blue/15 text-ink-blue placeholder:text-ink-blue/30'
    }`;
  const labelClass = `block mb-2 text-sm font-medium ${dark ? 'text-gray-300' : 'text-ink-blue/70'}`;

  return (
    <div className={`min-h-screen ${dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'}`}>
      {/* Hero */}
      <section className="pt-28 md:pt-36 lg:pt-40 pb-14 px-4 md:px-10 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`docket-label text-xs mb-4 ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}
          >
            Counsel of record
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-5"
          >
            Meet the <span className="text-brass">team</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`text-base md:text-lg ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}
          >
            The people building VaadVivaad — an AI-adjudicated debate platform for Indian case law.
          </motion.p>
        </div>
      </section>

      {/* Team roster */}
      <section className={`py-14 md:py-20 px-4 md:px-10 ${dark ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto">
          <motion.div ref={ref} variants={containerVariants} initial="hidden" animate={controls}>
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                variants={itemVariants}
                className={`flex flex-col md:flex-row md:items-center gap-5 py-7 ${i !== 0 ? 'docket-rule' : ''}`}
              >
                <img
                  src={member.photo}
                  alt={member.name}
                  loading="lazy"
                  width={64}
                  height={64}
                  className={`flex-shrink-0 w-16 h-16 rounded-full object-cover border ${dark ? 'border-white/15' : 'border-ink-blue/10'}`}
                />
                <div className="flex-grow max-w-xl">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <span className="docket-label text-[11px] text-brass">{member.role}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
                    {member.bio}
                  </p>
                </div>
                <div className={`flex flex-col md:items-end gap-1.5 flex-shrink-0 md:ml-auto text-sm ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-brass"
                  >
                    <Mail size={13} />
                    {member.email}
                  </a>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-brass"
                  >
                    <Linkedin size={13} />
                    LinkedIn
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Get in touch + form */}
      <section className="py-16 md:py-24 px-4 md:px-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className={`docket-label text-xs mb-3 ${dark ? 'text-gray-500' : 'text-ink-blue/50'}`}>Get in touch</p>
            <h2 className="font-display text-3xl md:text-4xl mb-5">
              Questions? <span className="text-brass">Reach out.</span>
            </h2>
            <p className={`mb-8 text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
              Email anyone on the roster above directly, or find us at:
            </p>

            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg flex-shrink-0 ${dark ? 'bg-brass/10 text-brass' : 'bg-ink-blue/5 text-ink-blue'}`}>
                <MapPin size={16} />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">Our location</h3>
                <p className={`text-sm ${dark ? 'text-gray-400' : 'text-ink-blue/60'}`}>
                  Sardar Patel Institute of Technology, Munshi Nagar<br />
                  Azad Nagar, Mumbai
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`rounded-xl p-7 md:p-8 border ${dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-ink-blue/10 shadow-sm'}`}
          >
            <h3 className="font-semibold text-lg mb-6">Send a message</h3>
            <form className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className={labelClass}>Your name</label>
                  <input type="text" id="name" className={inputClass} placeholder="Jane Doe" />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Your email</label>
                  <input type="email" id="email" className={inputClass} placeholder="jane@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className={labelClass}>Subject</label>
                <input type="text" id="subject" className={inputClass} placeholder="How can we help?" />
              </div>
              <div>
                <label htmlFor="message" className={labelClass}>Message</label>
                <textarea id="message" rows={5} className={inputClass} placeholder="Write your message here..." />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-brass text-ink font-semibold py-3 rounded-full transition-colors hover:bg-brass/90"
              >
                Send message
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 md:px-10 relative overflow-hidden bg-ink-blue">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-verdict/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-dissent/20 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto text-center relative z-10 text-white"
        >
          <h2 className="font-display text-3xl md:text-4xl mb-4">Ready to file a case?</h2>
          <p className="text-base md:text-lg text-blue-100/70 mb-8">
            See both sides argued — grounded in IPC sections and precedent.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 bg-brass text-ink font-semibold py-3.5 px-8 rounded-full shadow-lg transition-colors hover:bg-brass/90"
          >
            Create your account
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};

export default ContactUs;
