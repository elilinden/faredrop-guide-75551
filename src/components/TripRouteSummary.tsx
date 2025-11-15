import { useState, useEffect } from "react";
import { Calendar, MapPin, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AirportInput } from "@/components/AirportInput";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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

  // Derive route from multiple sources (with priority order)
  const deriveRoute = () => {
    // 1. Try route_display from lookup (Delta parsing)
    if (trip.route_display) {
      const parts = trip.route_display.split("→").map((p: string) => p.trim());
      if (parts.length >= 2) {
        return { origin: parts[0], destination: parts[parts.length - 1], source: "route_display" };
      }
    }

    // 2. Try segments
    const validSegs = segments.filter(s => s.depart_airport && s.arrive_airport);
    if (validSegs.length > 0) {
      const origin = validSegs[0].depart_airport;
      const destination = validSegs[validSegs.length - 1].arrive_airport;
      return { origin, destination, source: "segments" };
    }

    // 3. Try full_route
    if (trip.full_route) {
      const parts = trip.full_route.split("→").map((p: string) => p.trim());
      if (parts.length >= 2) {
        return { origin: parts[0], destination: parts[parts.length - 1], source: "full_route" };
      }
    }

    // 4. Try origin_iata/destination_iata
    if (trip.origin_iata && trip.destination_iata) {
      return { origin: trip.origin_iata, destination: trip.destination_iata, source: "trip_fields" };
    }

    return null;
  };

  // Derive dates from multiple sources
  const deriveDates = () => {
    // 1. Check if we have travel_dates_display - use it for display only
    if (trip.travel_dates_display) {
      // Return as-is for display, without parsing
      return { displayText: trip.travel_dates_display, source: "travel_dates_display" };
    }

    // 2. Try segments
    const validSegs = segments.filter(s => s.depart_datetime);
    if (validSegs.length > 0) {
      const departDate = new Date(validSegs[0].depart_datetime);
      const returnDate = validSegs.length > 1 ? new Date(validSegs[validSegs.length - 1].depart_datetime) : null;
      return { departDate, returnDate, source: "segments" };
    }

    // 3. Try trip fields
    if (trip.depart_date) {
      const departDate = new Date(trip.depart_date);
      const returnDate = trip.return_date ? new Date(trip.return_date) : null;
      return { departDate, returnDate, source: "trip_fields" };
    }

    // 4. Try departure_date field
    if (trip.departure_date) {
      const departDate = new Date(trip.departure_date);
      return { departDate, returnDate: null, source: "departure_date" };
    }

    return null;
  };

  const route = deriveRoute();
  const dates = deriveDates();

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
          {!isEditingDates && dates && !dates.displayText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditDepartDate(dates.departDate);
                setEditReturnDate(dates.returnDate || undefined);
                setIsEditingDates(true);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>

        {!isEditingDates ? (
          dates ? (
            dates.displayText ? (
              // Display the pre-formatted travel dates from Delta
              <div className="text-sm">{dates.displayText}</div>
            ) : (
              // Format the parsed dates
              <div className="text-sm">
                {dates.departDate && format(dates.departDate, "MMM d, yyyy")}
                {dates.returnDate && (
                  <span> - {format(dates.returnDate, "MMM d, yyyy")}</span>
                )}
              </div>
            )
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
