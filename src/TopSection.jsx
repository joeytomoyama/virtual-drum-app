export default function TopSection({ className = "" }) {
  return (
    <section
      className={`w-full rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur ${className}`}
    />
  );
}