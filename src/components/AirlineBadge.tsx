import { getAirlineColor, AIRLINE_NAMES, type AirlineKey } from "@/lib/airlines";
import { cn } from "@/lib/utils";

interface AirlineBadgeProps {
  airline: AirlineKey;
  className?: string;
}

export const AirlineBadge = ({ airline, className }: AirlineBadgeProps) => {
  const colorClass = getAirlineColor(airline);
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
        `bg-${colorClass}/10 text-${colorClass}`,
        className
      )}
      style={{
        backgroundColor: `hsl(var(--${colorClass}) / 0.1)`,
        color: `hsl(var(--${colorClass}))`,
      }}
    >
      {airline}
      <span className="font-normal opacity-75">{AIRLINE_NAMES[airline]}</span>
    </span>
  );
};
