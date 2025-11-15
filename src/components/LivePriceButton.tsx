import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LivePriceButtonProps {
  tripId: string;
  onUpdate?: () => void;
}

export function LivePriceButton({ tripId, onUpdate }: LivePriceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/functions/v1/check-delta-fare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trip_id: tripId }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok && data?.trip) {
        const price = typeof data.trip.last_live_price === "number" ? data.trip.last_live_price : null;
        const currency = data.trip.last_live_price_currency ?? "USD";
        const source = data.trip.last_live_source ?? "unknown";
        const confidence = data.trip.live_price_confidence ?? "unknown";

        const formattedPrice = price != null
          ? (() => {
              try {
                return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
              } catch {
                return `$${price.toFixed(2)}`;
              }
            })()
          : null;

        const parts = [formattedPrice, source, confidence].filter(Boolean);
        setLast(parts.join(" · "));
        onUpdate?.();
      } else {
        const reason = data?.reason || data?.error || "not_found";
        setLast(reason === "price_not_found" ? "Not found" : "Error");
      }
    } catch (error) {
      console.error("Failed to check live price", error);
      setLast("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={loading} className="h-9 px-3 text-sm font-medium">
          {loading ? "Checking…" : "Check live price"}
        </Button>
        {last && <span className="text-xs text-muted-foreground">Last: {last}</span>}
      </div>
    </div>
  );
}
