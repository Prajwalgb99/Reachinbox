import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none select-none";

  const sizeStyles: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-full",
    md: "px-4 py-2 text-sm rounded-full",
    lg: "px-6 py-2.5 text-base rounded-full",
  };

  const variants: Record<string, string> = {
    primary:
      "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20",
    secondary:
      "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-soft",
    outline:
      "bg-transparent text-brand-600 border border-brand-500 hover:bg-brand-50",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 rounded-lg",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20",
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...rest}
    />
  );
}
