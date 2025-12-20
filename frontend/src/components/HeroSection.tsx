import { Container, Server, Cpu, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-secondary/20 via-secondary/5 to-transparent rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">


          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-up-delay-1">
            Déployez vos projets{" "}
            <span className="gradient-text">en quelques secondes.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up-delay-2">
            Containers et VM légères pour apprendre, tester et construire — sans complexité.
            Parfait pour les étudiants et développeurs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up-delay-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">Commencer gratuitement</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#templates">Voir les templates</a>
            </Button>
          </div>

          {/* Floating Illustration */}
          <div className="relative max-w-3xl mx-auto">
            <div className="relative z-10 glass rounded-2xl p-6 md:p-8 border border-border/50 shadow-2xl animate-float">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-warning" />
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="ml-4 text-xs text-muted-foreground font-mono">user@smp4cloud</span>
              </div>

              {/* Terminal Content */}
              <div className="font-mono text-sm text-left space-y-2">
                <p className="text-muted-foreground">
                  <span className="text-primary">$</span> git push origin main
                </p>
                <p className="text-success">✓ Déploiement démarré via Portainer...</p>
                <p className="text-muted-foreground">
                  <span className="text-primary">$</span> verif status
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                    <Container className="w-4 h-4 text-primary" />
                    <span className="text-foreground">api-server</span>
                    <span className="text-xs text-success">● actif</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                    <Server className="w-4 h-4 text-secondary" />
                    <span className="text-foreground">postgres</span>
                    <span className="text-xs text-success">● actif</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-24 -right-24 p-4 glass rounded-xl border border-border/50 animate-float" style={{ animationDelay: "1s" }}>
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-12 -left-12 p-4 glass rounded-xl border border-border/50 animate-float" style={{ animationDelay: "2s" }}>
              <Layers className="w-8 h-8 text-secondary" />
            </div>
          </div>


        </div>
      </div>
    </section>
  );
};

export default HeroSection;
