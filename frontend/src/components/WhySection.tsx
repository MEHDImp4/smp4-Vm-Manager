import { Zap, FlaskConical, Shield, BarChart3, Brain, Container } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Zap,
    title: "Déploiement instantané",
    description: "Lancez votre environnement en quelques secondes, sans configuration complexe.",
  },
  {
    icon: FlaskConical,
    title: "Idéal pour apprendre",
    description: "Parfait pour découvrir DevOps, Docker, Linux et le déploiement cloud.",
  },
  {
    icon: Shield,
    title: "Environnements isolés",
    description: "Chaque instance est sécurisée et isolée des autres utilisateurs.",
  },
  {
    icon: BarChart3,
    title: "Suivi clair",
    description: "Dashboard intuitif pour suivre votre consommation en temps réel.",
  },
  {
    icon: Brain,
    title: "Pensé pour les makers",
    description: "Conçu par des développeurs pour des développeurs et étudiants.",
  },
  {
    icon: Container,
    title: "Portainer Inclus",
    description: "Gérez vos conteneurs Docker facilement avec une interface graphique préinstallée.",
  },
];

const WhySection = () => {
  useScrollAnimation();

  return (
    <section id="why" className="py-24 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-secondary/10 via-secondary/5 to-transparent rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out">
          <span className="text-sm font-medium text-primary uppercase tracking-wider mb-3 block">
            Avantages
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi choisir <span className="gradient-text">SMP4</span> ?
          </h2>
          <p className="text-muted-foreground text-lg">
            Une plateforme pensée pour l'apprentissage et les projets personnels.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group gradient-border rounded-2xl p-6 hover-lift animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center mb-4 group-hover:border-primary/60 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-on-scroll opacity-0 translate-y-10 transition-all duration-700 ease-out delay-500">
          <p className="text-muted-foreground mb-6">
            Prêt à déployer votre premier projet ?
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            Commencer gratuitement
          </a>
        </div>
      </div>
    </section>
  );
};

export default WhySection;
