import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cloud, ArrowLeft, Server, Cpu, HardDrive, Zap, Shield, KeyRound, Network, Package, CheckCircle2, Terminal } from "lucide-react";

const Templates = () => {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('token');
    const homeLink = isLoggedIn ? '/dashboard' : '/';

    const templates = [
        { id: "nano", name: "Nano", cpu: "1 vCPU", ram: "512 Mo", storage: "16 Go", pointsDay: 4, color: "from-blue-500/20 to-cyan-500/20", borderColor: "border-blue-500/20" },
        { id: "micro", name: "Micro", cpu: "1 vCPU", ram: "1 Go", storage: "24 Go", pointsDay: 8, color: "from-green-500/20 to-emerald-500/20", borderColor: "border-green-500/20" },
        { id: "small", name: "Small", cpu: "2 vCPU", ram: "2 Go", storage: "32 Go", pointsDay: 12, color: "from-yellow-500/20 to-orange-500/20", borderColor: "border-yellow-500/20" },
        { id: "medium", name: "Medium", cpu: "3 vCPU", ram: "4 Go", storage: "40 Go", pointsDay: 18, color: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/20" },
        { id: "pro", name: "Pro", cpu: "4 vCPU", ram: "8 Go", storage: "48 Go", pointsDay: 28, color: "from-red-500/20 to-rose-500/20", borderColor: "border-red-500/20" },
    ];

    const features = [
        { icon: Package, title: "Utilisateur pré-créé", desc: "Compte 'smp4' avec accès sudo configuré par défaut" },
        { icon: Terminal, title: "Docker & Portainer", desc: "Environnement containerisé prêt à l'emploi" },
        { icon: Shield, title: "Sécurité intégrée", desc: "SSH sécurisé avec fail2ban et firewall iptables" },
        { icon: Network, title: "Accès VPN privé", desc: "Connexion WireGuard chiffrée de bout en bout" },
        { icon: Cloud, title: "Sous-domaine Portainer", desc: "Accès web automatique à votre interface Portainer" },
        { icon: KeyRound, title: "Premier accès sécurisé", desc: "Changement de mot de passe obligatoire lors du premier login" },
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
                    <div className="flex items-center gap-2 select-none">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-300">
                            <Cloud className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">
                            SMP4<span className="gradient-text">cloud</span>
                        </span>
                    </div>
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
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-6 border border-purple-500/20 shadow-lg shadow-purple-500/10">
                        <Server className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400">
                        Templates SMP4cloud
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Des machines virtuelles pré-configurées et prêtes à déployer vos projets en quelques secondes.
                    </p>
                </div>

                <div className="space-y-12 animate-fade-up-delay-1">
                    {/* Templates Grid */}
                    <div>
                        <h2 className="text-2xl font-bold mb-6 text-center">Nos Templates Disponibles</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map((template) => (
                                <div key={template.id} className={`glass rounded-2xl p-6 border ${template.borderColor} relative overflow-hidden group hover:scale-105 transition-all duration-300`}>
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${template.color} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:scale-150 transition-transform duration-500`} />
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-bold mb-4">{template.name}</h3>
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Cpu className="w-4 h-4 text-primary" />
                                                <span className="text-sm">{template.cpu}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <Zap className="w-4 h-4 text-primary" />
                                                <span className="text-sm">{template.ram}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-muted-foreground">
                                                <HardDrive className="w-4 h-4 text-primary" />
                                                <span className="text-sm">{template.storage}</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-white/10">
                                            <div className="text-3xl font-bold gradient-text">{template.pointsDay}</div>
                                            <div className="text-sm text-muted-foreground">points / jour</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* What's Included */}
                    <div className="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            Qu'est-ce qui est inclus ?
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Chaque template vient avec un environnement complet, sécurisé et prêt à l'emploi. Aucune configuration complexe requise.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            {features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <feature.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                                        <p className="text-sm text-muted-foreground">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* First Access Instructions */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <KeyRound className="w-6 h-6 text-warning" />
                            Premier Accès
                        </h2>
                        <div className="space-y-6 relative border-l-2 border-white/10 pl-8 ml-4">
                            {[
                                { title: "Réception du mot de passe", sub: "Vous recevrez le mot de passe initial par email après la création de votre VM." },
                                { title: "Connexion SSH/Terminal", sub: "Connectez-vous avec l'utilisateur 'smp4' et le mot de passe fourni." },
                                { title: "Changement obligatoire", sub: "Au premier login, vous devrez immédiatement changer votre mot de passe pour des raisons de sécurité." },
                                { title: "Accès à Portainer", sub: "Une fois connecté, accédez à Portainer via le sous-domaine automatiquement créé pour gérer vos conteneurs Docker." },
                            ].map((step, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-warning border-4 border-background" />
                                    <h3 className="font-semibold text-lg text-foreground">{step.title}</h3>
                                    <p className="text-muted-foreground text-sm">{step.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technical Specifications */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6">Spécifications Techniques</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Logiciels Pré-installés</h3>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Docker (dernière version stable)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Portainer CE (interface web)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        OpenSSH Server
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Fail2ban (protection SSH)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Git, curl, sudo
                                    </li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Sécurité & Réseau</h3>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Firewall iptables pré-configuré
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Isolation du réseau local (192.168.x.x)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        VPN WireGuard pour accès privé
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Tunnels Cloudflare pour domaines publics
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Changement de mot de passe forcé
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="glass rounded-2xl p-8 border border-white/10 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
                        <h2 className="text-2xl font-bold mb-4">Prêt à démarrer ?</h2>
                        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                            Choisissez le template adapté à vos besoins et déployez votre infrastructure en quelques clics.
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

export default Templates;
