import themeStore from "../../store/themeStore";

function scorePassword(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: "Very weak", color: "bg-red-500" },
  { label: "Weak", color: "bg-orange-500" },
  { label: "Fair", color: "bg-yellow-500" },
  { label: "Good", color: "bg-lime-500" },
  { label: "Strong", color: "bg-emerald-500" },
];

export default function PasswordStrengthMeter({ password }) {
  const { theme } = themeStore((state) => state);
  const dark = theme === "dark";
  const score = scorePassword(password);
  const level = LEVELS[score];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? level.color : dark ? "bg-white/10" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Password strength: <span className="font-medium">{level.label}</span>
      </p>
    </div>
  );
}
