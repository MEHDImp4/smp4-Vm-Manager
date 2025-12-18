/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Plus, Loader2, Trash2, ExternalLink, Link as LinkIcon, ShieldCheck, AlertCircle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const InstanceDomains = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState({ port: "", suffix: "" });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [instanceName, setInstanceName] = useState("");
    const [userName, setUserName] = useState("");

    // Fetch domains and instance info
    useEffect(() => {
        const fetchData = async () => {
            try {
                const userStr = localStorage.getItem("user");
                if (!userStr) {
                    navigate("/login");
                    return;
                }
                const user = JSON.parse(userStr);
                setUserName(user.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || "user");

                // Fetch Instance Name (lightweight check)
                const instRes = await fetch("/api/instances", {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });
                if (instRes.ok) {
                    const instances = await instRes.json();
                    const found = instances.find((i: any) => i.id === id);
                    if (found) setInstanceName(found.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                }

                // Fetch Domains
                const domRes = await fetch(`/api/instances/${id}/domains`, {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });
                if (domRes.ok) {
                    const data = await domRes.json();
                    setDomains(data);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
                toast.error("Impossible de charger les données");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, navigate]);

    const handleCreateDomain = async () => {
        if (!newDomain.port || !newDomain.suffix) {
            toast.error("Veuillez remplir tous les champs");
            return;
        }

        const freeDomains = domains.filter(d => !d.isPaid);
        const isPaidDomain = freeDomains.length >= 3;

        // If it's a paid domain, ask for confirmation
        if (isPaidDomain) {
            const confirmed = confirm(
                "Vous avez déjà 3 sous-domaines gratuits.\n\n" +
                "Ce domaine supplémentaire coûtera 2 points/jour tant qu'il existe.\n\n" +
                "Voulez-vous continuer ?"
            );
            if (!confirmed) return;
        }

        setActionLoading(true);
        const toastId = toast.loading("Configuration de Cloudflare...");

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/instances/${id}/domains`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    port: parseInt(newDomain.port),
                    customSuffix: newDomain.suffix,
                    isPaid: isPaidDomain
                })
            });

            if (response.ok) {
                toast.success("Domaine configuré avec succès !", { id: toastId });
                setNewDomain({ port: "", suffix: "" });

                // Refresh list
                const domRes = await fetch(`/api/instances/${id}/domains`, {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });
                if (domRes.ok) setDomains(await domRes.json());

            } else {
                const error = await response.json();
                toast.error(error.error || "Erreur lors de la création", { id: toastId });
            }
        } catch (error) {
            toast.error("Erreur de connexion", { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDomain = async (domainId: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce domaine ?")) return;

        setActionLoading(true);
        const toastId = toast.loading("Suppression du tunnel...");

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/instances/${id}/domains/${domainId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                toast.success("Domaine supprimé", { id: toastId });
                // Refresh list
                const domRes = await fetch(`/api/instances/${id}/domains`, {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });
                if (domRes.ok) setDomains(await domRes.json());
            } else {
                const error = await response.json();
                toast.error(error.error || "Erreur lors de la suppression", { id: toastId });
            }
        } catch (error) {
            toast.error("Erreur de connexion", { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container mx-auto p-6 md:p-8 relative z-10 max-w-5xl">
                {/* Header */}
                <div className="flex items-center gap-6 mb-12 animate-fade-up">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/instance/${id}`)}
                        className="rounded-full hover:bg-white/5 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight gradient-text">
                            Gestion des Domaines
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            Configuration sécurisée via Cloudflare Tunnel pour {instanceName}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Left Column: Create Form */}
                    <div className="md:col-span-1 space-y-6 animate-fade-up-delay-1">
                        <div className="glass rounded-xl p-6 border border-white/10 relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-primary" />
                                    Nouveau Domaine
                                </h2>
                                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded-full border border-white/10">
                                    {domains.filter(d => !d.isPaid).length}/3 gratuits
                                </span>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <h3 className="text-sm font-medium text-indigo-400 mb-1">Aperçu</h3>
                                    <p className="text-xs text-muted-foreground font-mono break-all">
                                        {userName}-{instanceName}-{newDomain.suffix || "suffix"}.smp4.xyz
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Nom du service</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: map, dynmap, api..."
                                        value={newDomain.suffix}
                                        onChange={(e) => setNewDomain({ ...newDomain, suffix: e.target.value.replace(/[^a-z0-9]/gi, '') })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Port de l'application</label>
                                    <input
                                        type="number"
                                        placeholder="EX: 8080 or 3000"
                                        value={newDomain.port}
                                        onChange={(e) => setNewDomain({ ...newDomain, port: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                    <p className="text-xs text-muted-foreground">Port interne dans la VM.</p>
                                </div>

                                <Button
                                    onClick={handleCreateDomain}
                                    disabled={actionLoading || !newDomain.port || !newDomain.suffix}
                                    className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white shadow-lg shadow-primary/20 py-6"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : domains.filter(d => !d.isPaid).length >= 3 ? (
                                        "Acheter (+2 pts/jour)"
                                    ) : (
                                        "Créer l'accès"
                                    )}
                                </Button>

                                {domains.filter(d => !d.isPaid).length >= 3 && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        <p className="text-xs text-amber-200/80">
                                            Les domaines suivants seront payants : <strong>2 points/jour</strong> par domaine supplémentaire.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass rounded-xl p-5 border border-white/10 bg-amber-500/5">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <p className="text-xs text-amber-200/80 leading-relaxed">
                                    Les changements DNS peuvent prendre jusqu'à 1 minute pour se propager. Assurez-vous que votre application écoute bien sur le port indiqué.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: List */}
                    <div className="md:col-span-2 space-y-6 animate-fade-up-delay-2">
                        <div className="glass rounded-xl p-6 md:p-8 border border-white/10 min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-400" />
                                    Domaines Actifs
                                </h2>
                                {domains.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        3 gratuits, puis 2 pts/jour
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : domains.length === 0 ? (
                                    <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Globe className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-medium mb-2">Aucun domaine</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Créez votre premier sous-domaine pour rendre votre application accessible depuis internet.
                                        </p>
                                    </div>
                                ) : (
                                    domains.map((dom) => (
                                        <div key={dom.id} className="relative group overflow-hidden p-6 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 to-transparent hover:border-indigo-500/30 transition-all hover:bg-white/10">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                        <LinkIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <a
                                                            href={`https://${dom.subdomain}.smp4.xyz`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xl font-bold text-foreground hover:text-indigo-400 transition-colors flex items-center gap-2"
                                                        >
                                                            {dom.subdomain}.smp4.xyz
                                                            <ExternalLink className="w-4 h-4 opacity-50" />
                                                        </a>
                                                        <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground font-mono">
                                                            <span className="bg-white/5 px-2 py-0.5 rounded">Port: {dom.port}</span>
                                                            <span>•</span>
                                                            {dom.isPaid ? (
                                                                <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                                                                    <Coins className="w-3 h-3" />
                                                                    2 pts/jour
                                                                </span>
                                                            ) : (
                                                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold">
                                                                    Gratuit
                                                                </span>
                                                            )}
                                                            <span>•</span>
                                                            <span className="text-emerald-400 flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                                Actif
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-all pt-1" // pt-1 to align
                                                    onClick={() => handleDeleteDomain(dom.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstanceDomains;
