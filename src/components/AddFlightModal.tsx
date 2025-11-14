import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plane } from "lucide-react";
import { logAudit } from "@/lib/audit";

interface AddFlightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FlightSegment {
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  status: string;
  aircraft?: string;
  departureTerminal?: string;
  departureGate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  layoverDuration?: string;
  isChangeOfPlane?: boolean;
  segmentIndex?: number;
}

interface LookupResult {
  airline: string;
  confirmation: string;
  scraped: boolean;
  message?: string;
  flights: FlightSegment[];
  tripType?: string;
  destination?: string;
  ticketExpiration?: string;
  fullRoute?: string;
  totalDuration?: string;
  loyaltyStatus?: string;
  fareClass?: string;
  eticketNumber?: string;
  isRefundable?: boolean;
  segmentCount?: number;
}

const airlines = [
  { value: "delta", label: "Delta Air Lines", code: "DL" },
  { value: "united", label: "United Airlines", code: "UA" },
  { value: "american", label: "American Airlines", code: "AA" },
  { value: "alaska", label: "Alaska Airlines", code: "AS" },
];

export function AddFlightModal({ open, onOpenChange, onSuccess }: AddFlightModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    confirmationCode: "",
    firstName: "",
    lastName: "",
    airline: "",
    flightCost: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.confirmationCode || formData.confirmationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid confirmation code",
        description: "Confirmation code must be 6 characters",
      });
      return;
    }

    if (!formData.lastName) {
      toast({
        variant: "destructive",
        title: "Last name required",
        description: "Please enter your last name",
      });
      return;
    }

    if (!formData.airline) {
      toast({
        variant: "destructive",
        title: "Airline required",
        description: "Please select an airline",
      });
      return;
    }

    if (!formData.flightCost || parseFloat(formData.flightCost) < 0) {
      toast({
        variant: "destructive",
        title: "Invalid flight cost",
        description: "Please enter a valid flight cost",
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Call the lookup function to scrape flight details
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke('lookup', {
        body: {
          confirmationCode: formData.confirmationCode.toUpperCase(),
          firstName: formData.firstName.toUpperCase(),
          lastName: formData.lastName.toUpperCase(),
          airline: formData.airline,
        },
      });

      if (lookupError) {
        throw new Error(lookupError.message);
      }

      if (lookupData?.error) {
        throw new Error(lookupData.error);
      }

      const result: LookupResult = lookupData;

      // Step 2: Get the airline code
      const airlineConfig = airlines.find(a => a.value === formData.airline);
      const airlineCode = airlineConfig?.code || formData.airline.toUpperCase();

      // Step 3: Create the trip in the database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: session.user.id,
          airline: airlineCode,
          confirmation_code: formData.confirmationCode.toUpperCase(),
          first_name: formData.firstName.toUpperCase() || null,
          last_name: formData.lastName.toUpperCase(),
          paid_total: parseFloat(formData.flightCost),
          status: "active",
          monitoring_enabled: true,
          trip_type: result.tripType || null,
          ticket_expiration: result.ticketExpiration || null,
          full_route: result.fullRoute || null,
          total_duration_minutes: result.totalDuration ? parseInt(result.totalDuration) : null,
          loyalty_status: result.loyaltyStatus || null,
          fare_class: result.fareClass || null,
          eticket_number: result.eticketNumber || null,
          is_refundable: result.isRefundable || false,
          destination_iata: result.destination || null,
        })
        .select()
        .single();

      if (tripError) {
        throw new Error(tripError.message);
      }

      // Step 4: Create segments if flight details were scraped
      if (result.flights && result.flights.length > 0) {
        const segments = result.flights.map((flight: any) => ({
          trip_id: tripData.id,
          carrier: airlineCode,
          flight_number: flight.flightNumber || "TBD",
          depart_airport: flight.departureAirport || "TBD",
          arrive_airport: flight.arrivalAirport || "TBD",
          depart_datetime: flight.departureTime || new Date().toISOString(),
          arrive_datetime: flight.arrivalTime || new Date().toISOString(),
          aircraft: flight.aircraft || null,
          depart_terminal: flight.departureTerminal || null,
          depart_gate: flight.departureGate || null,
          arrive_terminal: flight.arrivalTerminal || null,
          arrive_gate: flight.arrivalGate || null,
          status: flight.status || "Scheduled",
          layover_duration_minutes: flight.layoverDuration ? parseInt(flight.layoverDuration) : null,
          is_change_of_plane: flight.isChangeOfPlane || false,
          segment_index: flight.segmentIndex,
        }));

        const { error: segmentsError } = await supabase
          .from("segments")
          .insert(segments);

        if (segmentsError) {
          console.error("Error creating segments:", segmentsError);
          // Don't throw - trip was created successfully
        }
      }

      // Step 5: Log audit
      await logAudit("create", tripData.id);

      // Success!
      toast({
        title: "Flight added successfully",
        description: `${result.airline} flight ${formData.confirmationCode} has been added to your dashboard`,
      });

      // Reset form and close modal
      setFormData({
        confirmationCode: "",
        firstName: "",
        lastName: "",
        airline: "",
        flightCost: "",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to add flight";
      toast({
        variant: "destructive",
        title: "Failed to add flight",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = 
    formData.confirmationCode.length === 6 &&
    formData.lastName &&
    formData.airline &&
    formData.flightCost &&
    parseFloat(formData.flightCost) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Add My Flight
          </DialogTitle>
          <DialogDescription>
            Enter your flight details and we'll automatically retrieve information from the airline
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="airline">Airline *</Label>
            <Select
              value={formData.airline}
              onValueChange={(value) =>
                setFormData({ ...formData, airline: value })
              }
            >
              <SelectTrigger id="airline">
                <SelectValue placeholder="Select airline" />
              </SelectTrigger>
              <SelectContent>
                {airlines.map((airline) => (
                  <SelectItem key={airline.value} value={airline.value}>
                    {airline.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationCode">Confirmation Code / PNR *</Label>
            <Input
              id="confirmationCode"
              placeholder="ABC123"
              value={formData.confirmationCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmationCode: e.target.value.toUpperCase(),
                })
              }
              maxLength={6}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              <Input
                id="firstName"
                placeholder="JOHN"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstName: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="SMITH"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastName: e.target.value.toUpperCase(),
                  })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flightCost">Flight Cost Paid (USD) *</Label>
            <Input
              id="flightCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="299.99"
              value={formData.flightCost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  flightCost: e.target.value,
                })
              }
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding flight...
                </>
              ) : (
                <>
                  <Plane className="mr-2 h-4 w-4" />
                  Add Flight
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
