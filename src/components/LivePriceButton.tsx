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
  const [trace, setTrace] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-delta-fare", {
        body: { trip_id: tripId, debug: false },
      });

      const traceId = (data && (data as any).trace_id) || null;
      setTrace(traceId);

      if (error || !data) {
        setLast("Error");
        console.error("check-delta-fare failed:", error);
        return;
      }

      if (data.ok && data.trip) {
        const price = Number.parseFloat(String(data.trip.last_live_price ?? "NaN"));
        const currency = data.trip.last_live_price_currency ?? "USD";
        const source = data.trip.last_live_source ?? "unknown";
        const conf = data.trip.live_price_confidence ?? "unknown";
        const formatted = Number.isFinite(price)
          ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price)
          : null;
        setLast([formatted, source, conf].filter(Boolean).join(" · "));
        onUpdate?.();
      } else {
        setLast(data.reason === "price_not_found" ? "Not found" : "Error");
      }
    } catch (err) {
      console.error(err);
      setLast("Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} disabled={loading} className="h-9 px-3 text-sm font-medium">
        {loading ? "Checking…" : "Check live price"}
      </Button>
      {last && <span className="text-xs text-muted-foreground">Last: {last}</span>}
      {trace && <span className="text-[10px] text-muted-foreground">trace: {trace}</span>}
    </div>
  );
}
