import { SiteFooter } from "@/components/SiteFooter";

const cookieCategories = [
  {
    name: "Strictly Necessary (always on)",
    description:
      "Required for core functionality such as authentication, security, remembering session state, and load balancing.",
    examples: [
      "session token",
      "auth state from our identity provider",
      "CSRF tokens",
    ],
  },
  {
    name: "Performance & Analytics (opt-in where required)",
    description:
      "Help us understand how the site is used so we can improve reliability and speed.",
    examples: ["page views", "error diagnostics", "timing events"],
  },
  {
    name: "Functional (opt-in)",
    description:
      "Remember preferences like theme (light/dark), auto-refresh toggles, and default monitoring frequency.",
    examples: [],
  },
  {
    name: "Marketing/Communications (optional)",
    description:
      "Used for product updates or onboarding flows; we do not use third-party advertising trackers.",
    examples: [],
  },
];

const controls = [
  "Manage preferences: Use the cookie banner or the toggles on this page to enable/disable non-essential categories.",
  "Browser controls: You can also block or delete cookies via your browser settings.",
  "Do Not Track: We do not respond to DNT signals; use the on-site consent controls instead.",
  "When you disable a category, we will stop setting new cookies in that category and will make reasonable efforts to disable or remove those already set (where feasible).",
  "Note: We may store a small record of your consent choices so we can honor them on return visits.",
];

export default function Cookies() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 max-w-4xl px-4 py-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Cookie Settings</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">FareGuardian Cookie Settings</h1>
          <p className="text-muted-foreground">Effective date: November 15, 2025</p>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>Questions? privacy@fareguardian.com</p>
          </div>
        </div>

        <section className="mt-10 space-y-6">
          <p className="text-base leading-relaxed text-muted-foreground">
            We use cookies and similar technologies (e.g., localStorage) to run our site and understand usage. Some are essential; others are optional. You can update your preferences at any time.
          </p>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Categories</h2>
            <div className="space-y-6">
              {cookieCategories.map((category) => (
                <div key={category.name} className="rounded-xl border border-border/60 bg-muted/30 p-6">
                  <h3 className="text-xl font-semibold text-foreground">{category.name}</h3>
                  <p className="mt-2 text-muted-foreground">{category.description}</p>
                  {category.examples.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Examples</p>
                      <ul className="mt-2 list-disc space-y-2 pl-6 text-muted-foreground">
                        {category.examples.map((example) => (
                          <li key={example}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Your controls</h2>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            {controls.map((item) => (
              <li key={item} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
