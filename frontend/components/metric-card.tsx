export function MetricCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "warning" | "success" | "info";
}) {
  return (
    <article className={`metric-card ${tone ? `metric-${tone}` : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
