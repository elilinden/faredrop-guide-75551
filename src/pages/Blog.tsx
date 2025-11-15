import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

const articleSections = [
  {
    heading: "What we check (and what we don’t)",
    content: [
      "We check public prices for your airline/route (or exact flight, when available) and compare them to what you paid.",
      "We don’t scrape your account or touch your booking. The airline’s Change preview is the source of truth.",
    ],
  },
  {
    heading: "Why this approach is reliable",
    content: [
      "Airline systems can differ from public fare feeds. That’s why our alerts are a nudge, not a promise. One click takes you to the airline’s Change screen where you can confirm the exact credit before deciding.",
    ],
  },
  {
    heading: "What you’ll see in FareGuardian",
    content: [
      "A status panel: last checked time, last observed price, next scheduled check.",
      "A price history chart so you can spot trends.",
      "A “Check now” button and an auto-refresh toggle if you’re actively watching.",
      "Airline-specific tips (AA/DL often require first + last name; UA/AS typically ask for last name + PNR).",
    ],
  },
  {
    heading: "Quick how-to",
    content: [
      "Add your airline + confirmation code (PNR) + last name (and first name if your airline requires it).",
      "We start monitoring; you’ll see last checked and last price update.",
      "If it looks cheaper, you’ll get an email alert with a button to the airline’s Manage/Change page.",
      "Open the Change preview, verify the credit, and—if you want it—complete the change.",
    ],
  },
  {
    heading: "Privacy & control",
    content: [
      "We store only what’s needed to guide you (PNR, names, paid amount).",
      "We offer encryption at rest for sensitive fields and never collect airline passwords.",
      "You can delete trips or your account anytime.",
    ],
  },
];

export default function Blog() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 max-w-3xl px-4 py-12">
        <article className="space-y-10">
          <header className="space-y-4">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Blog</p>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">How FareGuardian Finds Savings—Without Touching Your Booking</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Published: November 15, 2025</span>
              <span>Estimated read time: 4 minutes</span>
            </div>
            <Button variant="outline" asChild className="w-fit">
              <a href="https://fareguardian.lovable.app/#/dashboard" target="_blank" rel="noreferrer">
                Dashboard
              </a>
            </Button>
          </header>

          <p className="text-lg leading-relaxed text-muted-foreground">
            You booked a flight. A week later, the fare drops. Do you get that money back? Usually—yes. Many U.S. airlines let you reprice to the same flights and receive a credit for the difference. The catch is finding the drop at the right time and navigating the “Change” flow without headaches.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Enter FareGuardian: we watch fares every few hours, show you a simple “last checked” status with a price history chart, and—when it looks cheaper—email you a link straight to the airline’s Manage/Change page. You stay in control; we never log in or change anything for you.
          </p>

          {articleSections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">{section.heading}</h2>
              <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                {section.content.map((item) => (
                  <li key={item} className="leading-relaxed text-base">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="text-lg leading-relaxed text-muted-foreground">
            Ready to stop leaving credits on the table? Create a free account and let FareGuardian keep watch while you get back to life.
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
