import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cloud, ArrowLeft, DollarSign, Info, TrendingDown, Calculator, Globe, HardDrive, Zap } from "lucide-react";

const Tarification = () => {
    const navigate = useNavigate();

    const templates = [
        { name: "Nano", cpu: "1 vCPU", ram: "512 Mo", storage: "16 Go", pointsDay: 4 },
        { name: "Micro", cpu: "1 vCPU", ram: "1 Go", storage: "24 Go", pointsDay: 8 },
        { name: "Small", cpu: "2 vCPU", ram: "2 Go", storage: "32 Go", pointsDay: 12 },
        { name: "Medium", cpu: "3 vCPU", ram: "4 Go", storage: "40 Go", pointsDay: 18 },
        { name: "Pro", cpu: "4 vCPU", ram: "8 Go", storage: "48 Go", pointsDay: 28 },
    ];

    return (
        <div className="min-h-screen bg-background relative overflow-hidden font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 animate-fade-up backdrop-blur-md border-b border-white/5 bg-black/20">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                            <Cloud className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            SMP4<span className="gradient-text">cloud</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-white/5">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 max-w-6xl">
                {/* Hero Section */}
                <div className="mb-12 animate-fade-up text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-6 border border-green-500/20 shadow-lg shadow-green-500/10">
                        <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
                        Tarification SMP4cloud
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Un modèle simple et transparent : vous ne payez que ce que vous consommez, à l'heure.
                    </p>
                </div>

                <div className="space-y-12 animate-fade-up-delay-1">
                    {/* Pricing Model Explanation */}
                    <div className="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <Info className="w-6 h-6 text-blue-500" />
                            Comment ça marche ?
                        </h2>
                        <div className="space-y-4 text-muted-foreground">
                            <p>
                                SMP4cloud utilise un système de <span className="text-foreground font-semibold">points</span> pour la facturation.
                                Chaque template consomme un certain nombre de points <span className="text-foreground font-semibold">par heure</span> tant que votre VM est en cours d'exécution.
                            </p>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <p className="text-blue-200 font-medium">
                                    💡 <span className="font-bold">Astuce :</span> Arrêtez vos VMs quand vous ne les utilisez pas pour économiser vos points !
                                </p>
                            </div>
                            <p>
                                Les points sont déduits automatiquement de votre solde chaque heure.
                                Les VMs arrêtées ne consomment <span className="text-emerald-400 font-semibold">aucun point</span>.
                            </p>
                        </div>
                    </div>

                    {/* Pricing Table */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6 text-center">Coût des Templates</h2>
                        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="text-left p-4 font-semibold">Template</th>
                                            <th className="text-left p-4 font-semibold">Ressources</th>
                                            <th className="text-right p-4 font-semibold">Points / Jour (24h)</th>
                                            <th className="text-right p-4 font-semibold">Points / Semaine</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templates.map((template, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-lg">{template.name}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <div>{template.cpu} • {template.ram}</div>
                                                        <div>{template.storage} stockage</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="text-2xl font-bold gradient-text">{template.pointsDay}</div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="text-xl font-semibold text-muted-foreground">{template.pointsDay * 7}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Additional Costs */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <Calculator className="w-6 h-6 text-warning" />
                            Coûts Additionnels
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-warning/10">
                                        <Globe className="w-6 h-6 text-warning" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Domaines Payants</h3>
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Chaque domaine personnalisé avec tunnel Cloudflare que vous créez.
                                        </p>
                                        <div className="text-2xl font-bold gradient-text">+2 pts/jour</div>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-muted-foreground">
                                    Le sous-domaine Portainer automatique est <span className="text-emerald-400 font-semibold">gratuit</span> !
                                </div>
                            </div>

                            <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-blue-500/10">
                                        <HardDrive className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2">Stockage</h3>
                                        <p className="text-muted-foreground text-sm mb-3">
                                            Inclus dans chaque template selon la configuration choisie.
                                        </p>
                                        <div className="text-2xl font-bold text-emerald-400">Inclus</div>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 text-xs text-muted-foreground">
                                    De 16 Go (Nano) à 48 Go (Pro) selon le template sélectionné.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Example Calculation */}
                    <div className="glass rounded-2xl p-8 border border-white/10 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <Calculator className="w-6 h-6 text-purple-400" />
                            Exemple de Calcul
                        </h2>
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                                <h3 className="font-semibold text-lg mb-4">Scénario : Developpeur Web</h3>
                                <div className="space-y-3 text-muted-foreground">
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                        <span>Template <span className="font-semibold text-foreground">Small</span> actif toute la journée</span>
                                        <span className="font-mono">12 pts/jour</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                        <span>1 domaine personnalisé actif toute la journée</span>
                                        <span className="font-mono">2 pts/jour</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-lg font-bold text-foreground">
                                        <span>Total par jour</span>
                                        <span className="gradient-text">14 points</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                <p className="text-emerald-200">
                                    💰 En supprimant les VMs et domaines inutilisés, vous économisez vos précieux points !
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tips to Save Points */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <TrendingDown className="w-6 h-6 text-emerald-500" />
                            Économiser vos Points
                        </h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {[
                                {
                                    title: "Arrêtez vos VMs",
                                    desc: "Les VMs arrêtées ne consomment aucun point. Arrêtez-les quand vous ne codez pas.",
                                    icon: Zap,
                                },
                                {
                                    title: "Choisissez le bon template",
                                    desc: "Utilisez un template adapté à vos besoins. Pas besoin d'un Pro pour un simple site web.",
                                    icon: Calculator,
                                },
                                {
                                    title: "Limitez les domaines",
                                    desc: "N'activez que les domaines dont vous avez réellement besoin. Utilisez le VPN pour tester.",
                                    icon: Globe,
                                },
                            ].map((tip, i) => (
                                <div key={i} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 w-fit mb-3">
                                        <tip.icon className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h3 className="font-semibold mb-2">{tip.title}</h3>
                                    <p className="text-sm text-muted-foreground">{tip.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Transparent Note */}
                    <div className="glass rounded-2xl p-8 border border-white/10 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <Info className="w-6 h-6 text-blue-400" />
                            Tarification Transparente
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Aucun frais caché, aucun engagement. Vous contrôlez votre consommation en temps réel depuis votre dashboard.
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Facturation à l'heure, à la seconde près
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Pas de frais de mise en service
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Pas de frais de résiliation
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                Suivi en temps réel de votre solde de points
                            </li>
                        </ul>
                    </div>

                    {/* CTA */}
                    <div className="glass rounded-2xl p-8 border border-white/10 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
                        <h2 className="text-2xl font-bold mb-4">Commencez dès maintenant</h2>
                        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                            Créez votre première VM et ne payez que ce que vous consommez, sans engagement.
                        </p>
                        <Button onClick={() => navigate('/create')} className="px-8 py-6 text-lg">
                            Créer une Instance
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Tarification;
