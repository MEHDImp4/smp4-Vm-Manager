/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Plus, Loader2, Trash2, ExternalLink, Link as LinkIcon, ShieldCheck, AlertCircle, Coins, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const InstanceDomains = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState({ port: "", suffix: "" });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [instanceName, setInstanceName] = useState("");
    const [userName, setUserName] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; description: React.ReactNode; onConfirm: () => void }>({ isOpen: false, title: "", description: "", onConfirm: () => { } });

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

                // Fetch Instance Name
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

    const handleCreateDomain = () => {
        if (!newDomain.port || !newDomain.suffix) {
            toast.error("Veuillez remplir tous les champs");
            return;
        }

        const freeDomains = domains.filter(d => !d.isPaid);
        const isPaidDomain = freeDomains.length >= 3;

        // If it's a paid domain, ask for confirmation
        if (isPaidDomain) {
            setConfirmDialog({
                isOpen: true,
                title: "Confirmation de paiement",
                description: (
                    <div className="space-y-2">
                        <p>Vous avez déjà 3 sous-domaines gratuits.</p>
                        <p>Ce domaine supplémentaire coûtera <strong>2 points/jour</strong> tant qu'il existe.</p>
                        <p>Voulez-vous continuer ?</p>
                    </div>
                ),
                onConfirm: () => executeCreateDomain(isPaidDomain)
            });
        } else {
            executeCreateDomain(false);
        }
    };

    const executeCreateDomain = async (isPaidDomain: boolean) => {
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

    const handleDeleteDomain = (domainId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Supprimer le domaine",
            description: "Voulez-vous vraiment supprimer ce domaine ?",
            onConfirm: () => executeDeleteDomain(domainId)
        });
    };

    const executeDeleteDomain = async (domainId: string) => {
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
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-[0.03]" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto p-6 md:p-8 relative z-10 max-w-6xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-up">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/instance/${id}`)}
                            className="rounded-xl border-white/10 hover:bg-white/5 hover:border-primary/20 transition-all h-10 w-10"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Gestion des <span className="gradient-text">Domaines</span>
                            </h1>
                            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm bg-white/5 w-fit px-3 py-1 rounded-full border border-white/5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                Cloudflare Tunnel pour <span className="text-foreground font-medium">{instanceName}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-12 gap-8">
                    {/* Left Column: Create Form (4 cols) */}
                    <div className="md:col-span-4 space-y-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
                        <div className="glass rounded-2xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <Plus className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold">Nouveau Domaine</h2>
                                        <p className="text-xs text-muted-foreground">Exposer un service</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded-md border border-white/10 text-muted-foreground">
                                    {domains.filter(d => !d.isPaid).length}/3 Free
                                </span>
                            </div>

                            <div className="space-y-5 relative z-10">
                                {/* Preview Box */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 group hover:border-primary/20 transition-colors">
                                    <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <Globe className="w-3 h-3" />
                                        Aperçu URL
                                    </h3>
                                    <p className="text-sm font-mono text-primary break-all">
                                        <span className="text-foreground font-semibold bg-primary/10 px-1 rounded">{newDomain.suffix || "app"}</span>
                                        <span className="text-muted-foreground/50">-{userName}-</span>
                                        <span className="text-muted-foreground/50">{instanceName}</span>
                                        <span className="text-muted-foreground/50">.smp4.xyz</span>
                                    </p>
                                </div>

                                {/* Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground ml-1">Préfixe du service</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: api, blog, map..."
                                            value={newDomain.suffix}
                                            onChange={(e) => setNewDomain({ ...newDomain, suffix: e.target.value.replace(/[^a-z0-9]/gi, '') })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/40"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground ml-1">Port Interne</label>
                                        <input
                                            type="number"
                                            placeholder="Ex: 3000, 8080..."
                                            value={newDomain.port}
                                            onChange={(e) => setNewDomain({ ...newDomain, port: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:bg-black/40 transition-all placeholder:text-muted-foreground/40"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreateDomain}
                                    disabled={actionLoading || !newDomain.port || !newDomain.suffix}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-11 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {actionLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : domains.filter(d => !d.isPaid).length >= 3 ? (
                                        "Acheter (+2 pts/jour)"
                                    ) : (
                                        "Créer l'accès"
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="glass rounded-xl p-5 border border-white/5 bg-gradient-to-br from-amber-500/5 to-transparent">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500/80 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-amber-200/90">Note Importante</p>
                                    <p className="text-xs text-amber-200/60 leading-relaxed">
                                        Assurez-vous que votre application écoute bien sur le port indiqué dans la VM (0.0.0.0). La propagation DNS prend ~30s.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: List (8 cols) */}
                    <div className="md:col-span-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
                        <div className="glass rounded-2xl border border-white/10 min-h-[500px] flex flex-col">
                            {/* List Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-400" />
                                    Domaines Actifs
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {/* Avatars or indicators could go here */}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 bg-black/10">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                                        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                                        <p className="text-sm">Chargement des configurations...</p>
                                    </div>
                                ) : domains.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            <Globe className="w-10 h-10 text-muted-foreground/30" />
                                        </div>
                                        <h3 className="text-xl font-medium mb-2">Aucun domaine configuré</h3>
                                        <p className="text-muted-foreground max-w-sm">
                                            Utilisez le formulaire à gauche pour rendre vos services accessibles depuis l'extérieur.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {domains.map((dom, idx) => (
                                            <div
                                                key={dom.id}
                                                className="group relative p-5 rounded-xl border border-white/5 bg-gradient-to-r from-white/5 to-transparent hover:border-primary/20 hover:bg-white/[0.07] transition-all duration-300 animate-fade-up"
                                                style={{ animationDelay: `${idx * 100}ms` }}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                                    {/* Left: Info */}
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                                                            {dom.subdomain.startsWith('portainer') ? (
                                                                <Server className="w-6 h-6" />
                                                            ) : (
                                                                <Globe className="w-6 h-6" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <a
                                                                    href={`https://${dom.subdomain}.smp4.xyz`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-lg font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                                                                >
                                                                    {dom.subdomain}.smp4.xyz
                                                                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                                                                </a>
                                                                {dom.subdomain.startsWith('portainer') && (
                                                                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                                                        SYSTEM
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
                                                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                                                                    Port {dom.port}
                                                                </span>

                                                                {dom.isPaid ? (
                                                                    <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/10">
                                                                        <Coins className="w-3 h-3" />
                                                                        2 pts/jour
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/10">
                                                                        Gratuit
                                                                    </span>
                                                                )}

                                                                <span className="text-emerald-500 flex items-center gap-1.5 ml-2">
                                                                    <span className="relative flex h-2 w-2">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                    Actif
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Actions */}
                                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-9 w-9"
                                                            onClick={() => handleDeleteDomain(dom.id)}
                                                            disabled={actionLoading}
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            asChild
                                                            className="text-foreground hover:text-primary hover:border-primary/50 bg-transparent rounded-full h-9 w-9"
                                                            title="Ouvrir"
                                                        >
                                                            <a href={`https://${dom.subdomain}.smp4.xyz`} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            confirmDialog.onConfirm();
                            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        }}>
                            Continuer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default InstanceDomains;
