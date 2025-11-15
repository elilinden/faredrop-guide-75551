import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SiteFooter } from "@/components/SiteFooter";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    email_alerts_enabled: true,
    min_drop_threshold: 10,
    monitor_mode: "auto",
    monitor_frequency_minutes: 180,
    digest_cadence: "monthly",
    timezone: "America/New_York",
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data) {
          setPreferences(data);
        } else {
          // Create default preferences
          const { error: insertError } = await supabase
            .from("user_preferences")
            .insert({
              user_id: user.id,
              ...preferences,
            });

          if (insertError) throw insertError;
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        toast({
          variant: "destructive",
          title: "Failed to load preferences",
          description: "Using default settings",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [navigate]);

  const updatePreference = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_preferences")
        .update({ [key]: value })
        .eq("user_id", user.id);

      if (error) throw error;

      setPreferences((prev) => ({ ...prev, [key]: value }));
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update settings",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 items-center justify-center">Loading...</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">FareDrop Guide</span>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control when and how you receive price alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails when prices drop below your threshold
                  </p>
                </div>
                <Switch
                  checked={preferences.email_alerts_enabled}
                  onCheckedChange={(checked) => updatePreference("email_alerts_enabled", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Drop Threshold</Label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={preferences.min_drop_threshold}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        updatePreference("min_drop_threshold", value);
                      }
                    }}
                    className="w-24"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Only notify when prices drop by at least this amount
                </p>
              </div>

              <div className="space-y-2">
                <Label>Digest Cadence</Label>
                <Select
                  value={preferences.digest_cadence}
                  onValueChange={(value) => updatePreference("digest_cadence", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Receive summary emails with all your trips and potential savings
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monitoring Frequency</CardTitle>
              <CardDescription>Control how often we check prices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Monitoring Mode</Label>
                <Select
                  value={preferences.monitor_mode}
                  onValueChange={(value) => updatePreference("monitor_mode", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="fixed">Fixed Interval</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {preferences.monitor_mode === "auto"
                    ? "Automatically adjusts check frequency based on departure date (more frequent as departure approaches)"
                    : "Use a fixed interval for all trips"}
                </p>
              </div>

              {preferences.monitor_mode === "fixed" && (
                <div className="space-y-2">
                  <Label>Check Frequency</Label>
                  <Select
                    value={preferences.monitor_frequency_minutes.toString()}
                    onValueChange={(value) => updatePreference("monitor_frequency_minutes", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">Every hour</SelectItem>
                      <SelectItem value="180">Every 3 hours</SelectItem>
                      <SelectItem value="360">Every 6 hours</SelectItem>
                      <SelectItem value="720">Every 12 hours</SelectItem>
                      <SelectItem value="1440">Once daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {preferences.monitor_mode === "auto" && (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Auto mode schedule:</p>
                  <ul className="space-y-1 text-muted-foreground ml-4">
                    <li>• More than 90 days out: Every 24 hours</li>
                    <li>• 30-90 days out: Every 6 hours</li>
                    <li>• 7-29 days out: Every 3 hours</li>
                    <li>• Within 6 days: Every hour</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Zone</CardTitle>
              <CardDescription>Used for scheduling digest emails and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={preferences.timezone}
                onValueChange={(value) => updatePreference("timezone", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Settings;
