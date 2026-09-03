import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import themeStore from "../../store/themeStore";

export default function FormField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  error,
  isPassword = false,
  ...rest
}) {
  const { theme } = themeStore((state) => state);
  const dark = theme === "dark";
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  const floated = focused || value?.length > 0;
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div>
      <div
        className={`group relative rounded-lg border transition-colors ${
          error
            ? "border-red-500"
            : focused
            ? "border-[#d4af37] ring-2 ring-[#d4af37]/20"
            : dark
            ? "border-white/15 hover:border-white/25"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {Icon && (
          <Icon
            size={16}
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
              focused ? "text-[#d4af37]" : dark ? "text-gray-500" : "text-gray-400"
            }`}
          />
        )}

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`peer w-full bg-transparent outline-none pt-5 pb-2 text-sm ${
            Icon ? "pl-10" : "pl-3.5"
          } ${isPassword ? "pr-10" : "pr-3.5"} ${dark ? "text-white" : "text-gray-900"}`}
          placeholder=" "
          {...rest}
        />

        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-0 origin-left transition-all duration-150 ${
            Icon ? "left-10" : "left-3.5"
          } ${
            floated
              ? "top-1.5 text-[11px] scale-100"
              : `top-1/2 -translate-y-1/2 text-sm ${dark ? "text-gray-500" : "text-gray-400"}`
          } ${floated && (focused ? "text-[#d4af37]" : dark ? "text-gray-400" : "text-gray-500")}`}
        >
          {label}
        </label>

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
              dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
