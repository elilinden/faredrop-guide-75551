import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Plane,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const categories = [
  { label: "Price drops", icon: <Sparkles className="h-4 w-4" /> },
  { label: "Refund eligible", icon: <Plane className="h-4 w-4" /> },
  { label: "Credit alerts", icon: <Star className="h-4 w-4" /> },
  { label: "Business class", icon: <Plane className="h-4 w-4 rotate-45" /> },
  { label: "Family trips", icon: <Users className="h-4 w-4" /> },
  { label: "Weekend getaways", icon: <Calendar className="h-4 w-4" /> },
  { label: "International", icon: <MapPin className="h-4 w-4" /> },
];

const listings = [
  {
    id: 1,
    location: "Lisbon, Portugal",
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
    price: 486,
    previousPrice: 712,
    savings: "-32% today",
    description: "Roundtrip from NYC · TAP Air Portugal",
  },
  {
    id: 2,
    location: "Kyoto, Japan",
    image:
      "https://images.unsplash.com/photo-1504788368824-4cfaef8baca6?auto=format&fit=crop&w=800&q=80",
    price: 914,
    previousPrice: 1180,
    savings: "-18% this week",
    description: "Premium economy from LAX · ANA",
  },
  {
    id: 3,
    location: "Reykjavík, Iceland",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    price: 398,
    previousPrice: 512,
    savings: "-22% guaranteed",
    description: "Roundtrip from BOS · Icelandair",
  },
  {
    id: 4,
    location: "San José, Costa Rica",
    image:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80",
    price: 276,
    previousPrice: 402,
    savings: "-31% tracked",
    description: "Roundtrip from ATL · Delta",
  },
  {
    id: 5,
    location: "Vancouver, Canada",
    image:
      "https://images.unsplash.com/photo-1508895176047-2a3a5d5c1f90?auto=format&fit=crop&w=800&q=80",
    price: 218,
    previousPrice: 344,
    savings: "-24% found",
    description: "Roundtrip from SEA · Air Canada",
  },
  {
    id: 6,
    location: "Paris, France",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    price: 682,
    previousPrice: 895,
    savings: "-19% smart alert",
    description: "Business class from JFK · Delta",
  },
];

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                FareDrop Guide
              </p>
              <p className="text-lg font-semibold text-slate-900">Track flights like a pro</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <button
              onClick={() => navigate("/faq")}
              className="transition hover:text-slate-900"
            >
              How it works
            </button>
            <button
              onClick={() => navigate("/blog")}
              className="transition hover:text-slate-900"
            >
              Stories
            </button>
            <button
              onClick={() => navigate("/about")}
              className="transition hover:text-slate-900"
            >
              Team
            </button>
            <button
              onClick={() => navigate("/contact")}
              className="transition hover:text-slate-900"
            >
              Support
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-slate-900"
              onClick={() => navigate("/sign-in")}
            >
              Sign in
            </Button>
            <Button
              className="rounded-full bg-slate-900 px-5 text-white hover:bg-slate-800"
              onClick={() => navigate("/sign-in")}
            >
              Join for free
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:pt-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-rose-500 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Handpicked savings, ready to book
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                  Discover flight deals the moment prices drop
                </h1>
                <p className="max-w-xl text-lg text-slate-600">
                  FareDrop Guide monitors every itinerary you care about and highlights the ones worth rebooking—so you see the same clarity and polish you love on Airbnb, but for airfare.
                </p>
              </div>
              <div className="grid gap-6 rounded-full border border-slate-200 bg-white p-2 shadow-md shadow-rose-100/40 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div className="flex items-center gap-3 rounded-full px-4 py-3 transition hover:bg-rose-50">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Where</p>
                    <p className="text-sm font-medium text-slate-900">Anywhere</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-full px-4 py-3 transition hover:bg-rose-50">
                  <Calendar className="h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">When</p>
                    <p className="text-sm font-medium text-slate-900">Flexible dates</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-full px-4 py-3 transition hover:bg-rose-50">
                  <Users className="h-4 w-4 text-rose-500" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Travelers</p>
                    <p className="text-sm font-medium text-slate-900">2 adults</p>
                  </div>
                </div>
                <Button className="h-full rounded-full bg-rose-500 px-6 text-white hover:bg-rose-600">
                  <Search className="h-4 w-4" />
                  <span className="ml-2 font-semibold">Find savings</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Trusted by 4,800+ frequent flyers</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Average refund: $326</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Alerts tailored to your airline</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span>Live price board</span>
                  <span>Updated now</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {["NYC → BCN", "LAX → HNL", "ORD → CDG"].map((route, index) => (
                    <div key={route} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-tr from-rose-100 via-white to-amber-100" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{route}</p>
                        <p className="text-xs text-slate-500">
                          {index === 0 && "Rebook with Delta credit"}
                          {index === 1 && "Hawaiian Airlines best fare"}
                          {index === 2 && "Air France fare drop"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-rose-500">
                          {index === 0 ? "$212" : index === 1 ? "$148" : "$364"}
                        </p>
                        <p className="text-xs text-slate-500">Savings captured</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <p className="text-lg font-semibold text-slate-900">
                  “FareDrop Guide feels like browsing Airbnb—clean, confident, and packed with the best choices. We saved $420 on our spring trip in minutes.”
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-500">— Priya & Daniel, Chicago</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Featured in</p>
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-500">
              {["Skift", "The Points Guy", "Morning Brew", "Condé Nast Traveler", "Skyscanner"].map((brand) => (
                <span key={brand} className="rounded-full bg-slate-50 px-4 py-2">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Today&apos;s spotlight itineraries</h2>
              <p className="mt-2 text-sm text-slate-600">
                Curated like Airbnb stays—clear photos, transparent pricing, and the insights you need to act fast.
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
            <Button
              variant="outline"
              className="hidden rounded-full border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:inline-flex"
              onClick={() => navigate("/sign-in")}
            >
              View all tracked deals
            </Button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div
                  className="aspect-[4/3] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${listing.image})` }}
                />
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{listing.location}</h3>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
                      {listing.savings}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{listing.description}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-500 line-through">${listing.previousPrice}</p>
                      <p className="text-xl font-semibold text-slate-900">${listing.price}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-full border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => navigate("/sign-in")}
                    >
                      Track
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-slate-900">Explore by focus</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.label}
                  className="flex flex-shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  {category.icon}
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-12 rounded-3xl border border-slate-200 bg-white p-10 shadow-xl md:grid-cols-[1fr_0.9fr]">
            <div className="space-y-6">
              <h2 className="text-3xl font-semibold text-slate-900">All the guidance, none of the guesswork</h2>
              <p className="text-slate-600">
                We apply the same clarity you expect from premium travel marketplaces: beautiful presentation, instant credibility, and step-by-step actions that anyone can follow.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[{ title: "Inbox auto-import", description: "Connect Gmail or Outlook and we organize every itinerary instantly." },
                { title: "Policy aware", description: "Know which drops qualify for refunds, credits, or upgrades." },
                { title: "Team collaboration", description: "Invite companions or coworkers to share watchlists." },
                { title: "Concierge level help", description: "Chat with travel experts when you need human backup." }].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Peace-of-mind score</p>
                <div className="mt-6 flex items-end gap-6">
                  <div className="flex-1">
                    <p className="text-5xl font-semibold text-slate-900">98%</p>
                    <p className="mt-2 text-sm text-slate-500">of travelers feel more confident when rebooking with FareDrop Guide.</p>
                  </div>
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-400 p-[2px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-800">
                      Top rated
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
                <p className="text-lg font-semibold text-slate-900">Ready to turn every price drop into a win?</p>
                <p className="mt-3 text-sm text-slate-600">
                  Start for free, browse your personalized board of itineraries, and get notified the moment a deal appears.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-rose-500 px-6 text-white hover:bg-rose-600"
                    onClick={() => navigate("/sign-in")}
                  >
                    Create your free account
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate("/contact")}
                  >
                    Talk to an expert
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
