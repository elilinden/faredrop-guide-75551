import { ChangeEvent, FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SiteFooter } from "@/components/SiteFooter";
import { Loader2 } from "lucide-react";

interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

const defaultState: ContactFormState = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ContactFormState>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ContactFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("contact-message", {
        body: formData,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Message sent",
        description: "Thanks for reaching out! We'll get back to you shortly.",
      });

      setFormData(defaultState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast({
        variant: "destructive",
        title: "Couldn't send message",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.message.trim();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      <main className="flex-1">
        <div className="border-b bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 py-12 text-center md:py-16">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Contact Us</h1>
            <p className="mt-4 text-lg text-muted-foreground">Get in Touch!</p>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl px-4 py-12 md:py-16">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/60 bg-background/95 p-8 shadow-sm">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleChange("firstName")}
                  placeholder="First Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleChange("lastName")}
                  placeholder="Last Name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={handleChange("message")}
                placeholder="I would like to know more about..."
                rows={6}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={!isFormValid || isSubmitting} className="min-w-[120px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Contact;
