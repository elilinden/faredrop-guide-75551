export type FaqAnswerBlockType = "paragraph" | "list" | "ordered" | "callout";

export interface FaqAnswerBlock {
  type: FaqAnswerBlockType;
  content: string[];
}

export interface FaqEntry {
  question: string;
  blocks: FaqAnswerBlock[];
  tags?: string[];
}

export interface FaqCategory {
  id: string;
  title: string;
  description: string;
  entries: FaqEntry[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Create your account and connect upcoming trips in minutes.",
    entries: [
      {
        question: "How does pAiback work?",
        tags: ["automation", "monitoring", "savings"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "pAiback keeps a constant pulse on your airline reservations so you never overpay after booking.",
            ],
          },
          {
            type: "list",
            content: [
              "Book directly with Alaska, American, Delta, or United using your preferred loyalty account.",
              "Forward your confirmation email to ticketing@paiback.app from the email used to sign up.",
              "Our AI watches your fare 24/7, checking for every single price change.",
              "When prices drop, we trigger an airline-approved adjustment and secure eCredits on your behalf.",
              "You receive an email summary the moment new savings are captured.",
              "Apply the eCredits toward future trips, upgrades, or even the same itinerary when you rebook.",
            ],
          },
          {
            type: "callout",
            content: [
              "You stay on the exact same flight, in the same seat, with the same confirmation number—only your wallet changes.",
            ],
          },
        ],
      },
      {
        question: "How do I sign up?",
        tags: ["account", "enrollment"],
        blocks: [
          {
            type: "paragraph",
            content: ["The enrollment process takes about two minutes and works right from your inbox."],
          },
          {
            type: "ordered",
            content: [
              "Book your flight directly with one of the supported airlines.",
              "Create your pAiback account at https://www.paiback.app using the same email on your reservation.",
              "Forward the confirmation email to ticketing@paiback.app—no forms, uploads, or spreadsheets required.",
              "Sit back. We'll confirm activation and start monitoring within minutes.",
            ],
          },
          {
            type: "callout",
            content: [
              "Need help importing multiple bookings? Reply to any onboarding email and our team will assist you personally.",
            ],
          },
        ],
      },
      {
        question: "What information do I need to provide?",
        tags: ["security", "profile"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "We only request details that allow us to authenticate with airlines and deliver savings securely.",
            ],
          },
          {
            type: "list",
            content: [
              "Email address so we can match incoming tickets to your account.",
              "Secure password to protect your dashboard.",
              "Legal first and last name, plus date of birth to validate traveler identity with the airline.",
              "Mobile number for optional SMS alerts and two-factor prompts.",
              "Credit card on file (optional at signup) to bill our commission only after savings are realized.",
              "Referral code if a friend invited you—perks await!",
            ],
          },
          {
            type: "callout",
            content: [
              "All data is encrypted at rest and in transit, and we never share customer information with third parties.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "how-it-works",
    title: "How It Works",
    description: "Understand how we capture savings while keeping your trip locked in.",
    entries: [
      {
        question: "Do I need to change my flight to get savings?",
        tags: ["process", "no-changes"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "No itinerary juggling required—your reservation stays exactly as you booked it.",
            ],
          },
          {
            type: "list",
            content: [
              "Same flight number, departure time, and ticketed cabin.",
              "Seat assignments and upgrades remain untouched.",
              "Travel companions stay linked to the same record locator.",
              "We handle every behind-the-scenes adjustment with the airline.",
            ],
          },
        ],
      },
      {
        question: "Do you rebook my flight?",
        tags: ["risk", "itinerary"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Never. Rebooking introduces unnecessary risk, so we work within the airline's change-fee waiver policies instead.",
            ],
          },
          {
            type: "list",
            content: [
              "Your record locator and e-ticket numbers remain the same.",
              "Any companion or corporate travel approvals stay intact.",
              "There's zero downtime where someone else could grab your seat.",
              "The only visible change is a lower fare basis on your receipt.",
            ],
          },
        ],
      },
      {
        question: "How is this even possible?",
        tags: ["policies", "airlines"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Airlines quietly allow same-ticket repricing after fare drops when change fees are waived—we've automated the loophole.",
            ],
          },
          {
            type: "list",
            content: [
              "Major U.S. carriers removed change fees on most fares in 2020.",
              "Manual monitoring requires constant price checks and complex documentation.",
              "Our AI bots perform those checks every few minutes and submit the precise paperwork instantly.",
              "You receive a compliance-ready audit trail for every adjustment we trigger.",
            ],
          },
        ],
      },
      {
        question: "How often do flight prices actually drop?",
        tags: ["statistics", "savings"],
        blocks: [
          {
            type: "paragraph",
            content: ["Far more often than most travelers realize, especially on competitive routes."],
          },
          {
            type: "list",
            content: [
              "Roughly 60% of monitored itineraries see at least one qualifying price drop.",
              "Premium cabins and international routes experience deeper swings.",
              "We average about 20% off the original ticket when drops occur.",
              "Some tickets dip multiple times, unlocking stacked savings opportunities.",
            ],
          },
        ],
      },
      {
        question: "Can flight prices drop multiple times?",
        tags: ["monitoring", "multiple-drops"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Absolutely. Dynamic pricing means fares can fluctuate dozens of times before departure.",
            ],
          },
          {
            type: "list",
            content: [
              "We capture each drop individually—no manual requests from you required.",
              "Every secured credit is itemized in your dashboard history.",
              "Multiple drops compound, often adding up to hundreds in value per traveler.",
              "You'll always know when a new savings event posts thanks to instant notifications.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "eligibility-coverage",
    title: "Eligibility & Coverage",
    description: "See which bookings qualify for automatic monitoring.",
    entries: [
      {
        question: "Which flights are eligible?",
        tags: ["airlines", "fares"],
        blocks: [
          {
            type: "paragraph",
            content: ["We focus on carriers whose policies guarantee safe, no-penalty fare reductions."],
          },
          {
            type: "list",
            content: [
              "Supported airlines: Alaska Airlines, American Airlines, Delta Air Lines, and United Airlines.",
              "Eligible fares: Main Cabin, Comfort+, Premium, First, and Business (anything above Basic Economy).",
              "Coverage includes both domestic and international tickets with $0 change fees.",
              "We cannot monitor Basic Economy or third-party agency tickets yet.",
            ],
          },
        ],
      },
      {
        question: "Why only these four airlines?",
        tags: ["scope", "future"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Their industry-leading change-fee policies let us guarantee zero disruption to your travel plans.",
            ],
          },
          {
            type: "list",
            content: [
              "Each carrier permanently removed change fees on standard and premium fares.",
              "We maintain direct connections with their servicing teams for rapid adjustments.",
              "Together they represent the majority of U.S. domestic capacity.",
              "We're actively evaluating additional airlines as policies evolve—join the waitlist in your dashboard to vote for the next carrier.",
            ],
          },
        ],
      },
      {
        question: "What if I book through Chase Travel or other booking sites?",
        tags: ["third-party", "direct-booking"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "For now, only direct airline bookings are compatible. Third-party portals block the tools we need to reissue tickets.",
            ],
          },
          {
            type: "list",
            content: [
              "Agency reservations mask your ticket number, preventing airline-side adjustments.",
              "Booking direct preserves loyalty benefits, customer support, and full flexibility for changes.",
              "If you prefer booking with points through a bank portal, consider transferring points to the airline and booking directly.",
            ],
          },
        ],
      },
      {
        question: "Do I need separate accounts for group bookings?",
        tags: ["group", "families"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "One pAiback account can monitor every traveler on a shared confirmation number.",
            ],
          },
          {
            type: "list",
            content: [
              "We track savings at the individual ticket level and roll them into your dashboard summary.",
              "Family, friends, or coworkers on the same record benefit automatically.",
              "Need separate billing for business partners? Enable split invoices in Settings after activation.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "pricing-billing",
    title: "Pricing & Billing",
    description: "Only pay when we deliver measurable savings—no surprises.",
    entries: [
      {
        question: "How much does pAiback cost?",
        tags: ["commission", "fees"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "We operate on a performance model so you never pay out of pocket unless we earn you credits.",
            ],
          },
          {
            type: "list",
            content: [
              "$0 to sign up, $0 monthly, and $0 if fares never drop.",
              "When we secure savings, we invoice 20% of the captured amount in USD.",
              "You keep the full airline eCredit—our commission is billed separately to your card on file.",
              "Invoices are batched monthly with a downloadable statement for expense reporting.",
            ],
          },
        ],
      },
      {
        question: "How much money can I expect to save?",
        tags: ["savings", "expectations"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Savings vary by route and fare class, but our monitoring uncovers meaningful value across the board.",
            ],
          },
          {
            type: "list",
            content: [
              "60% of tracked flights experience at least one credit-worthy drop.",
              "Typical savings land around 20% of the original ticket price.",
              "We've delivered everything from $20 adjustments to $7,500 business-class windfalls.",
              "Premium international itineraries tend to see the largest swings.",
            ],
          },
          {
            type: "callout",
            content: [
              "If your fare never decreases, you owe nothing—our incentives stay perfectly aligned with yours.",
            ],
          },
        ],
      },
      {
        question: "How do I receive my savings?",
        tags: ["credits", "delivery"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Savings post directly to your airline loyalty wallet as eCredits or travel certificates.",
            ],
          },
          {
            type: "list",
            content: [
              "Credits retain their full face value—we never skim or reduce the amount.",
              "You can apply them toward future flights, upgrades, or in many cases reprice the same itinerary immediately.",
              "Expiration timelines vary by airline (typically 12–24 months), and we remind you before they lapse.",
              "Detailed proof-of-savings receipts are stored in your dashboard for reimbursement or tax purposes.",
            ],
          },
        ],
      },
      {
        question: "When and how am I billed?",
        tags: ["billing", "invoices"],
        blocks: [
          {
            type: "paragraph",
            content: ["We consolidate all earned savings into a single, transparent monthly invoice."],
          },
          {
            type: "list",
            content: [
              "Each month you'll receive an itemized summary covering all travelers and trips.",
              "The 20% commission is automatically charged to the card you store in Settings.",
              "Prefer ACH or split billing? Reach out to finance@paiback.app for custom arrangements.",
              "Invoices include downloadable PDFs for easy expensing or reimbursement submissions.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "benefits-loyalty",
    title: "Benefits & Loyalty",
    description: "Keep every elite perk while layering on extra protection.",
    entries: [
      {
        question: "Will pAiback affect my airline loyalty status?",
        tags: ["loyalty", "status"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Not at all—you retain every mile, point, and status credit you earned with the original booking.",
            ],
          },
          {
            type: "list",
            content: [
              "Elite-qualifying dollars and segments continue to accrue normally.",
              "Upgrade priority and complimentary perks stay in place.",
              "Booking direct ensures you still receive bonus promotions from the airline.",
              "pAiback simply adds automatic price protection on top of your loyalty benefits.",
            ],
          },
        ],
      },
      {
        question: "What happens to my upgrades if prices drop?",
        tags: ["upgrades", "premium"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Upgrades remain locked—if you're upgraded when the fare drops, we'll reissue the same cabin after repricing.",
            ],
          },
          {
            type: "list",
            content: [
              "We request the adjustment within the same fare bucket so eligibility is preserved.",
              "Confirmed upgrades are re-applied automatically; waitlist positions stay active.",
              "Companion upgrades linked to your reservation remain attached.",
              "You'll receive confirmation in your airline app showing the repriced ticket with identical perks.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "risk-trust",
    title: "Risk & Trust",
    description: "Built for zero disruption and full transparency.",
    entries: [
      {
        question: "Is there any risk to using pAiback?",
        tags: ["risk-free", "safety"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "No. We operate entirely within airline policy, so your reservation is never exposed to cancellations or rebooking mishaps.",
            ],
          },
          {
            type: "list",
            content: [
              "No flight swaps, no seat loss, and no impact on traveling companions.",
              "Every change is logged with timestamped confirmation numbers for your records.",
              "You can pause monitoring or remove trips at any time from the dashboard.",
              "Dedicated support specialists are available if you ever want human confirmation.",
            ],
          },
        ],
      },
      {
        question: "What's the catch?",
        tags: ["transparency", "value"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "There isn't one. Airlines constantly repricing inventory is a reality—our technology simply makes it effortless to benefit.",
            ],
          },
          {
            type: "list",
            content: [
              "You book when it's convenient instead of waiting for the “perfect” fare.",
              "We monitor volatility with dedicated infrastructure regular travelers could never replicate manually.",
              "If we don't find savings, you don't pay a cent.",
            ],
          },
        ],
      },
      {
        question: "How can I read reviews from other customers?",
        tags: ["social-proof", "reviews"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "We publish unfiltered testimonials so you can verify real-world results before you enroll.",
            ],
          },
          {
            type: "list",
            content: [
              "Visit our TrustPilot page at https://uk.trustpilot.com/review/paiback.app.",
              "Explore detailed stories of major savings and customer support experiences.",
              "Share your own experience after your first credit posts to help other travelers.",
            ],
          },
        ],
      },
      {
        question: "Can I refer friends to pAiback?",
        tags: ["referrals", "rewards"],
        blocks: [
          {
            type: "paragraph",
            content: [
              "Yes! Spread the savings by sharing your personalized referral link once you're onboarded.",
            ],
          },
          {
            type: "list",
            content: [
              "Your dashboard displays a unique referral URL you can copy with one click.",
              "Track referral performance in real time—including pending bonuses.",
              "Special promotions rotate throughout the year, so check the Referral tab for the latest incentives.",
            ],
          },
        ],
      },
    ],
  },
];
