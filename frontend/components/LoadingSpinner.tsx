export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "h-4 w-4 border-2",
    md: "h-7 w-7 border-[2.5px]",
    lg: "h-10 w-10 border-[3px]",
  };
  return (
    <div
      className={`animate-spin rounded-full border-zinc-200 border-t-brand-500 ${sizeMap[size]}`}
      role="status"
      aria-label="Loading"
    />
  );
}
