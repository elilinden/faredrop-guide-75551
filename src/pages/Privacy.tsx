import { SiteFooter } from "@/components/SiteFooter";

const privacySections = [
  {
    title: "1) Information we collect",
    paragraphs: [
      "Account data: email address, password or OAuth identifier (e.g., Google), profile preferences.",
      "Trip data (you provide): airline, confirmation code/PNR, traveler last name and (for some airlines) first name, paid amount, optional flight segments/dates, notes, and optional screenshots.",
      "Monitoring data (we derive): last checked time, last observed public price, confidence tag (e.g., “exact flight” vs “route estimate”), monitoring frequency, alert history.",
      "Usage & device data: page events, approximate location inferred from IP or airports you enter, device/browser type, referral URLs, cookies and similar technologies (see Cookie Settings).",
      "Communications: emails you send us, feedback, support tickets.",
      "We do not ask for airline passwords and we do not log into airline accounts on your behalf.",
    ],
  },
  {
    title: "2) How we use information",
    list: [
      "Provide, maintain, and improve the Service (e.g., price checks, email alerts, charts).",
      "Secure the Service, prevent abuse, and debug issues.",
      "Communicate with you about updates, alerts, and support.",
      "Comply with legal obligations, enforce Terms, and protect our rights.",
    ],
  },
  {
    title: "3) Legal bases (EEA/UK users)",
    paragraphs: [
      "We process personal data based on: performance of a contract (providing the Service), our legitimate interests (security, improvement), your consent (where required, e.g., cookies/marketing), and legal obligations.",
    ],
  },
  {
    title: "4) Sharing of information",
    paragraphs: ["We share data with:"],
    list: [
      "Processors who help us operate the Service (e.g., cloud hosting/database, email delivery, authentication, analytics).",
      "Legal & safety: to comply with law, legal process, or to protect rights, property, or safety.",
      "Business transfers: in connection with a merger, acquisition, or asset sale (with commitments to continue protecting your data).",
    ],
    footer: "We do not sell your personal information.",
  },
  {
    title: "5) International transfers",
    paragraphs: [
      "We may process data in the United States and other countries where our providers operate. Where required, we use appropriate safeguards (e.g., Standard Contractual Clauses).",
    ],
  },
  {
    title: "6) Retention",
    paragraphs: [
      "We keep personal data as long as needed to provide the Service and for legitimate business or legal purposes. You can delete trips or your account; we’ll retain only what’s necessary for legal/compliance and then delete or anonymize the rest per our schedules.",
    ],
  },
  {
    title: "7) Security",
    paragraphs: [
      "We use reasonable administrative, technical, and physical safeguards (e.g., encrypted transport, restricted access). If enabled in your account, we encrypt certain sensitive fields at rest (such as PNR and traveler names). No method of transmission or storage is 100% secure.",
    ],
  },
  {
    title: "8) Your choices & rights",
    paragraphs: [
      "Access, update, delete your information via account settings or by contacting us.",
      "Email preferences: toggle alert and digest emails in settings.",
      "Cookies: manage preferences on the Cookie Settings page.",
      "EEA/UK: you may have rights to portability, restriction, objection, and lodging a complaint with your local authority.",
      "California (CCPA/CPRA): you have rights to know/access, delete, correct, and to limit use of sensitive personal information. We do not sell or share your personal information for cross-context behavioral advertising.",
      "Requests: privacy@fareguardian.com",
    ],
  },
  {
    title: "9) Children",
    paragraphs: [
      "The Service is not directed to children under 13 (or under 16 in the EEA). If you believe a child has provided us data, contact us and we will delete it.",
    ],
  },
  {
    title: "10) Third-party links",
    paragraphs: [
      "Airline links and other third-party sites are governed by their own policies; we are not responsible for their practices.",
    ],
  },
  {
    title: "11) Changes to this Policy",
    paragraphs: [
      "We may update this Policy. We’ll post the revised version with a new effective date and provide notice of material changes.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["privacy@fareguardian.com"],
  },
];

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="container mx-auto flex-1 max-w-4xl px-4 py-12">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Privacy Policy</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">FareGuardian Privacy Policy</h1>
          <p className="text-muted-foreground">Effective date: November 15, 2025</p>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>Who we are: FareGuardian (“we,” “our,” or “us”)</p>
            <p>Contact: privacy@fareguardian.com</p>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {privacySections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
              {section.paragraphs &&
                section.paragraphs.map((paragraph) => (
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
