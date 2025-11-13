import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, CheckCircle, BookOpen, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">FareDrop Guide</span>
          </div>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Same flights, better price—without bots
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Manual flight repricing guidance. Track potential savings when airlines drop prices on flights you've already booked.
          </p>
          <Button asChild size="lg" className="text-lg px-8">
            <Link to="/auth">Add Your First Trip</Link>
          </Button>
        </section>

        <section className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "1. Add Your Trip", desc: "Enter your booking details (confirmation code, airline, dates)" },
              { icon: CheckCircle, title: "2. Follow Guided Steps", desc: "Open airline's site and preview the 'Change' option to see credit" },
              { icon: TrendingDown, title: "3. Track Savings", desc: "Record potential credit—complete the change on airline site if desired" },
            ].map((step, i) => (
              <Card key={i}>
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <step.icon aria-hidden="true" className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-2xl mx-auto bg-accent/50 border rounded-lg p-6">
          <h3 className="font-semibold mb-3">Eligibility Note</h3>
          <p className="text-sm text-muted-foreground">
            Works on most non-Basic Economy tickets. Basic Economy fares usually cannot be changed. 
            Supported airlines: American, Delta, United, Alaska.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Index;
