export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="100" height="100" rx="24" fill="#0a1830" />
      <ellipse
        cx="50"
        cy="50"
        rx="34"
        ry="15"
        transform="rotate(-30 50 50)"
        stroke="#5aa2fa"
        strokeWidth="6"
        fill="none"
      />
      <circle cx="50" cy="50" r="11" fill="#ffffff" />
    </svg>
  );
}
