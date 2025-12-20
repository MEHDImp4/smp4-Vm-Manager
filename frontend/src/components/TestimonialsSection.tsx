import { Quote, Star } from "lucide-react";

const testimonials = [
    {
        name: "Thomas D.",
        role: "Étudiant Epitech/42",
        content: "Parfait pour mes projets DevOps. Les points sont super économiques comparés à AWS.",
        initials: "TD"
    },
    {
        name: "Sarah L.",
        role: "Développeuse Frontend",
        content: "L'interface est magnifique et simple. J'ai déployé mon portfolio en 5 minutes.",
        initials: "SL"
    },
    {
        name: "Lucas M.",
        role: "Admin Sys",
        content: "La gestion via Portainer est un vrai plus. Je recommande pour tester des infras.",
        initials: "LM"
    },
    {
        name: "Emma R.",
        role: "Étudiante",
        content: "Le système de points est génial, je ne paie que quand je travaille sur mes projets.",
        initials: "ER"
    },
    {
        name: "Maxime B.",
        role: "Freelance",
        content: "Support très réactif sur Discord. Service fiable et performant.",
        initials: "MB"
    },
    {
        name: "Julie K.",
        role: "Débutante Docker",
        content: "Les templates pré-installés m'ont fait gagner un temps fou. Merci !",
        initials: "JK"
    }
];

const TestimonialsSection = () => {
    return (
        <section className="py-24 relative overflow-hidden bg-background/50 backdrop-blur-sm border-y border-border/50">
            <div className="container mx-auto px-4 mb-12 text-center">
                <h2 className="text-3xl font-bold mb-4">
                    Ils nous font <span className="gradient-text">confiance</span>
                </h2>
                <p className="text-muted-foreground">
                    Rejoignez des centaines d'étudiants et développeurs satisfaits.
                </p>
            </div>

            <div className="relative w-full max-w-[100vw]">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Marquee Container */}
                <div className="flex animate-scroll hover:pause-hover w-max">
                    {/* Double Content for seamless loop */}
                    {[...testimonials, ...testimonials].map((testimonial, index) => (
                        <div
                            key={index}
                            className="w-[350px] mx-4 p-6 glass rounded-2xl border border-border/50 flex flex-col gap-4 group hover:border-primary/50 transition-colors"
                        >
                            <div className="flex gap-1 text-yellow-500 mb-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>

                            <div className="relative">
                                <Quote className="w-8 h-8 text-primary/20 absolute -top-2 -left-2" />
                                <p className="text-muted-foreground relative z-10 pl-4 text-justify">
                                    "{testimonial.content}"
                                </p>
                            </div>

                            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border/50">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-primary-foreground">
                                    {testimonial.initials}
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{testimonial.name}</div>
                                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
