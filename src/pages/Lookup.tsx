import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlightSegment {
  flightNumber: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  status: string;
}

interface LookupResult {
  airline: string;
  confirmation: string;
  scraped: boolean;
  message?: string;
  flights: FlightSegment[];
}

export default function Lookup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const [formData, setFormData] = useState({
    confirmationCode: "",
    firstName: "",
    lastName: "",
    airline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('lookup', {
        body: {
          confirmationCode: formData.confirmationCode.toUpperCase(),
          firstName: formData.firstName.toUpperCase(),
          lastName: formData.lastName.toUpperCase(),
          airline: formData.airline,
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: "Lookup successful",
        description: "Flight details retrieved from airline.",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to lookup flight";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Lookup failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const airlines = [
    { value: "delta", label: "Delta Air Lines" },
    { value: "united", label: "United Airlines" },
    { value: "american", label: "American Airlines" },
    { value: "alaska", label: "Alaska Airlines" },
  ];

  const isFormValid = formData.confirmationCode && formData.lastName && formData.airline;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flight Lookup</h1>
            <p className="text-muted-foreground mt-2">
              Enter your confirmation code and name to retrieve flight details from the airline.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lookup Information</CardTitle>
              <CardDescription>
                We'll securely retrieve your flight details directly from the airline's website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="airline">Airline</Label>
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
                  <Label htmlFor="confirmationCode">Confirmation Code</Label>
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
                    <Label htmlFor="lastName">Last Name</Label>
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isFormValid || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up flight...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Lookup Flight
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Flight Details</CardTitle>
                <CardDescription>
                  {result.airline} - Confirmation: {result.confirmation}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.message && (
                  <Alert>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}

                {result.flights.map((flight, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        Flight {flight.flightNumber}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {flight.status}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Departure</div>
                        <div className="font-medium">
                          {flight.departureAirport}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {flight.departureTime}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground">Arrival</div>
                        <div className="font-medium">
                          {flight.arrivalAirport}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {flight.arrivalTime}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
