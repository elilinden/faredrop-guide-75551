import { SiteFooter } from "@/components/SiteFooter";

const termsSections = [
  {
    title: "1) What we do",
    paragraphs: [
      "FareGuardian helps you track public airfares related to your itinerary, estimate when a fare may be lower than what you paid, and guide you to the airline’s Manage/Change screen. We do not log into airline accounts, change bookings, or act as your agent. Any changes you make on an airline site are solely your decision and responsibility.",
    ],
  },
  {
    title: "2) Acceptance & eligibility",
    paragraphs: [
      "By creating an account or using the site, you agree to these Terms and our Privacy Policy. You must be at least 13 years old (or the age of digital consent in your region) and able to form a binding contract.",
    ],
  },
  {
    title: "3) Your account",
    paragraphs: [
      "You’re responsible for your account credentials and for activity under your account. Keep your information accurate and up to date.",
    ],
  },
  {
    title: "4) Your content",
    paragraphs: [
      "You may submit trip details (e.g., airline, confirmation code/PNR, traveler names, paid amount), notes, and optional screenshots. You represent you have the right to provide this information. You grant FareGuardian a worldwide, non-exclusive, royalty-free license to host and process your content solely to provide and improve the service.",
    ],
  },
  {
    title: "5) Fair use & prohibited conduct",
    paragraphs: ["You agree not to:"],
    list: [
      "Attempt to automate airline sites via bots, scripts, scraping, or credential sharing through FareGuardian.",
      "Use FareGuardian to engage in fraud or to violate airline contracts or applicable law.",
      "Reverse engineer, interfere with, or overload our systems.",
      "Upload malware, unlawful content, or others’ personal data without permission.",
    ],
    footer: "We may suspend or terminate accounts that violate these rules.",
  },
  {
    title: "6) Third-party services",
    paragraphs: [
      "FareGuardian relies on third-party providers (e.g., hosting, authentication, email, analytics). Those services are governed by their own terms and policies.",
    ],
  },
  {
    title: "7) Beta features",
    paragraphs: [
      "We may label features as “beta,” “preview,” or similar. These may change or be discontinued and could be less stable than generally available features.",
    ],
  },
  {
    title: "8) No guarantees; airline is source of truth",
    paragraphs: [
      "Public prices are an external signal and can differ from what your airline will actually offer you. The airline’s Change/Manage preview is the authoritative source for any credit, residual value, or fare difference. We do not guarantee alerts, price estimates, or savings.",
    ],
  },
  {
    title: "9) Disclaimers",
    paragraphs: [
      "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not guarantee uninterrupted or error-free operation.",
    ],
  },
  {
    title: "10) Limitation of liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, FAREGUARDIAN AND ITS SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US FOR THE SERVICE IN THE 12 MONTHS BEFORE THE CLAIM OR (B) $50.",
      "Some jurisdictions do not allow certain limitations; in those cases, the limits apply to the fullest extent permitted.",
    ],
  },
  {
    title: "11) Indemnity",
    paragraphs: [
      "You will indemnify and hold harmless FareGuardian and our officers, directors, employees, and agents from any claims, damages, liabilities, and expenses (including reasonable attorneys’ fees) arising out of your use of the Service, your content, or your breach of these Terms.",
    ],
  },
  {
    title: "12) Termination",
    paragraphs: [
      "You may stop using the Service at any time. We may suspend or terminate access (with or without notice) if you violate these Terms, pose a security risk, or if we discontinue the Service. Upon termination, your license to use the Service ends. We may retain and/or delete your data per our Privacy Policy and retention schedules.",
    ],
  },
  {
    title: "13) Changes to Terms",
    paragraphs: [
      "We may update these Terms from time to time. If changes are material, we’ll provide reasonable notice (e.g., by email or in-app). Continued use after the effective date constitutes acceptance.",
    ],
  },
  {
    title: "14) Governing law & venue",
    paragraphs: [
      "These Terms are governed by the laws of the State of New York and the United States, without regard to conflict-of-laws rules. Courts located in New York County, New York have exclusive jurisdiction, and you consent to personal jurisdiction there.",
    ],
  },
  {
    title: "15) Contact",
    paragraphs: ["Questions about these Terms? Email support@fareguardian.com."],
  },
];

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 max-w-4xl px-4 py-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Terms of Service</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">FareGuardian Terms of Service</h1>
          <p className="text-muted-foreground">Effective date: November 15, 2025</p>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>Legal entity: FareGuardian (“FareGuardian,” “we,” “our,” or “us”)</p>
            <p>Contact: support@fareguardian.com</p>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {termsSections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
                  {section.list.map((item) => (
                    <li key={item} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.footer && (
                <p className="text-base leading-relaxed text-muted-foreground">{section.footer}</p>
              )}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
