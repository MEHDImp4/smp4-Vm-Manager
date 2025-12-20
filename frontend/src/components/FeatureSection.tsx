import { Globe, Zap, Layout, Shield, Terminal, Cpu } from "lucide-react";
import { useRef, useEffect } from "react";

const features = [
    {
        icon: <Globe className="w-6 h-6 text-primary" />,
        title: "Sous-domaines inclus",
        description: "Chaque VM obtient automatiquement un sous-domaine sécurisé (ex: mon-projet.smp4.xyz). Plus besoin de gérer les IP.",
        gradient: "from-primary/20 to-primary/5"
    },
    {
        icon: <Zap className="w-6 h-6 text-yellow-500" />,
        title: "Déploiement Instantané",
        description: "Vos instances sont prêtes en moins de 30 secondes. Templates pré-configurés pour Node, Python, Docker, etc.",
        gradient: "from-yellow-500/20 to-yellow-500/5"
    },
    {
        icon: <Layout className="w-6 h-6 text-purple-500" />,
        title: "Interface Moderne",
        description: "Un tableau de bord clair, sombre et entièrement en Français. Pensé pour la productivité des développeurs.",
        gradient: "from-purple-500/20 to-purple-500/5"
    },
    {
        icon: <Shield className="w-6 h-6 text-emerald-500" />,
        title: "Sécurité & Isolation",
        description: "Environnements isolés, firewall automatique et accès SSH sécurisé. Vos données restent privées.",
        gradient: "from-emerald-500/20 to-emerald-500/5"
    }
];

const FeatureSection = () => {
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("animate-fade-up");
                    entry.target.classList.remove("opacity-0");
                    entry.target.classList.remove("translate-y-10");
                }
            });
        }, { threshold: 0.1 });

        const elements = document.querySelectorAll(".feature-card");
        elements.forEach((el) => observerRef.current?.observe(el));

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <section className="py-24 relative overflow-hidden bg-background">
            <div className="container mx-auto px-4 relative z-10">

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Tout ce dont vous avez besoin <br />
                        <span className="gradient-text">sans la complexité.</span>
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        SMP4cloud remplace les configurations fastidieuses par une expérience fluide et automatisée.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="feature-card opacity-0 translate-y-10 transition-all duration-700 ease-out glass p-6 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/5 group"
                            style={{ transitionDelay: `${index * 100}ms` }}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default FeatureSection;
