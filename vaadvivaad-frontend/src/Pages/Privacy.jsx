import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import themeStore from '../store/themeStore';

const SECTIONS = [
  {
    title: '1. What we collect',
    body: [
      'Account details: your name, email address, and password (hashed with bcrypt — we never see or store it in plain text).',
      'Case data: the incident descriptions and evidence text you submit, plus the debate transcripts generated from them.',
    ],
  },
  {
    title: '2. How we use it',
    body: [
      'To authenticate you (a single HTTP-only session cookie), to generate and search for arguments relevant to your case, and to save your case history so you can revisit it from your dashboard.',
    ],
  },
  {
    title: '3. Third-party processing',
    body: [
      'The text of your case and evidence is sent to Google’s Gemini API to generate arguments and to compute the embeddings used for search — that’s how the debate actually gets written. Vector search itself runs on our own self-hosted Qdrant instance, not a third party.',
      'We don’t sell your data, and we don’t share it with advertisers or data brokers.',
    ],
  },
  {
    title: '4. Cookies',
    body: [
      'One HTTP-only, session cookie that keeps you logged in. No third-party tracking or advertising cookies.',
    ],
  },
  {
    title: '5. Data retention & deletion',
    body: [
      'Your data is kept for as long as your account exists. There’s no self-service delete button yet — email us via the Contact page and we’ll remove your account and case history by hand.',
    ],
  },
  {
    title: '6. Security',
    body: [
      'Passwords are hashed with bcrypt before storage. The database itself is authenticated and not exposed publicly.',
    ],
  },
  {
    title: '7. Changes to this policy',
    body: [
      'We may update this policy as the project evolves. Meaningful changes will be reflected here with an updated date.',
    ],
  },
];

const Privacy = () => {
  const { theme } = themeStore((state) => state);
  const dark = theme === 'dark';
  const muted = dark ? 'text-gray-400' : 'text-ink-blue/60';
  const faint = dark ? 'text-gray-500' : 'text-ink-blue/50';

  return (
    <div className={`min-h-screen ${dark ? 'bg-ink text-white' : 'bg-parchment text-ink-blue'}`}>
      <section className="pt-28 md:pt-36 pb-14 px-4 md:px-10 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`docket-label text-xs mb-4 ${faint}`}
          >
            On the record
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl mb-4"
          >
            Privacy <span className="text-brass">Policy</span>
          </motion.h1>
          <p className={`font-mono text-xs ${faint}`}>Last updated September 4, 2026</p>
        </div>
      </section>

      <section className="pb-24 md:pb-32 px-4 md:px-10">
        <div className="max-w-3xl mx-auto">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3) }}
              className={`py-7 ${i !== 0 ? 'docket-rule' : ''}`}
            >
              <h2 className="font-display text-xl md:text-2xl mb-3">{s.title}</h2>
              {s.body.map((p, j) => (
                <p key={j} className={`text-sm leading-relaxed mb-2.5 last:mb-0 ${muted}`}>
                  {p}
                </p>
              ))}
            </motion.div>
          ))}

          <div className="docket-rule pt-8 mt-2">
            <p className={`text-sm leading-relaxed ${muted}`}>
              Questions, or want your data deleted? Reach out via the{' '}
              <Link to="/contact" className="font-medium text-brass hover:underline">
                Contact page
              </Link>{' '}
              — or read the{' '}
              <Link to="/terms" className="font-medium text-brass hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
