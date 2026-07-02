export function ScoreRing({
  score,
  size = 88,
}: {
  score: number | null;
  size?: number;
}) {
  const value = score ?? 0;
  const color =
    score == null
      ? "#a8a29e"
      : value >= 75
        ? "#059669"
        : value >= 50
          ? "#c8623f"
          : "#dc2626";
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#eeebe4"
        strokeWidth="8"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.4s ease" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.3}
        fontWeight="700"
        fill={color}
      >
        {score == null ? "—" : value}
      </text>
    </svg>
  );
}
