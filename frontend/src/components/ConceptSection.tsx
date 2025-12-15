import { UserPlus, LayoutTemplate, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Créer un compte",
    description: "Inscription rapide et gratuite. Recevez des points bonus pour commencer.",
  },
  {
    icon: LayoutTemplate,
    title: "Choisir un template",
    description: "Sélectionnez parmi 5 configurations optimisées selon vos besoins.",
  },
  {
    icon: Rocket,
    title: "Lancer votre environnement",
    description: "Déployez en un clic. Votre VM est prête en quelques secondes.",
  },
];

const ConceptSection = () => {
  return (
    <section id="concept" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3 block">
            Le Concept
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, rapide, <span className="gradient-text">efficace</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Une plateforme conçue pour l'apprentissage et l'expérimentation.
            Créez des containers et VM légères sans configuration complexe.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {[
            { title: "Création rapide", desc: "VM prêtes en quelques secondes" },
            { title: "Ressources optimisées", desc: "Configurations adaptées aux projets légers" },
            { title: "Facturation claire", desc: "Système de points transparent par jour" },
            { title: "Idéal pour apprendre", desc: "Parfait pour étudiants et makers" },
          ].map((feature, index) => (
            <div
              key={index}
              className="gradient-border rounded-xl p-6 hover-lift"
            >
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Steps Timeline */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-12">
            Démarrez en 3 étapes
          </h3>
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-30" />

            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center relative">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 mb-6 relative z-10">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold -mt-3 z-20 border border-border">
                    {index + 1}
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConceptSection;
