export default function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex gap-0.5 text-gold" role="img" aria-label={`${v} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <defs><linearGradient id={`half-${i}`}><stop offset="50%" stopColor="currentColor" /><stop offset="50%" stopColor="transparent" /></linearGradient></defs>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.4l6.6-.8z" stroke="currentColor" strokeWidth="1.2"
            fill={v >= i ? "currentColor" : v >= i - 0.5 ? `url(#half-${i})` : "none"} />
        </svg>
      ))}
    </span>
  );
}
