import { useState } from "react";
import { Calendar, MapPin, Pencil, Check, X, DollarSign } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AirportInput } from "@/components/AirportInput";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { LivePriceButton } from "./LivePriceButton";

function deriveRouteFromSegments(segments: any[]) {
  const validSegs = Array.isArray(segments) ? segments.filter(Boolean) : [];
  if (validSegs.length === 0) return null;
  const first = validSegs[0];
  const last = validSegs[validSegs.length - 1];
  const origin = first?.origin_iata || first?.origin || first?.from || first?.depart_airport || null;
  const destination =
    last?.destination_iata ||
    last?.destination ||
    last?.to ||
    last?.arrive_airport ||
    null;
  if (!origin || !destination) return null;
  return { origin, destination, source: "segments" as const };
}

function deriveRouteFromTrip(trip: any) {
  const origin = trip?.origin_iata || trip?.origin || null;
  const destination = trip?.destination_iata || trip?.destination || null;
  if (!origin || !destination) return null;
  return { origin, destination, source: "trip_fields" as const };
}

function deriveRouteFromDisplay(trip: any) {
  const rawDisplay = trip?.route_display || trip?.full_route;
  if (typeof rawDisplay !== "string" || rawDisplay.trim() === "") return null;
  const parts = rawDisplay.split("→").map((part: string) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { origin: parts[0], destination: parts[parts.length - 1], source: "display" as const };
}

function deriveRoute(trip: any, segments: any[]) {
  return (
    deriveRouteFromSegments(segments) ||
    deriveRouteFromTrip(trip) ||
    deriveRouteFromDisplay(trip)
  );
}

function deriveDates(trip: any, segments: any[]) {
  const validSegs = Array.isArray(segments) ? segments.filter((segment) => !!segment) : [];
  if (validSegs.length > 0) {
    const departDate = new Date(validSegs[0].depart_datetime ?? validSegs[0].departure_datetime);
    const returnDate =
      validSegs.length > 1
        ? new Date(validSegs[validSegs.length - 1].depart_datetime ?? validSegs[validSegs.length - 1].departure_datetime)
        : null;
    if (!Number.isNaN(departDate.getTime())) {
      return {
        departDate,
        returnDate: returnDate && !Number.isNaN(returnDate.getTime()) ? returnDate : null,
        source: "segments" as const,
      };
    }
  }

  if (trip?.depart_date) {
    const departDate = new Date(trip.depart_date);
    const returnDate = trip.return_date ? new Date(trip.return_date) : null;
    if (!Number.isNaN(departDate.getTime())) {
      return {
        departDate,
        returnDate: returnDate && !Number.isNaN(returnDate.getTime()) ? returnDate : null,
        source: "trip_fields" as const,
      };
    }
  }

  if (trip?.departure_date) {
    const departDate = new Date(trip.departure_date);
    if (!Number.isNaN(departDate.getTime())) {
      return { departDate, returnDate: null, source: "departure_date" as const };
    }
  }

  return null;
}

interface TripRouteSummaryProps {
  trip: any;
  segments: any[];
  onUpdate?: () => void;
}

export const TripRouteSummary = ({ trip, segments, onUpdate }: TripRouteSummaryProps) => {
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Route editing state
  const [editOrigin, setEditOrigin] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [selectedOriginIATA, setSelectedOriginIATA] = useState<string | null>(null);
  const [selectedDestIATA, setSelectedDestIATA] = useState<string | null>(null);

  // Date editing state
  const [editDepartDate, setEditDepartDate] = useState<Date | undefined>();
  const [editReturnDate, setEditReturnDate] = useState<Date | undefined>();

  const route = deriveRoute(trip, segments);
  const dates = deriveDates(trip, segments);
  const travelDatesDisplay = typeof trip?.travel_dates_display === "string" ? trip.travel_dates_display : null;
  const editableDepartDate = dates?.departDate ?? null;
  const editableReturnDate = dates?.returnDate ?? null;
  const hasEditableDates = !!editableDepartDate;

  const lastLivePrice = typeof trip.last_live_price === "number"
    ? trip.last_live_price
    : typeof trip.last_live_price === "string"
      ? Number.parseFloat(trip.last_live_price)
      : null;
  const lastLiveCurrency = trip.last_live_price_currency || "USD";
  const lastLiveCheckedAt = trip.last_live_checked_at ? new Date(trip.last_live_checked_at) : null;
  const validLastLiveCheckedAt = lastLiveCheckedAt && !Number.isNaN(lastLiveCheckedAt.getTime()) ? lastLiveCheckedAt : null;
  const lastLiveSource = trip.last_live_source || null;
  const livePriceConfidence = trip.live_price_confidence || null;
  const isDeltaTrip = trip.airline === "DL";

  const formattedLivePrice = lastLivePrice != null && !Number.isNaN(lastLivePrice)
    ? (() => {
        try {
          return new Intl.NumberFormat("en-US", { style: "currency", currency: lastLiveCurrency }).format(lastLivePrice);
        } catch {
          return `$${lastLivePrice.toFixed(2)}`;
        }
      })()
    : null;

  const confidenceLabels: Record<string, string> = {
    "exact-flight": "Exact flight match",
    "route-estimate": "Route estimate",
    unknown: "Unknown confidence",
  };

  const sourceLabels: Record<string, string> = {
    "delta-manage": "Delta Manage Trip",
    "delta-shop": "Delta Shop",
  };

  const handleSaveRoute = async () => {
    if (!selectedOriginIATA || !selectedDestIATA) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select both origin and destination airports"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          origin_iata: selectedOriginIATA,
          destination_iata: selectedDestIATA,
          full_route: `${selectedOriginIATA} → ${selectedDestIATA}`
        })
        .eq("id", trip.id);

      if (error) throw error;

      toast({
        title: "Route updated",
        description: `${selectedOriginIATA} → ${selectedDestIATA}`
      });

      setIsEditingRoute(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update route",
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDates = async () => {
    if (!editDepartDate) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a departure date"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          depart_date: format(editDepartDate, "yyyy-MM-dd"),
          return_date: editReturnDate ? format(editReturnDate, "yyyy-MM-dd") : null,
          departure_date: format(editDepartDate, "yyyy-MM-dd")
        })
        .eq("id", trip.id);

      if (error) throw error;

      toast({
        title: "Dates updated",
        description: editReturnDate 
          ? `${format(editDepartDate, "MMM d")} - ${format(editReturnDate, "MMM d, yyyy")}`
          : format(editDepartDate, "MMM d, yyyy")
      });

      setIsEditingDates(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update dates",
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Live Price Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span>Live price</span>
          </div>
          {isDeltaTrip ? (
            <LivePriceButton tripId={trip.id} onUpdate={onUpdate} />
          ) : (
            <span className="text-xs text-muted-foreground">Live price available for Delta flights only</span>
          )}
        </div>
        {formattedLivePrice ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs font-medium">
              {formattedLivePrice}
            </Badge>
            {validLastLiveCheckedAt && (
              <span>
                Checked {formatDistanceToNow(validLastLiveCheckedAt, { addSuffix: true })}
              </span>
            )}
            {lastLiveSource && (
              <Badge variant="outline" className="text-xs font-medium">
                {sourceLabels[lastLiveSource] || lastLiveSource}
              </Badge>
            )}
            {livePriceConfidence && (
              <Badge variant="outline" className="text-xs font-medium">
                {confidenceLabels[livePriceConfidence] || livePriceConfidence}
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No live price yet.</p>
        )}
      </div>

      {/* Route Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Route</span>
          </div>
          {!isEditingRoute && route && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditOrigin(route.origin);
                setEditDestination(route.destination);
                setSelectedOriginIATA(route.origin);
                setSelectedDestIATA(route.destination);
                setIsEditingRoute(true);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        {!isEditingRoute ? (
          route ? (
            <div className="text-lg font-semibold">
              {route.origin} → {route.destination}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">No route data</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingRoute(true)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Add route
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <AirportInput
                label="From"
                value={editOrigin}
                onChange={setEditOrigin}
                onSelectAirport={(airport) => setSelectedOriginIATA(airport.iata)}
                placeholder="Origin airport"
              />
              <AirportInput
                label="To"
                value={editDestination}
                onChange={setEditDestination}
                onSelectAirport={(airport) => setSelectedDestIATA(airport.iata)}
                placeholder="Destination airport"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveRoute}
                disabled={isSaving || !selectedOriginIATA || !selectedDestIATA}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingRoute(false);
                  setEditOrigin("");
                  setEditDestination("");
                  setSelectedOriginIATA(null);
                  setSelectedDestIATA(null);
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dates Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Travel Dates</span>
          </div>
          {!isEditingDates && hasEditableDates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditDepartDate(editableDepartDate ?? undefined);
                setEditReturnDate(editableReturnDate ?? undefined);
                setIsEditingDates(true);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        {!isEditingDates ? (
          travelDatesDisplay ? (
            <div className="text-sm">{travelDatesDisplay}</div>
          ) : dates ? (
            <div className="text-sm">
              {dates.departDate && format(dates.departDate, "MMM d, yyyy")}
              {dates.returnDate && (
                <span> - {format(dates.returnDate, "MMM d, yyyy")}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">No date data</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDates(true)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Add dates
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Departure</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editDepartDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editDepartDate ? format(editDepartDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={editDepartDate}
                      onSelect={setEditDepartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Return (optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editReturnDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editReturnDate ? format(editReturnDate, "MMM d, yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarUI
                      mode="single"
                      selected={editReturnDate}
                      onSelect={setEditReturnDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveDates}
                disabled={isSaving || !editDepartDate}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingDates(false);
                  setEditDepartDate(undefined);
                  setEditReturnDate(undefined);
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
