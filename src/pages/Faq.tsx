import { useEffect, useMemo, useState } from "react";
import { faqCategories } from "@/data/faqs";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MessageCircleQuestion, Sparkles, ShieldCheck, ArrowUpRight } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const metrics = [
  {
    title: "Average Savings",
    value: "20%",
    description: "Typical reduction captured whenever fares fall.",
    icon: Sparkles,
  },
  {
    title: "Flights with Price Drops",
    value: "60%",
    description: "Itineraries that see at least one qualifying decrease.",
    icon: MessageCircleQuestion,
  },
  {
    title: "Protected Airlines",
    value: "4",
    description: "Major carriers covered by automated monitoring.",
    icon: ShieldCheck,
  },
];

const Faq = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const normalizedTerm = searchTerm.trim().toLowerCase();

  const categoriesMatchingSearch = useMemo(() => {
    if (!normalizedTerm) {
      return faqCategories;
    }

    return faqCategories
      .map((category) => {
        const filteredEntries = category.entries.filter((entry) => {
          const haystack = [
            entry.question,
            ...(entry.tags ?? []),
            ...entry.blocks.flatMap((block) => block.content),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedTerm);
        });

        return {
          ...category,
          entries: filteredEntries,
        };
      })
      .filter((category) => category.entries.length > 0);
  }, [normalizedTerm]);

  useEffect(() => {
    if (activeCategory === "all") {
      return;
    }

    const categoryHasEntries = categoriesMatchingSearch.some(
      (category) => category.id === activeCategory && category.entries.length > 0,
    );

    if (!categoryHasEntries) {
      setActiveCategory("all");
    }
  }, [activeCategory, categoriesMatchingSearch]);

  const categoriesForAllView = normalizedTerm ? categoriesMatchingSearch : faqCategories;

  const selectedCategory = useMemo(() => {
    if (activeCategory === "all") {
      return null;
    }

    return categoriesMatchingSearch.find((category) => category.id === activeCategory) ?? null;
  }, [activeCategory, categoriesMatchingSearch]);

  const hasResults = activeCategory === "all"
    ? categoriesForAllView.length > 0
    : Boolean(selectedCategory && selectedCategory.entries.length > 0);

  const totalQuestions = faqCategories.reduce((count, category) => count + category.entries.length, 0);

  const renderCategory = (category: (typeof faqCategories)[number]) => (
    <section key={category.id} className="space-y-6 rounded-2xl border border-border/60 bg-background/90 p-6 shadow-sm md:p-10">
      <div className="space-y-2">
        <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-widest">
          {category.title}
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight">{category.title}</h2>
        <p className="max-w-3xl text-base text-muted-foreground">{category.description}</p>
      </div>

      <Accordion type="multiple" className="divide-y divide-border/60">
        {category.entries.map((entry, index) => (
          <AccordionItem key={entry.question} value={`${category.id}-${index}`} className="border-0">
            <AccordionTrigger className="py-6 text-left text-lg font-semibold">
              <span>{entry.question}</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-left text-base leading-relaxed text-muted-foreground">
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {entry.blocks.map((block, blockIndex) => {
                if (block.type === "paragraph") {
                  return block.content.map((paragraph, paragraphIndex) => (
                    <p key={`${blockIndex}-paragraph-${paragraphIndex}`} className="text-foreground">
                      {paragraph}
                    </p>
                  ));
                }

                if (block.type === "list") {
                  return (
                    <ul key={`${blockIndex}-list`} className="list-disc space-y-2 pl-6 text-foreground">
                      {block.content.map((item, itemIndex) => (
                        <li key={`${blockIndex}-list-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "ordered") {
                  return (
                    <ol key={`${blockIndex}-ordered`} className="list-decimal space-y-2 pl-6 text-foreground">
                      {block.content.map((item, itemIndex) => (
                        <li key={`${blockIndex}-ordered-${itemIndex}`}>{item}</li>
                      ))}
                    </ol>
                  );
                }

                if (block.type === "callout") {
                  return (
                    <div
                      key={`${blockIndex}-callout`}
                      className="rounded-xl border border-primary/20 bg-primary/10 p-5 text-sm text-foreground"
                    >
                      {block.content.map((item, itemIndex) => (
                        <p key={`${blockIndex}-callout-${itemIndex}`} className="text-primary">
                          {item}
                        </p>
                      ))}
                    </div>
                  );
                }

                return null;
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      <main className="flex-1">
        <div className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-12 text-center md:py-16">
          <Badge variant="secondary" className="mx-auto w-fit text-sm">
            Updated for 2025 travel policies
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Frequently Asked Questions</h1>
            <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
              Everything you need to know about fareguardian—how we monitor your fares, secure credits, and keep your travel plans
              risk-free.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {metrics.map((metric) => (
              <Card key={metric.title} className="border-primary/10 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-left text-base font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent className="text-left">
                  <div className="text-3xl font-semibold text-foreground">{metric.value}</div>
                  <CardDescription className="mt-2 text-sm text-muted-foreground">
                    {metric.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Search ${totalQuestions}+ questions...`}
                className="h-12 rounded-full border-muted pl-9 text-base"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Use keywords like "credits", "billing", or "risk" to jump straight to what matters most.
            </p>
          </div>
        </div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-16">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-8">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 overflow-x-auto rounded-full bg-muted/60 p-2">
            <TabsTrigger value="all" className="rounded-full px-4 py-2 text-sm">
              All Categories
            </TabsTrigger>
            {faqCategories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="rounded-full px-4 py-2 text-sm">
                {category.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!hasResults ? (
          <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/40 bg-background/60 p-12 text-center">
            <h2 className="text-2xl font-semibold">No questions matched that search.</h2>
            <p className="mt-2 text-muted-foreground">
              Try a different keyword or browse the full list of categories.
            </p>
          </div>
        ) : activeCategory === "all" ? (
          <div className="mt-8 space-y-10">
            {categoriesForAllView.map((category) => renderCategory(category))}
          </div>
        ) : (
          selectedCategory && <div className="mt-8 space-y-10">{renderCategory(selectedCategory)}</div>
        )}

        <Card className="mt-16 border-dashed border-primary/40 bg-primary/5">
          <CardHeader className="gap-4 text-center">
            <Badge variant="outline" className="mx-auto w-fit rounded-full px-3 py-1 text-xs uppercase tracking-widest">
              Still need answers?
            </Badge>
            <CardTitle className="text-3xl font-semibold">Talk with a fare specialist</CardTitle>
            <CardDescription className="text-base">
              Our team is on standby to help with complex itineraries, corporate policies, and international award tickets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 pb-8">
            <p className="text-sm text-muted-foreground">
              Email <a href="mailto:support@fareguardian.com" className="font-medium text-primary">support@fareguardian.com</a> or
              schedule a concierge call directly from your dashboard.
            </p>
            <Button asChild className="rounded-full px-6">
              <a href="https://www.fareguardian.com" target="_blank" rel="noopener noreferrer">
                Visit Help Center
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Faq;
