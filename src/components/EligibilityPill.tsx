import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBasicEconomy } from "@/lib/airlines";

interface EligibilityPillProps {
  brand: string | null;
  className?: string;
}

export const EligibilityPill = ({ brand, className }: EligibilityPillProps) => {
  const isIneligible = isBasicEconomy(brand);
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        isIneligible
          ? "bg-warning/10 text-warning"
          : "bg-success/10 text-success",
        className
      )}
    >
      {isIneligible ? (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          Likely ineligible
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Likely eligible
        </>
      )}
    </div>
  );
};
