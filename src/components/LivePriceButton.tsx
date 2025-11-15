import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.functions.invoke("check-delta-fare", {
        body: { trip_id: tripId },
      });

      if (error || !data) {
        console.error("check-delta-fare error", error);
        setLast("Error");
        return;
      }

      if (data.ok && data.trip) {
        const priceValue = typeof data.trip.last_live_price === "number"
          ? data.trip.last_live_price
          : Number.parseFloat(String(data.trip.last_live_price ?? ""));
        const currency = data.trip.last_live_price_currency ?? "USD";
        const source = data.trip.last_live_source ?? "unknown";
        const confidence = data.trip.live_price_confidence ?? "unknown";

        const formattedPrice = Number.isFinite(priceValue)
          ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(priceValue)
          : null;

        const parts = [formattedPrice, source, confidence].filter(Boolean);
        setLast(parts.join(" · "));
        onUpdate?.();
      } else {
        setLast(data.reason === "price_not_found" ? "Not found" : "Error");
      }
    } catch (error) {
      console.error("Failed to check live price", error);
      setLast("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={run} disabled={loading} className="h-9 px-3 text-sm font-medium">
        {loading ? "Checking…" : "Check live price"}
      </Button>
      {last && <span className="text-xs text-muted-foreground">Last: {last}</span>}
    </div>
  );
}
