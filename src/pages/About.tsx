import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

const About = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-3xl space-y-12">
          <header className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">About FareGuardian</h1>
            <p className="text-lg text-muted-foreground">
              We help you capture airfare drops—without touching your booking.
            </p>
            <p className="text-muted-foreground">
              FareGuardian watches public fares tied to your trip and nudges you when it looks cheaper than what you paid. One
              click takes you to your airline’s Manage/Change page so you can confirm any credit and decide what to do—on your
              terms.
            </p>
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <a href="https://fareguardian.lovable.app/#/dashboard" target="_blank" rel="noreferrer">
                  Dashboard
                </a>
              </Button>
            </div>
          </header>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <p className="text-muted-foreground">
              Make airfare savings effortless, transparent, and under your control. Airlines change prices constantly; most
              travelers don’t have time to check. FareGuardian does the watching so you don’t miss out.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What We Do</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Monitor fares on a schedule (default every 3 hours) and show Last checked + Last observed price right on your trip.</li>
              <li>Send price-drop emails with a direct link to your airline’s Manage/Change screen.</li>
              <li>Provide airline-specific tips (e.g., AA/DL typically need first + last name; UA/AS usually last name + PNR).</li>
              <li>Keep a simple history of checks so you can see trends.</li>
              <li>Offer a “Check now” button and auto-refresh toggle when you’re watching closely.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What We Don’t Do</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>We never log in to airline accounts or change bookings for you.</li>
              <li>We don’t scrape your personal accounts.</li>
              <li>We don’t guarantee savings; the airline’s Change preview is the source of truth for any credit.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">How It Works (Fast)</h2>
            <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
              <li>Add your trip (airline, confirmation code/PNR, traveler name(s), and what you paid).</li>
              <li>We check public prices on a cadence and compare to your paid total.</li>
              <li>If it looks cheaper, you get an email with the exact link to open your airline’s Manage/Change page.</li>
              <li>You verify the credit on the airline site and choose whether to complete the change.</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Privacy &amp; Security</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>We collect only the essentials (PNR and name(s) required by the airline’s lookup, and your paid amount).</li>
              <li>Transport is encrypted; sensitive fields can be encrypted at rest.</li>
              <li>No airline passwords, ever. You can delete trips—or your entire account—any time.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Why Travelers Choose FareGuardian</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li><span className="font-semibold text-foreground">Accuracy-first:</span> The alert is a nudge; the airline page is the authority.</li>
              <li><span className="font-semibold text-foreground">Control:</span> You make changes yourself; nothing happens without you.</li>
              <li><span className="font-semibold text-foreground">Clarity:</span> Plain-English tips and copy-buttons for what each airline asks.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Roadmap</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>Richer price history visuals and trends.</li>
              <li>Smarter import from confirmation emails/pages.</li>
              <li>Flexible monitoring frequency and digest summaries.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Story</h2>
            <p className="text-muted-foreground">
              We built FareGuardian for one simple reason: airfare prices move fast—and most people don’t have time to babysit
              them. We focus on reliability, honesty, and staying out of your way while making savings easy to act on.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Press &amp; Partnerships</h2>
            <p className="text-muted-foreground">
              For media or partnership inquiries, email <a href="mailto:press@fareguardian.com" className="text-primary underline">press@fareguardian.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              Questions or feedback? We’d love to hear from you: <a href="mailto:support@fareguardian.com" className="text-primary underline">support@fareguardian.com</a>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default About;
