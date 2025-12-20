import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cloud, ArrowLeft, BookOpen, Terminal, Box, Layers, Globe, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

const DockerGuide = () => {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('token');
    const homeLink = isLoggedIn ? '/dashboard' : '/';

    const handleCopy = async (text: string) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                toast.success("Prompt copié !");
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand("copy");
                    toast.success("Prompt copié !");
                } catch (err) {
                    toast.error("Erreur de copie");
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            toast.error("Erreur inattendue");
        }
    };

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

            <main className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
                <div className="mb-12 animate-fade-up text-center">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <BookOpen className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                        Guide de Déploiement
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        De ton code local à une application en ligne, étape par étape.
                    </p>
                </div>

                <div className="space-y-12 animate-fade-up-delay-1">

                    {/* Step 1: Mental Model */}
                    <div className="glass rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">1</span>
                            Le Concept
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            L'architecture est pensée pour être simple mais robuste. Tout part de ton code sur GitHub.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "GitHub", desc: "La source de vérité. Ton code vit ici.", icon: Box },
                                { title: "Docker", desc: "Standardise ton app pour qu'elle tourne partout.", icon: Terminal },
                                { title: "Portainer", desc: "Le chef d'orchestre qui déploie tes conteneurs.", icon: Layers },
                                { title: "SMP4cloud", desc: "L'infrastructure qui héberge ta VM.", icon: Cloud },
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

                    {/* Step 2: Prerequisites */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">2</span>
                            Pré-requis
                        </h2>
                        <ul className="grid sm:grid-cols-2 gap-4">
                            <li className="flex items-start gap-3 text-muted-foreground p-3 rounded-lg bg-white/5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                                <div>
                                    <span className="text-foreground font-medium block">Compte GitHub</span>
                                    Avec ton projet (JS, Python, Java, etc.)
                                </div>
                            </li>
                            <li className="flex items-start gap-3 text-muted-foreground p-3 rounded-lg bg-white/5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                                <div>
                                    <span className="text-foreground font-medium block">Fichiers Docker</span>
                                    Un Dockerfile et un docker-compose.yml
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Step 3: Dockerize & CI/CD */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">3</span>
                            Dockeriser & Automatiser (CI/CD)
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Utilise ce prompt avancé avec ton assistant IA préféré (ChatGPT, Claude, Copilot) pour générer une configuration complète incluant le déploiement automatique via GitHub Actions.
                        </p>
                        <div className="bg-black/40 rounded-xl p-6 font-mono text-sm text-blue-300 overflow-x-auto border border-white/10 relative group shadow-inner">
                            <Button size="sm" variant="outline" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 hover:bg-background" onClick={() => {
                                handleCopy(`Tu es un expert DevOps et Docker.
J'ai un projet dans ce repository. Je veux que tu mettes en place une pipeline CI/CD complète et moderne.

Voici tes objectifs :

1.  **Dockerisation** :
    *   Crée un \`Dockerfile\` optimisé pour la production (multi-stage build si possible).
    *   L'application doit écouter sur \`0.0.0.0\`.

2.  **GitHub Actions (CI/CD)** :
    *   Crée un workflow \`.github/workflows/deploy.yml\`.
    *   Ce workflow doit se déclencher lors d'un push sur la branche \`main\`.
    *   Il doit construire (build) l'image Docker.
    *   Il doit pousser (push) cette image sur le **GitHub Container Registry (GHCR)**.
    *   Utilise \`GITHUB_TOKEN\` pour l'authentification.
    *   Nomme l'image en minuscules : \`ghcr.io/OWNER/REPO:latest\`.

3.  **Docker Compose** :
    *   Crée un fichier \`docker-compose.yml\` prêt pour le déploiement.
    *   Il doit utiliser l'image que tu as configurée ci-dessus (\`image: ghcr.io/...\`).
    *   N'utilise PAS de \`build: .\`, on veut utiliser l'image pré-compilée du registre.
    *   Expose les ports nécessaires.
    *   **IMPORTANT** : Ajoute un service **Watchtower** pour la mise à jour automatique.
        *   Image : \`containrrr/watchtower\`
        *   Commande : \`--interval 30\` (vérification toutes les 30 secondes)
        *   Volumes : \`/var/run/docker.sock:/var/run/docker.sock\`

4.  **Documentation Post-Installation** :
    *   À la fin, génère une section "IMPORTANT" expliquant comment rendre le package GHCR public sur GitHub pour que mon serveur puisse le télécharger sans mot de passe (Package Settings -> Change visibility -> Public).

Analyse mon code pour détecter le langage et les besoins, puis fournis-moi tous ces fichiers.`);
                            }}>
                                Copier
                            </Button>
                            <div className="whitespace-pre-wrap opacity-80 text-xs md:text-sm leading-relaxed">
                                {`Tu es un expert DevOps et Docker.
J'ai un projet dans ce repository. Je veux que tu mettes en place une pipeline CI/CD complète.

Objectifs :

1. **Dockerisation** :
   - Crée un Dockerfile optimisé (production-ready).
   - L'app doit écouter sur 0.0.0.0.

2. **GitHub Actions (CI/CD)** :
   - Crée un workflow .github/workflows/deploy.yml.
   - Build et Push l'image sur GitHub Container Registry (GHCR) à chaque push.
   - Utilise GITHUB_TOKEN.

3. **Docker Compose** :
   - Crée un docker-compose.yml qui utilise l'image distante (ghcr.io/...).
   - Ajoute Watchtower pour auto-update (check 30s).
   - Pas de "build: .".

4. **Documentation** :
   - Explique comment rendre le package GHCR public dans les paramètres GitHub pour permettre le téléchargement.`}
                            </div>
                        </div>
                    </div>

                    {/* Step 4: Deploy */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-sm font-bold">4</span>
                            Déployer sur Portainer
                        </h2>
                        <div className="space-y-6 relative border-l-2 border-white/10 pl-8 ml-4">
                            {[
                                { title: "Accès à Portainer", sub: "Clique sur 'Accès Portainer' depuis la page de détails de ta VM." },
                                { title: "Créer une Stack", sub: "Menu 'Stacks' → 'Add stack' (en haut à droite)." },
                                { title: "Source Git", sub: "Sélectionne 'Repository' comme méthode. Portainer utilisera le docker-compose.yml de ton dépôt qui pointe vers GHCR." },
                                { title: "Configuration", sub: "Repo URL: https://github.com/ton-user/ton-repo\nBranche: main\nCompose path: docker-compose.yml" },
                                { title: "Déploiement", sub: "Clique sur 'Deploy the stack'. L'image sera téléchargée depuis GitHub (GHCR) automatiquement." },
                                { title: "Mises à jour Auto", sub: "Grâce à Watchtower (inclus dans le compose), tes conteneurs se mettront à jour 30s après chaque nouveau push sur GitHub !" },
                            ].map((step, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[41px] top-0 w-5 h-5 rounded-full bg-primary border-4 border-background" />
                                    <h3 className="font-semibold text-lg text-foreground">{step.title}</h3>
                                    <p className="text-muted-foreground whitespace-pre-line text-sm">{step.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 5: Access Strategy (VPN vs Domains) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-white/10 flex-1" />
                            <h2 className="text-2xl font-bold text-center">Comment accéder à ton app ?</h2>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Option A: VPN */}
                            <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col h-full bg-gradient-to-b from-secondary/5 to-transparent">
                                <div className="mb-4 p-3 rounded-xl bg-secondary/10 w-fit">
                                    <Lock className="w-6 h-6 text-secondary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Accès Privé (VPN)</h3>
                                <p className="text-sm text-muted-foreground mb-4 flex-1">
                                    Idéal pour le développement, les bases de données, et les tests. C'est comme si ta VM était sur ton réseau local.
                                </p>
                                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                        Données chiffrées de bout en bout
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                        Accès à tous les ports sans restriction
                                    </li>
                                </ul>
                                <div className="bg-black/20 p-4 rounded-xl text-xs font-mono space-y-2 border border-white/5">
                                    <div className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Comment faire</div>
                                    <ol className="list-decimal pl-4 space-y-1">
                                        <li>Télécharger la config ("VPN Config")</li>
                                        <li>Installer WireGuard</li>
                                        <li>Importer & Connecter</li>
                                        <li>Accéder via <span className="text-secondary">http://IP_INTERNE:PORT</span></li>
                                    </ol>
                                </div>
                            </div>

                            {/* Option B: Domains */}
                            <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col h-full bg-gradient-to-b from-warning/5 to-transparent">
                                <div className="mb-4 p-3 rounded-xl bg-warning/10 w-fit">
                                    <Globe className="w-6 h-6 text-warning" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Accès Public (Domaines)</h3>
                                <p className="text-sm text-muted-foreground mb-4 flex-1">
                                    Pour montrer ton travail au monde. Crée une URL publique sécurisée (HTTPS) accessible par tous.
                                </p>
                                <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                                        Certificat SSL (HTTPS) automatique
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                                        Pas de ports ouverts sur internet (Tunnel)
                                    </li>
                                </ul>
                                <div className="bg-black/20 p-4 rounded-xl text-xs font-mono space-y-2 border border-white/5">
                                    <div className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">Comment faire</div>
                                    <ol className="list-decimal pl-4 space-y-1">
                                        <li>Aller dans "Sous-domaines"</li>
                                        <li>Choisir un préfixe (ex: 'api')</li>
                                        <li>Indiquer le port (ex: 3000)</li>
                                        <li>Ouvrir <span className="text-warning">https://api-user...xyz</span></li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Troubleshooting */}
                    <div className="glass rounded-2xl p-8 border border-white/10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                            En cas de problème
                        </h2>
                        <div className="space-y-4">
                            {[
                                { err: "L'app ne répond pas", reason: "Vérifie que ton app écoute sur 0.0.0.0 et non 127.0.0.1" },
                                { err: "Erreur 502 Bad Gateway", reason: "Le port indiqué dans 'Domaines' ne correspond pas au port du conteneur" },
                                { err: "Portainer échoue", reason: "Vérifie ton fichier docker-compose.yml et la présence du Dockerfile" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                                    <div className="font-bold text-destructive whitespace-nowrap text-sm">Problème {i + 1}</div>
                                    <div className="text-muted-foreground border-l border-white/10 pl-4">{item.reason}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div >
    );
};

export default DockerGuide;
