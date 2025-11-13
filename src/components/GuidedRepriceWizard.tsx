import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertBanner } from "@/components/AlertBanner";
import { AirlineBadge } from "@/components/AirlineBadge";
import { CopyableLink } from "@/components/CopyableLink";
import { Copy, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { manageTripLinks, changeFlowTips, isBasicEconomy, type AirlineKey } from "@/lib/airlines";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
interface GuidedRepriceWizardProps {
  trip: {
    id: string;
    airline: AirlineKey;
    confirmation_code: string;
    last_name: string;
    first_name: string | null;
    brand: string | null;
  };
  onComplete?: () => void;
}
type PriceInfo = {
  paid_total: number;
  last_public_price: number | null;
  last_confidence: string | null;
  last_checked_at: string | null;
};
export const GuidedRepriceWizard = ({
  trip,
  onComplete
}: GuidedRepriceWizardProps) => {
  const [step, setStep] = useState(1);
  const [understood, setUnderstood] = useState(false);
  const [previewCredit, setPreviewCredit] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // --- New state for Price Watch ---
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [checkingNow, setCheckingNow] = useState(false);
  const loadPriceInfo = async () => {
    setLoadingPrice(true);
    const {
      data,
      error
    } = await supabase.from("trips").select("paid_total, last_public_price, last_confidence, last_checked_at").eq("id", trip.id).single();
    if (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Couldn’t load price status",
        description: error.message
      });
    } else if (data) {
      setPriceInfo(data as PriceInfo);
    }
    setLoadingPrice(false);
  };
  useEffect(() => {
    loadPriceInfo();
    // Optional: live updates when price_checks/trips change
    const channel = supabase.channel(`trip-${trip.id}`).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "trips",
      filter: `id=eq.${trip.id}`
    }, () => loadPriceInfo()).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "price_checks",
      filter: `trip_id=eq.${trip.id}`
    }, () => loadPriceInfo()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);
  const handleCheckNow = async () => {
    setCheckingNow(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("check-now", {
        body: {
          tripId: trip.id
        }
      });
      if (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Price check failed",
          description: error.message ?? "Please try again in a minute."
        });
      } else {
        // Refresh from DB so the card reflects the new values
        await loadPriceInfo();
        if (data?.observed_price != null) {
          toast({
            title: "Price check complete",
            description: `Public price found: $${Number(data.observed_price).toFixed(2)} (${data.last_confidence ?? "signal"})`
          });
        } else {
          toast({
            title: "No pricing data yet",
            description: "We couldn’t find public offers for this route/date. Try again later."
          });
        }
      }
    } finally {
      setCheckingNow(false);
    }
  };
  const handleCopyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`
    });
  };
  const handleSaveReprice = async () => {
    if (!previewCredit || parseFloat(previewCredit) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid credit amount"
      });
      return;
    }
    setSaving(true);
    try {
      let evidenceUrl = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          const fileExt = evidenceFile.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from("evidence").upload(fileName, evidenceFile);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from("evidence").getPublicUrl(fileName);
          evidenceUrl = publicUrl;
        }
      }

      // Save reprice record
      const {
        error
      } = await supabase.from("reprices").insert({
        trip_id: trip.id,
        preview_credit: parseFloat(previewCredit),
        method: "self-change-preview",
        evidence_url: evidenceUrl
      });
      if (error) throw error;
      toast({
        title: "Success!",
        description: `Saved $${previewCredit} potential credit`
      });
      setStep(4);
      onComplete?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };
  return <div className="space-y-4">
      {/* --- NEW: Price Watch panel --- */}
      

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map(s => {})}
      </div>

      {/* Step 1: Prep */}
      {step === 1 && <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Quick Prep</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertBanner variant="warning" title="Heads-up">
              Changing after check-in is limited. Best to preview before your flight.
            </AlertBanner>

            {isBasicEconomy(trip.brand) && <AlertBanner variant="warning" title="Basic Economy Alert">
                Most Basic Economy tickets can't be changed. The airline may block this entirely.
              </AlertBanner>}

            <div className="space-y-3 text-sm">
              <p className="font-medium">What stays the same:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Same flights, same dates, same cabin</li>
                <li>We never change anything for you</li>
                <li>You control everything on the airline site</li>
              </ul>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox id="understand" checked={understood} onCheckedChange={checked => setUnderstood(checked as boolean)} />
              <label htmlFor="understand" className="text-sm cursor-pointer leading-tight">
                I understand this is guidance only—I'll execute any changes myself
              </label>
            </div>

            <Button onClick={() => setStep(2)} disabled={!understood} className="w-full">
              Got it, next step
            </Button>
          </CardContent>
        </Card>}

      {/* Step 2: Open Manage Trip */}
      {step === 2 && <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Open Airline Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Your airline:</span>
              <AirlineBadge airline={trip.airline} />
            </div>

            <CopyableLink url={manageTripLinks[trip.airline]} label="Open Manage Trip page" />

            {!trip.first_name && (trip.airline === "AA" || trip.airline === "DL") && <AlertBanner variant="warning" title="Missing first name">
                Add first name to this trip to use Manage Trip reliably with{" "}
                {trip.airline === "AA" ? "American" : "Delta"}.
              </AlertBanner>}

            <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">
                {trip.airline === "AA" || trip.airline === "DL" ? "You'll typically need:" : "You'll typically need:"}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Confirmation code:</span>
                  <button onClick={() => handleCopyText(trip.confirmation_code, "Confirmation code")} className="inline-flex items-center gap-1.5 px-3 py-1 bg-background border rounded-md hover:bg-accent transition-colors">
                    <span className="font-mono font-semibold text-sm">{trip.confirmation_code}</span>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {trip.first_name && (trip.airline === "AA" || trip.airline === "DL") && <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">First name:</span>
                    <button onClick={() => handleCopyText(trip.first_name!, "First name")} className="inline-flex items-center gap-1.5 px-3 py-1 bg-background border rounded-md hover:bg-accent transition-colors">
                      <span className="font-semibold text-sm">{trip.first_name}</span>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last name:</span>
                  <button onClick={() => handleCopyText(trip.last_name, "Last name")} className="inline-flex items-center gap-1.5 px-3 py-1 bg-background border rounded-md hover:bg-accent transition-colors">
                    <span className="font-semibold text-sm">{trip.last_name}</span>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Enter the name exactly as on the ticket (keep hyphens/accents)
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Follow these steps:</p>
              <ul className="space-y-2">
                {changeFlowTips[trip.airline].map((tip, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>)}
              </ul>
            </div>

            <Button onClick={() => setStep(3)} className="w-full">
              I've opened the airline site
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
              Back
            </Button>
          </CardContent>
        </Card>}

      {/* Step 3: Preview Change */}
      {step === 3 && <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Record What You See</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              On the airline's "Change" preview screen, what credit amount did they show?
            </p>

            <div className="space-y-2">
              <Label htmlFor="credit">Preview credit (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="credit" type="number" step="0.01" min="0" placeholder="0.00" value={previewCredit} onChange={e => setPreviewCredit(e.target.value)} className="pl-7" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Screenshot (optional)</Label>
              <Input id="evidence" type="file" accept="image/png,image/jpeg" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
            </div>

            <Button onClick={handleSaveReprice} disabled={!previewCredit || saving} className="w-full">
              {saving ? "Saving..." : "Save this credit"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)} className="w-full">
              Back
            </Button>
          </CardContent>
        </Card>}

      {/* Step 4: Success */}
      {step === 4 && <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Nice work!</h3>
              <p className="text-sm text-muted-foreground">
                You found <span className="font-bold text-success">${previewCredit}</span> in potential credit.
              </p>
            </div>
            <div className="bg-background/50 border rounded-lg p-4 text-left text-sm text-muted-foreground">
              <p>
                If you want this credit, complete the change on the airline's site. The credit will go to your airline
                wallet/account for future use.
              </p>
            </div>
          </CardContent>
        </Card>}
    </div>;
};