import { Cpu, HardDrive, MemoryStick, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const templates = [
  {
    name: "Nano",
    cpu: "1 vCPU",
    ram: "512 Mo",
    storage: "12 Go",
    usage: "Tests, petits containers",
    points: 4,
    popular: false,
  },
  {
    name: "Micro",
    cpu: "1 vCPU",
    ram: "1 Go",
    storage: "12 Go",
    usage: "API simple, backend léger",
    points: 8,
    popular: false,
  },
  {
    name: "Small",
    cpu: "2 vCPU",
    ram: "2 Go",
    storage: "20 Go",
    usage: "App web + base de données",
    points: 12,
    popular: true,
  },
  {
    name: "Medium",
    cpu: "3 vCPU",
    ram: "4 Go",
    storage: "28 Go",
    usage: "Docker + Portainer inclus",
    points: 18,
    popular: false,
  },
  {
    name: "Pro",
    cpu: "4 vCPU",
    ram: "8 Go",
    storage: "32 Go",
    usage: "Projets avancés, multi-services",
    points: 28,
    popular: false,
  },
];

const TemplatesSection = () => {
  return (
    <section id="templates" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3 block">
            Templates
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choisissez votre <span className="gradient-text">configuration</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            5 templates optimisés pour tous vos besoins, du simple test au projet avancé.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {templates.map((template, index) => (
            <div
              key={index}
              className={`relative glass rounded-2xl p-6 hover-lift border ${template.popular
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border/50"
                }`}
            >
              {template.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-semibold text-primary-foreground">
                  Populaire
                </div>
              )}

              <h3 className="text-xl font-bold mb-4">{template.name}</h3>

              {/* Specs */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{template.cpu}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MemoryStick className="w-4 h-4 text-secondary" />
                  <span className="text-muted-foreground">{template.ram} RAM</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{template.storage}</span>
                </div>
              </div>

              {/* Usage */}
              <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">
                {template.usage}
              </p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl font-bold gradient-text">{template.points}</span>
                <span className="text-muted-foreground text-sm ml-1">points/jour</span>
              </div>

              {/* CTA */}
              <Button
                variant={template.popular ? "hero" : "outline"}
                className="w-full"
                asChild
              >
                <Link to="/register">
                  <Rocket className="w-4 h-4 mr-2" />
                  Déployer
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TemplatesSection;
