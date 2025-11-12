import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AirlineBadge } from "@/components/AirlineBadge";
import { EligibilityPill } from "@/components/EligibilityPill";
import { Calendar, DollarSign, ArrowRight, Bell, BellOff } from "lucide-react";
import { Link } from "react-router-dom";
import { type AirlineKey } from "@/lib/airlines";
import { format } from "date-fns";

interface TripCardProps {
  trip: {
    id: string;
    airline: AirlineKey;
    confirmation_code: string;
    brand: string | null;
    paid_total: number;
    depart_date: string | null;
    return_date: string | null;
    monitoring_enabled?: boolean;
  };
  segments: Array<{
    depart_airport: string;
    arrive_airport: string;
  }>;
}

export const TripCard = ({ trip, segments }: TripCardProps) => {
  const route = segments.length > 0
    ? `${segments[0].depart_airport} → ${segments[segments.length - 1].arrive_airport}`
    : "Route not set yet";

  const dateDisplay = trip.depart_date
    ? `${format(new Date(trip.depart_date), "MMM d")}${trip.return_date ? ` - ${format(new Date(trip.return_date), "MMM d")}` : ""}`
    : "Date TBD";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AirlineBadge airline={trip.airline} />
              {trip.monitoring_enabled !== false && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Bell className="w-3 h-3" />
                  Monitoring
                </Badge>
              )}
              {trip.monitoring_enabled === false && (
                <Badge variant="outline" className="text-xs gap-1">
                  <BellOff className="w-3 h-3" />
                  Off
                </Badge>
              )}
              <span className="font-mono text-xs text-muted-foreground">
                {trip.confirmation_code}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {trip.airline} · {trip.confirmation_code}
            </h3>
            <p className="text-sm text-muted-foreground">{route}</p>
          </div>
          {trip.brand && <EligibilityPill brand={trip.brand} />}
        </div>

        <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{dateDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />
            <span>Paid ${trip.paid_total.toFixed(2)}</span>
          </div>
        </div>

        <Link to={`/trips/${trip.id}`}>
          <Button variant="outline" className="w-full">
            Open Guided Reprice
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
