import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cloud, ArrowLeft, BookOpen, Terminal, Box, Layers, GitBranch, Globe, Server, AlertTriangle, CheckCircle2 } from "lucide-react";

const DockerGuide = () => {
    const navigate = useNavigate();

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
                            Mini<span className="gradient-text">Cloud</span>
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

            <main className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
                <div className="mb-12 animate-fade-up text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <BookOpen className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                        Guide Déploiement Docker
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Pour les élèves ingénieurs : déployez votre code sans magie noire.
                    </p>
                </div>

                <div className="space-y-12 animate-fade-up-delay-1">

                    {/* Introduction */}
                    <div className="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">1</span>
                            Le Modèle Mental
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            L'objectif est simple : Tu pushes ton code sur GitHub → Portainer récupère le repo → ton app tourne.
                            Ici, tu ne vas pas builder en local. Tout se fait via GitHub + Portainer.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Docker", desc: "Une boîte standard pour ton application.", icon: Box },
                                { title: "Dockerfile", desc: "La recette pour fabriquer la boîte.", icon: Terminal },
                                { title: "Docker Compose", desc: "Le plan qui dit comment lancer les boîtes.", icon: Layers },
                                { title: "Portainer", desc: "L'interface graphique pour gérer tout ça.", icon: Globe },
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <item.icon className="w-5 h-5 text-primary" />
                                        <span className="font-semibold">{item.title}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pre-requisites */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">2</span>
                            Pré-requis
                        </h2>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-muted-foreground">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Un compte GitHub
                            </li>
                            <li className="flex items-center gap-3 text-muted-foreground">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Un repo GitHub avec ton projet (JS, Python, Java, PHP, etc.)
                            </li>
                            <li className="flex items-center gap-3 text-muted-foreground">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Accès à Portainer (URL + login fournis par la plateforme)
                            </li>
                        </ul>
                    </div>

                    {/* AI Prompt */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">3</span>
                            Transformer ton projet en Docker
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Copie-colle ce prompt dans ChatGPT avec l'URL de ton repo pour générer les fichiers nécessaires.
                        </p>
                        <div className="bg-black/40 rounded-xl p-6 font-mono text-sm text-blue-300 overflow-x-auto border border-white/10 relative group">
                            <Button size="sm" variant="outline" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(`Tu es un expert DevOps.\nAnalyse ce repository GitHub : <URL_DU_REPO>\n\nObjectif : dockeriser l’application pour un déploiement simple avec Docker Compose.\n\nTâches :\n1. Identifier le langage et le type de projet (frontend, backend, API, etc.)\n2. Générer un Dockerfile optimisé (production-ready)\n3. Générer un docker-compose.yml compatible Portainer\n4. Expliquer les ports exposés et les variables d’environnement\n5. Ne PAS utiliser de build local (tout doit marcher via Portainer)\n6. Supposer que l’utilisateur n’a jamais utilisé Docker\n\nRetour attendu :\n- Dockerfile\n- docker-compose.yml\n- README minimal avec instructions Portainer`)}>
                                Copier
                            </Button>
                            <div className="whitespace-pre-wrap">
                                {`Tu es un expert DevOps.
Analyse ce repository GitHub : <URL_DU_REPO>

Objectif : dockeriser l’application pour un déploiement simple avec Docker Compose.

Tâches :
1. Identifier le langage et le type de projet (frontend, backend, API, etc.)
2. Générer un Dockerfile optimisé (production-ready)
3. Générer un docker-compose.yml compatible Portainer
4. Expliquer les ports exposés et les variables d’environnement
5. Ne PAS utiliser de build local (tout doit marcher via Portainer)
6. Supposer que l’utilisateur n’a jamais utilisé Docker

Retour attendu :
- Dockerfile
- docker-compose.yml
- README minimal avec instructions Portainer`}
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-muted-foreground italic">
                            Résultat : Ajoute les fichiers générés à la racine de ton repo, puis push.
                        </p>
                    </div>

                    {/* Portainer Steps */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">4</span>
                            Créer une Stack dans Portainer
                        </h2>
                        <div className="space-y-6 relative border-l-2 border-white/10 pl-8 ml-4">
                            {[
                                { title: "Connecte-toi à Portainer", sub: "Utilise les accès fournis." },
                                { title: "Va dans Stacks", sub: "Dans le menu à gauche, clique sur 'Stacks'." },
                                { title: "Clique sur 'Add stack'", sub: "Bouton bleu en haut à droite." },
                                { title: "Choisis 'Git repository'", sub: "C'est la méthode de déploiement." },
                                { title: "Configuration Git", sub: "URL: https://github.com/user/projet.git\nBranch: main\nCompose path: docker-compose.yml" },
                                { title: "(Optionnel) Variables d'environnement", sub: "Ajoute tes variables comme NODE_ENV=production ou PORT=3000." },
                                { title: "Clique sur 'Deploy the stack 🚀'", sub: "Si tout est bon, ton app démarre." },
                            ].map((step, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-primary border-4 border-background" />
                                    <h3 className="font-semibold text-lg">{step.title}</h3>
                                    <p className="text-muted-foreground whitespace-pre-line">{step.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ports & Access */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="glass rounded-2xl p-8 border border-white/10">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Server className="w-5 h-5 text-orange-400" />
                                Accéder à ton app
                            </h2>
                            <p className="text-muted-foreground mb-4">
                                Dans ton <code>docker-compose.yml</code> :
                            </p>
                            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm mb-4 border border-white/5">
                                ports:<br />
                                &nbsp;&nbsp;- "8080:3000"
                            </div>
                            <ul className="text-sm space-y-2 text-muted-foreground">
                                <li><span className="text-primary font-mono">3000</span> → Port interne de l'app</li>
                                <li><span className="text-orange-400 font-mono">8080</span> → Port exposé sur la VM</li>
                            </ul>
                            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center font-mono font-bold text-primary">
                                http://IP_DE_LA_VM:8080
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-8 border border-white/10">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <GitBranch className="w-5 h-5 text-purple-400" />
                                Déploiement auto (CI/CD)
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">Objectif : <code>git push</code> → Portainer met à jour l'app.</p>

                            <h3 className="font-semibold text-sm mb-2 text-purple-300">Option A – Webhook (Simple)</h3>
                            <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground mb-4">
                                <li>Portainer → Ta Stack → Webhooks → Copie l'URL</li>
                                <li>GitHub Actions → Crée <code>.github/workflows/deploy.yml</code></li>
                            </ol>
                            <div className="bg-black/40 rounded-lg p-3 font-mono text-xs border border-white/5 overflow-x-auto text-muted-foreground">
                                steps:<br />
                                &nbsp;&nbsp;- name: Trigger Portainer webhook<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;run: curl -X POST "https://..."
                            </div>
                        </div>
                    </div>

                    {/* Troubleshooting */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                            Erreurs classiques
                        </h2>
                        <div className="space-y-4">
                            {[
                                { err: "L'app ne démarre pas", reason: "Port incorrect ou CMD manquant dans le Dockerfile" },
                                { err: "Portainer clone mais échoue", reason: "docker-compose.yml pas à la racine" },
                                { err: "Marche en local, pas sur Docker", reason: "Variable d'environnement manquante" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/10">
                                    <div className="font-bold text-red-400 whitespace-nowrap">❌ {item.err}</div>
                                    <div className="text-muted-foreground border-l border-white/10 pl-4">{item.reason}</div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-center text-muted-foreground">
                            Docker n’est pas méchant. Il est juste très littéral. 🤖
                        </p>
                    </div>

                    {/* Footer Rules */}
                    <div className="text-center space-y-2 text-muted-foreground animate-fade-up-delay-3 pb-8">
                        <h3 className="font-bold text-white mb-4">Règles simples à retenir</h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {["1 repo = 1 docker-compose", "Pas de build local", "Tout passe par GitHub", "Portainer = Bouton ON/OFF"].map((rule, i) => (
                                <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">{rule}</span>
                            ))}
                        </div>
                        <p className="mt-8 text-xs opacity-50">Fin du guide. Tu peux maintenant lancer des apps comme un sorcier moderne.</p>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default DockerGuide;
