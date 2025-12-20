import { useState } from "react";
import { Coins, Pause, CreditCard, GraduationCap } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const PointsSection = () => {
  useScrollAnimation();
  const [points, setPoints] = useState(120);

  const calculateDays = (points: number, cost: number) => {
    return Math.floor(points / cost);
  };

  return (
    <section id="points" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3 block">
            Système de Points
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Une facturation <span className="gradient-text">transparente</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Payez uniquement ce que vous consommez. Contrôle total sur vos dépenses.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Features */}
          <div className="space-y-6">
            {[
              {
                icon: Coins,
                title: "Points = Énergie",
                desc: "Les points alimentent vos VM. Déduction automatique chaque jour à minuit.",
              },
              {
                icon: Pause,
                title: "Arrêtez pour économiser",
                desc: "Mettez en pause vos instances pour stopper la consommation. Reprenez quand vous voulez.",
              },
              {
                icon: CreditCard,
                title: "Rechargez facilement",
                desc: "Achetez des points par carte ou PayPal. Transactions sécurisées.",
              },
              {
                icon: GraduationCap,
                title: "Bonus étudiant",
                desc: "Vérifiez votre statut étudiant et recevez des points bonus chaque mois.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex gap-4 group animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center group-hover:border-primary/60 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Visualization */}
          <div className="glass rounded-2xl p-8 border border-border/50 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-300">
            <h3 className="text-xl font-semibold mb-6 text-center">Simulateur de points</h3>

            {/* Points Control */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-muted-foreground">Votre budget points</span>
                <div className="text-right">
                  <div className="font-mono font-bold text-xl text-primary">{points} pts</div>
                  <div className="text-xs text-muted-foreground">≈ ${(points / 300).toFixed(2)} USD</div>
                </div>
              </div>

              <Slider
                defaultValue={[120]}
                max={1000}
                step={10}
                value={[points]}
                onValueChange={(value) => setPoints(value[0])}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            {/* Calculation Main Display */}
            <div className="glass rounded-xl p-6 border border-border/50 mb-6 bg-secondary/5">
              <div className="text-center">
                <div className="text-5xl font-bold gradient-text mb-2">
                  {calculateDays(points, 12)} jours
                </div>
                <p className="text-muted-foreground text-sm">
                  d'utilisation en template <span className="text-primary font-medium">Small</span>
                </p>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground">
                    Coût réel: <span className="text-foreground font-semibold">${(points / 300).toFixed(2)} USD</span>
                    <span className="text-muted-foreground/70"> (300 pts = 1$)</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 text-center">
                <span className="text-sm text-muted-foreground">
                  {points} points ÷ 12 points/jour = <span className="text-foreground font-medium">{calculateDays(points, 12)} jours</span>
                </span>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground uppercase tracking-widest font-medium mb-4">Comparatif autres templates</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                  <div className="font-bold text-lg mb-1">{calculateDays(points, 4)}j</div>
                  <div className="text-muted-foreground text-xs uppercase font-medium">Nano</div>
                  <div className="text-[10px] text-muted-foreground opacity-70">16 Go • 4 pts/j</div>
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                  <div className="relative z-10">
                    <div className="font-bold text-lg mb-1 text-primary">{calculateDays(points, 12)}j</div>
                    <div className="text-primary text-xs uppercase font-medium">Small</div>
                    <div className="text-[10px] text-primary/70">32 Go • 12 pts/j</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                  <div className="font-bold text-lg mb-1">{calculateDays(points, 28)}j</div>
                  <div className="text-muted-foreground text-xs uppercase font-medium">Pro</div>
                  <div className="text-[10px] text-muted-foreground opacity-70">48 Go • 28 pts/j</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PointsSection;
