/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Cloud, LogOut, User, Shield, Key, ChevronRight, LayoutDashboard, Coins, History, Settings, Loader2, Camera, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

    // Buy Points State
    const [buyOpen, setBuyOpen] = useState(false);
    const [buyLoading, setBuyLoading] = useState(false);



    const handleBuyPoints = async () => {
        setBuyLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setBuyLoading(false);
        setBuyOpen(false);
        toast.success("Points achetés avec succès ! (Simulation)");
        // Update user points locally for demo
        setUser((prev: any) => ({ ...prev, points: (prev?.points || 0) + 500 }));
    };

    const [usageData, setUsageData] = useState<any[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                navigate("/login");
                return;
            }
            const localUser = JSON.parse(userStr);

            // Fetch fresh profile data
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { "Authorization": `Bearer ${localUser.token}` }
                });
                if (res.ok) {
                    const freshUser = await res.json();
                    const updatedUser = { ...freshUser, token: localUser.token };
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser)); // Update local storage
                } else {
                    setUser(localUser); // Fallback
                }

                // Fetch Points History
                const historyRes = await fetch('/api/auth/me/points-history', {
                    headers: { "Authorization": `Bearer ${localUser.token}` }
                });
                if (historyRes.ok) {
                    const transactions = await historyRes.json();
                    processHistoryData(transactions);
                }

            } catch (e) {
                setUser(localUser);
            }
        };
        fetchUserData();
    }, [navigate]);

    const processHistoryData = (transactions: any[]) => {
        // Group by day (last 7 days) using simple aggregation
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const grouped = last7Days.map(date => {
            const dayTransactions = transactions.filter((t: any) => t.createdAt.startsWith(date) && t.type === 'usage');
            const totalPoints = dayTransactions.reduce((acc: number, t: any) => acc + Math.abs(t.amount), 0);

            const dateObj = new Date(date);
            const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
            return {
                name: days[dateObj.getDay()],
                points: parseFloat(totalPoints.toFixed(2))
            };
        });

        setUsageData(grouped);
    };

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

                    {/* Stats / Usage Summary - Enhanced */}
                    <div className="grid md:grid-cols-2 gap-6 animate-fade-up-delay-2">
                        {/* Points Balance & Buy */}
                        <div className="glass rounded-2xl p-6 border border-white/10 hover:border-primary/20 transition-colors group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-yellow-500/10 rounded-full blur-[80px]" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        Solde de Points
                                    </h3>
                                </div>
                                <div className="text-4xl font-bold mb-2 tracking-tight">{user.points?.toFixed(0) || '0'} <span className="text-lg text-muted-foreground font-normal">pts</span></div>
                                <p className="text-sm text-muted-foreground mb-6">Suffisant pour environ {Math.floor((user.points || 0) / 50)} jours de VM standard.</p>

                                <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full h-11 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 text-yellow-500 border border-yellow-500/20 shadow-none">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Recharger mon compte
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md glass border-white/10">
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2">
                                                <Coins className="w-5 h-5 text-yellow-500" />
                                                Recharger des points
                                            </DialogTitle>
                                            <DialogDescription>
                                                Choisissez un pack de points. (Simulation)
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-4 py-4">
                                            {[
                                                { amount: 100, price: "5€", popular: false },
                                                { amount: 500, price: "20€", popular: true },
                                                { amount: 1000, price: "35€", popular: false },
                                                { amount: 5000, price: "150€", popular: false },
                                            ].map((pack, i) => (
                                                <div key={i} className={`relative p-4 rounded-xl border cursor-pointer hover:bg-white/5 transition-all ${pack.popular ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`} onClick={handleBuyPoints}>
                                                    {pack.popular && (
                                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-[10px] font-bold uppercase tracking-wider">
                                                            Populaire
                                                        </div>
                                                    )}
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-foreground mb-1">{pack.amount}</div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Points</div>
                                                        <div className="mt-3 py-1 px-2 rounded-lg bg-white/10 text-sm font-bold">
                                                            {pack.price}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setBuyOpen(false)}>Annuler</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>

                        {/* Usage Graph */}
                        <div className="glass rounded-2xl p-6 border border-white/10 hover:border-blue-500/20 transition-colors group relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[80px]" />
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    Consommation (7j)
                                </h3>
                            </div>
                            <div className="flex-1 w-full min-h-[150px] relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={usageData}>
                                        <defs>
                                            <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#e4e4e7' }}
                                            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                                        />
                                        <Area type="monotone" dataKey="points" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorPoints)" />
                                    </AreaChart>
                                </ResponsiveContainer>
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
