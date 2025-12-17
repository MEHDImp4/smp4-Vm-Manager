import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Cloud, LogOut, User, Shield, Key, ChevronRight, LayoutDashboard, Coins, History, Settings, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

const Account = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Change State
    const [passOpen, setPassOpen] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passFormData, setPassFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        const fetchUserData = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                navigate("/login");
                return;
            }
            const localUser = JSON.parse(userStr);

            // Fetch fresh profile data including avatar
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { "Authorization": `Bearer ${localUser.token}` }
                });
                if (res.ok) {
                    const freshUser = await res.json();
                    // Merge with token from local storage
                    const updatedUser = { ...freshUser, token: localUser.token };
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser)); // Update local storage
                } else {
                    setUser(localUser); // Fallback
                }
            } catch (e) {
                setUser(localUser);
            }
        };
        fetchUserData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        toast.success("Déconnexion réussie");
        navigate("/");
    };

    // Avatar Upload Handler
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAvatarLoading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch('/api/auth/avatar', {
                method: 'POST',
                headers: { "Authorization": `Bearer ${user.token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setUser((prev: any) => ({ ...prev, avatarUrl: data.avatarUrl }));

                // Update local storage
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...localUser, avatarUrl: data.avatarUrl }));

                toast.success("Photo de profil mise à jour");
            } else {
                toast.error("Erreur lors de l'upload");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur de connexion");
        } finally {
            setAvatarLoading(false);
        }
    };

    // Password Change Handler
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passFormData.newPassword !== passFormData.confirmPassword) {
            toast.error("Les nouveaux mots de passe ne correspondent pas");
            return;
        }

        setPassLoading(true);
        try {
            const res = await fetch('/api/auth/password', {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    currentPassword: passFormData.currentPassword,
                    newPassword: passFormData.newPassword
                })
            });

            if (res.ok) {
                toast.success("Mot de passe modifié avec succès");
                setPassOpen(false);
                setPassFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                const data = await res.json();
                toast.error(data.message || "Erreur lors du changement de mot de passe");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur de connexion");
        } finally {
            setPassLoading(false);
        }
    };

    if (!user) return null;

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
                        <Button variant="ghost" size="sm" asChild className="hover:bg-white/5">
                            <Link to="/dashboard">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Tableau de bord
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 max-w-4xl">
                <div className="mb-8 animate-fade-up">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Mon Profil</h1>
                    <p className="text-muted-foreground">Gérez vos informations personnelles et vos préférences.</p>
                </div>

                <div className="grid gap-6 animate-fade-up-delay-1">
                    {/* Profile Card */}
                    <div className="glass rounded-2xl p-6 md:p-8 border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">

                            {/* Avatar Section */}
                            <div className="relative group/avatar cursor-pointer" onClick={handleAvatarClick}>
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-white/10 shadow-xl overflow-hidden relative">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-primary" />
                                    )}

                                    {/* Hosting overlay on hover */}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>

                                    {avatarLoading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-background rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                                    <Settings className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identité</label>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="font-medium">{user.name || 'Utilisateur'}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div className="font-mono text-sm">{user.email || 'Email non renseigné'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-wrap gap-3">
                                    <Dialog open={passOpen} onOpenChange={setPassOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2">
                                                <Key className="w-4 h-4" />
                                                Modifier le mot de passe
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md glass border-white/10">
                                            <DialogHeader>
                                                <DialogTitle>Changer le mot de passe</DialogTitle>
                                                <DialogDescription>
                                                    Entrez votre mot de passe actuel et le nouveau mot de passe souhaité.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="current">Mot de passe actuel</Label>
                                                    <Input
                                                        id="current"
                                                        type="password"
                                                        value={passFormData.currentPassword}
                                                        onChange={(e) => setPassFormData({ ...passFormData, currentPassword: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new">Nouveau mot de passe</Label>
                                                    <Input
                                                        id="new"
                                                        type="password"
                                                        value={passFormData.newPassword}
                                                        onChange={(e) => setPassFormData({ ...passFormData, newPassword: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
                                                    <Input
                                                        id="confirm"
                                                        type="password"
                                                        value={passFormData.confirmPassword}
                                                        onChange={(e) => setPassFormData({ ...passFormData, confirmPassword: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" variant="ghost" onClick={() => setPassOpen(false)}>Annuler</Button>
                                                    <Button type="submit" disabled={passLoading}>
                                                        {passLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                        Enregistrer
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2 opacity-50 cursor-not-allowed">
                                        <Shield className="w-4 h-4" />
                                        Sécurité 2FA (Bientôt)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats / Usage Summary */}
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-up-delay-2">
                        <div className="glass rounded-2xl p-6 border border-white/10 hover:border-primary/20 transition-colors group">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-yellow-500" />
                                    Solde de Points
                                </h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Button>
                            </div>
                            <div className="text-3xl font-bold mb-1">{user.points?.toFixed(2) || '0.00'}</div>
                            <div className="text-sm text-muted-foreground mb-4">Points disponibles</div>
                            <Button className="w-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 text-yellow-500 border border-yellow-500/20 shadow-none">
                                Recharge Rapide
                            </Button>
                        </div>

                        <div className="glass rounded-2xl p-6 border border-white/10 hover:border-secondary/20 transition-colors group">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <History className="w-5 h-5 text-blue-500" />
                                    Historique
                                </h3>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary transition-colors" />
                                </Button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                                    <span className="text-muted-foreground">Dernière connexion</span>
                                    <span className="font-mono">Aujourd'hui</span>
                                </div>
                                <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                                    <span className="text-muted-foreground">Instances créées</span>
                                    <span className="font-mono">--</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-8 animate-fade-up-delay-3 pb-8">
                        <Button
                            variant="destructive"
                            className="w-full h-12 text-base shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-5 h-5 mr-2" />
                            Se déconnecter
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            MiniCloud v1.0.0 • Fait avec ❤️ par l'équipe
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Account;
