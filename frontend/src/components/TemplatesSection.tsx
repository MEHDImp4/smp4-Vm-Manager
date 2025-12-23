import { useState, useEffect } from "react";
import { Cpu, HardDrive, MemoryStick, Rocket, Container } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface Template {
  id: string;
  name: string;
  cpu: string;
  ram: string;
  storage: string;
  points: number;
  oldPrice?: number | null;
}

const templateMetadata: Record<string, { usage: string; popular: boolean }> = {
  "Nano": { usage: "Tests, petits containers", popular: false },
  "Micro": { usage: "API simple, backend léger", popular: false },
  "Small": { usage: "App web + base de données", popular: true },
  "Medium": { usage: "Environnements de production", popular: false },
  "Pro": { usage: "Projets avancés, multi-services", popular: false },
};

const TemplatesSection = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  useScrollAnimation(".animate-on-scroll", [templates]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          const templatesData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
          setTemplates(templatesData);
        } else {
          console.error("Fetch failed with status:", res.status);
          const text = await res.text();
          console.error("Response body:", text);
        }
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <section id="templates" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3 block">
            Templates
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choisissez votre <span className="gradient-text">configuration</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Des templates optimisés pour tous vos besoins, du simple test au projet avancé.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {templates.map((template, index) => {
            const meta = templateMetadata[template.name] || { usage: "Usage général", popular: false };
            const isPromo = template.oldPrice && template.points < template.oldPrice;

            return (
              <div
                key={template.id}
                className={`relative glass rounded-2xl p-6 hover-lift border animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out ${meta.popular
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border/50"
                  }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {meta.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-xs font-semibold text-primary-foreground z-20">
                    Populaire
                  </div>
                )}

                {isPromo && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-red-500 to-pink-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl shadow-lg z-10">
                    Promotion
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
                    <span className="text-muted-foreground">{template.ram}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{template.storage}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Container className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Docker + Portainer</span>
                  </div>
                </div>

                {/* Usage */}
                <p className="text-sm text-muted-foreground mb-6 min-h-[40px]">
                  {meta.usage}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold gradient-text">{template.points}</span>
                    {isPromo && (
                      <span className="text-sm text-muted-foreground line-through decoration-red-500/50 decoration-2">
                        {template.oldPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-sm">points/jour</span>
                </div>

                {/* CTA */}
                <Button
                  variant={meta.popular ? "hero" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link to="/register">
                    <Rocket className="w-4 h-4 mr-2" />
                    Déployer
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TemplatesSection;
