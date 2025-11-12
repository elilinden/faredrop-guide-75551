import { AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  variant?: "warning" | "info" | "success";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const AlertBanner = ({
  variant = "info",
  title,
  children,
  className,
}: AlertBannerProps) => {
  const icons = {
    warning: AlertCircle,
    info: Info,
    success: CheckCircle2,
  };

  const Icon = icons[variant];

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg border",
        variant === "warning" && "bg-warning/5 border-warning/20 text-warning-foreground",
        variant === "info" && "bg-accent border-border",
        variant === "success" && "bg-success/5 border-success/20 text-success-foreground",
        className
      )}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold text-sm">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
};
