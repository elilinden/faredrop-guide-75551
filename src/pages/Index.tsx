import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plane,
  TrendingDown,
  Bell,
  Shield,
  Sparkles,
  CalendarRange,
  Activity,
  Radar,
  Globe,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute right-0 top-48 h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-12 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/80 to-emerald-400 text-white shadow-lg shadow-primary/30">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">FareDrop Guide</p>
              <p className="font-semibold text-lg tracking-tight text-white">Peace-of-mind for every itinerary</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 lg:flex">
            <button onClick={() => navigate("/faq")} className="transition hover:text-white">
              How it works
            </button>
            <button onClick={() => navigate("/blog")} className="transition hover:text-white">
              Resources
            </button>
            <button onClick={() => navigate("/about")} className="transition hover:text-white">
              Our story
            </button>
            <button onClick={() => navigate("/contact")} className="transition hover:text-white">
              Support
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => navigate("/sign-in")}>
              Sign in
            </Button>
            <Button className="shadow-[0_10px_30px_rgba(59,130,246,0.35)]" onClick={() => navigate("/sign-in")}>
              Join for free
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <section className="container mx-auto px-4 pb-24 pt-20 text-white md:pt-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                Repricing confidence, without the spreadsheet
              </span>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Intelligent flight price tracking designed for travelers who love a great deal
                </h1>
                <p className="max-w-xl text-lg text-white/70">
                  FareDrop Guide continuously monitors your booked flights, surfaces guaranteed savings opportunities, and guides you through rebooking in minutes. It&apos;s like having an airfare analyst on call 24/7.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" className="h-14 rounded-full px-10 text-base font-semibold" onClick={() => navigate("/sign-in")}>
                  Start tracking free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-white/20 bg-transparent px-10 text-base text-white/80 hover:border-white hover:bg-white/10 hover:text-white"
                  onClick={() => navigate("/lookup")}
                >
                  Try instant lookup
                </Button>
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <div className="flex -space-x-2">
                    {["bg-emerald-400", "bg-sky-400", "bg-purple-400"].map((color, index) => (
                      <span key={color} className={`h-8 w-8 rounded-full border-2 border-slate-950 ${color}`} style={{ zIndex: 10 - index }} />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/50">Trusted by</p>
                    <p className="text-sm font-semibold text-white">4,800+ savvy flyers</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
                  <p className="text-3xl font-semibold">$3.2M</p>
                  <p className="text-sm text-white/60">in refunds discovered for travelers last year</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
                  <p className="text-3xl font-semibold">6 hrs</p>
                  <p className="text-sm text-white/60">average time saved per itinerary</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
                  <p className="text-3xl font-semibold">98%</p>
                  <p className="text-sm text-white/60">user satisfaction rating from post-trip surveys</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto max-w-xl">
              <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-primary/50 via-blue-500/30 to-emerald-400/30 opacity-70 blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 shadow-[0_40px_120px_-40px_rgba(15,118,255,0.65)]">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>FareDrop Tracker</span>
                  <span>Live update</span>
                </div>
                <div className="mt-6 space-y-5">
                  {["NYC ↔️ LAX", "SFO → HNL", "ATL → CDG"].map((route, index) => (
                    <div key={route} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-widest text-white/60">{route}</p>
                          <p className="text-lg font-semibold text-white">Potential savings ${index === 0 ? "182" : index === 1 ? "244" : "367"}</p>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-300">
                          <TrendingDown className="h-5 w-5" />
                          <span className="text-sm font-medium">{index === 0 ? "-12%" : index === 1 ? "-18%" : "-22%"}</span>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 rounded-xl bg-slate-950/80 p-4 text-xs text-white/60 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-white/40">Reprice with:</p>
                          <p className="font-medium text-white">{index === 0 ? "Delta Same-Day Credit" : index === 1 ? "Hawaiian Price Protection" : "Air France Refund Request"}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-white/40">Confidence</p>
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                            <Shield className="h-4 w-4" />
                            {index === 0 ? "High" : index === 1 ? "Very high" : "Guaranteed"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-sm text-emerald-200">
                  <p className="font-medium text-white">“FareDrop Guide caught a $220 drop on our honeymoon flights. Two clicks later we had a travel credit waiting for us.”</p>
                  <p className="mt-3 text-xs uppercase tracking-widest text-emerald-200/80">— Priya & Daniel, Chicago</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-slate-950/80 py-16">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs uppercase tracking-[0.4em] text-white/40">Seen in</p>
            <div className="mt-6 grid items-center justify-items-center gap-8 text-white/50 sm:grid-cols-5">
              {["Skift", "The Points Guy", "Condé Nast Traveler", "Morning Brew", "Skyscanner"].map((brand) => (
                <span key={brand} className="text-center text-sm font-semibold uppercase tracking-widest">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">The most effortless way to capture every price drop</h2>
            <p className="mt-4 text-lg text-white/70">
              FareDrop Guide connects to your inbox, parses confirmations, and keeps watch. When a fare drops, you&apos;ll know exactly what to do.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Import effortlessly",
                description: "Forward a confirmation email or connect your inbox once. We organize every segment and traveler automatically.",
                icon: <CalendarRange className="h-6 w-6" />,
              },
              {
                title: "Track with intelligence",
                description: "Powerful monitoring looks at historical trends, airline policies, and same-route fares to surface real opportunities.",
                icon: <Radar className="h-6 w-6" />,
              },
              {
                title: "Rebook with confidence",
                description: "Get step-by-step playbooks tailored to each airline so you reclaim credits or refunds without waiting on hold.",
                icon: <Shield className="h-6 w-6" />,
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-white/30 hover:bg-white/10"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition group-hover:opacity-70" />
                <div className="relative flex h-full flex-col gap-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-white/70">{feature.description}</p>
                  </div>
                  <div className="mt-auto text-sm font-medium text-primary/80">Explore the workflow →</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 py-24">
          <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Stay ahead of the market</h2>
              <p className="text-lg text-white/70">
                Live market intelligence blends the best of airfare experts and machine learning. No more manual spreadsheets or guesswork—just timely insights presented with clarity.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[{
                  title: "Dynamic fare baselines",
                  description: "Know instantly if a drop is meaningful with context around historical lows and competitive rates.",
                  icon: <Activity className="h-5 w-5" />,
                },
                {
                  title: "Global coverage",
                  description: "Monitor 900+ airlines and alliances, from major carriers to boutique routes worldwide.",
                  icon: <Globe className="h-5 w-5" />,
                }].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center gap-3 text-primary">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20">
                        {item.icon}
                      </div>
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    </div>
                    <p className="mt-3 text-sm text-white/70">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-10 text-white/80 shadow-[0_40px_120px_-40px_rgba(59,130,246,0.5)]">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-white">What travelers are saying</h3>
                <p className="text-sm text-white/60">
                  "Our team no longer spends afternoons hunting for reprice opportunities. FareDrop Guide&apos;s alerts arrive with the exact steps to capture the savings." <span className="font-medium text-primary">— Maya, Travel Ops @ remote startup</span>
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[{
                  quote: "Detected a $400 drop on our family trip—rebooked in minutes.",
                  name: "Alicia, Denver",
                },
                {
                  quote: "Made our corporate travel policy proactive instead of reactive.",
                  name: "Jordan, Seattle",
                }].map((testimonial) => (
                  <div key={testimonial.name} className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                    <p className="text-sm text-white/80">“{testimonial.quote}”</p>
                    <p className="mt-3 text-xs uppercase tracking-widest text-white/40">{testimonial.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="grid items-center gap-12 rounded-[40px] border border-white/10 bg-gradient-to-br from-primary/20 via-primary/10 to-emerald-400/10 p-10 text-white shadow-[0_40px_120px_-40px_rgba(16,185,129,0.5)] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Ready for a smarter way to travel?</h2>
              <p className="text-lg text-white/80">
                Join thousands of travelers capturing refunds, credits, and peace-of-mind with FareDrop Guide. Start with our free tier and upgrade only when you&apos;re ready for enterprise-grade automation.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="h-14 rounded-full px-10 text-base font-semibold" onClick={() => navigate("/sign-in")}>
                  Create a free account
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-white/40 bg-transparent px-10 text-base text-white/80 hover:border-white hover:bg-white/10 hover:text-white"
                  onClick={() => navigate("/contact")}
                >
                  Talk to sales
                </Button>
              </div>
            </div>
            <div className="space-y-5 rounded-3xl border border-white/10 bg-slate-950/60 p-8 backdrop-blur">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Live savings feed</span>
                <span>Updated just now</span>
              </div>
              <div className="space-y-4">
                {["Corporate team credit secured", "Refund issued via price guarantee", "Upgrade unlocked with savings"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div>
                      <p className="text-sm font-semibold text-white">{item}</p>
                      <p className="text-xs text-white/50">{index === 0 ? "Southwest" : index === 1 ? "JetBlue" : "United Polaris"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-300">{index === 0 ? "$640" : index === 1 ? "$185" : "$960"}</p>
                      <p className="text-xs text-white/40">reclaimed</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/50">Invite your travel companions, collaborate on itineraries, and keep every fare optimized automatically.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
