import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users, Server, Activity, Shield, Search, RefreshCw, Ban, UserCheck, Edit, Plus, Trash2, Power, ArrowLeft, Cpu, ShieldAlert, CheckCircle, Box, Database, Save, HardDrive, MoreVertical, Minus, Tag, Globe, Lock, Mail, Send, Eye, Zap, MemoryStick } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface NodeStats {
    cpu: number;
    memory: {
        total: number;
        used: number;
    };
    uptime: number;
    pveversion: string;
    kversion: string;
    cpuinfo?: {
        model: string;
        cpus: number;
    };
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    points: number;
    isBanned: boolean;
    _count?: {
        instances: number;
    };
}

interface Instance {
    id: string;
    name: string;
    template: string;
    vmid: number;
    ip?: string;
    cpu: string;
    ram: string;
    storage: string;
    pointsPerDay: number;
    created_at: string;
    status: string;
    user?: {
        email: string;
        name: string;
    };

}

interface Template {
    id: string;
    name: string;
    cpu: string;
    ram: string;
    storage: string;
    points: number;
    oldPrice?: number;
}

interface UpgradePack {
    id: number;
    name: string;
    type: 'cpu' | 'ram' | 'storage';
    amount: number;
    pointsCost: number;
    isActive: boolean;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [nodeStats, setNodeStats] = useState<NodeStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [allInstances, setAllInstances] = useState<Instance[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [searchUser, setSearchUser] = useState("");
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editPoints, setEditPoints] = useState("");

    // Template Edit State
    const [editTemplate, setEditTemplate] = useState<Template | null>(null);
    const [newTemplatePrice, setNewTemplatePrice] = useState("");
    const [isPromo, setIsPromo] = useState(false);
    const [promoPrice, setPromoPrice] = useState("");

    // Upgrade Packs State
    const [upgradePacks, setUpgradePacks] = useState<UpgradePack[]>([]);
    const [newPack, setNewPack] = useState({ name: "", type: "cpu", amount: 1, pointsCost: 0 });
    const [createPackOpen, setCreatePackOpen] = useState(false);

    // Ban State
    const [banDialog, setBanDialog] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [banReason, setBanReason] = useState("");
    const [banDuration, setBanDuration] = useState("");

    // Delete State
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });

    const [deleteReason, setDeleteReason] = useState("");

    // Confirm Dialog State for Unban
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; description: string; onConfirm: () => void }>({ isOpen: false, title: "", description: "", onConfirm: () => { } });

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const headers = { "Authorization": `Bearer ${user.token}` };

            // Fetch in parallel
            const [usersRes, instancesRes, nodeRes, templatesRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/instances', { headers }),
                fetch('/api/admin/node/stats', { headers }),
                fetch('/api/admin/templates', { headers })
            ]);

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(Array.isArray(usersData) ? usersData : []);
            }
            if (instancesRes.ok) {
                const instancesData = await instancesRes.json();
                setAllInstances(Array.isArray(instancesData) ? instancesData : []);
            }
            if (nodeRes.ok) setNodeStats(await nodeRes.json());
            if (templatesRes.ok) {
                const templatesData = await templatesRes.json();
                setTemplates(Array.isArray(templatesData) ? templatesData : []);
            }

            const upgradesRes = await fetch('/api/admin/upgrades', { headers });
            if (upgradesRes.ok) {
                const upgradesData = await upgradesRes.json();
                setUpgradePacks(Array.isArray(upgradesData) ? upgradesData : []);
            }

        } catch (error) {
            console.error("Failed to fetch admin data", error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleBanClick = (user: User) => {
        if (user.isBanned) {
            // Unban immediately with confirmation
            setConfirmDialog({
                isOpen: true,
                title: "Débannir l'utilisateur ?",
                description: `Voulez-vous vraiment débannir ${user.name} ?`,
                onConfirm: () => performBan(user.id, false)
            });
        } else {
            setBanDialog({ isOpen: true, user });
            setBanReason("");
            setBanDuration("");
        }
    };

    const performBan = async (userId: number, isBanned: boolean, reason?: string, duration?: string) => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const body: { isBanned: boolean; banReason?: string; banDuration?: string } = { isBanned };
            if (isBanned) {
                body.banReason = reason;
                if (duration) body.banDuration = duration;
            }

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                toast.success(`Utilisateur ${isBanned ? 'banni' : 'débanni'}`);
                setBanDialog({ isOpen: false, user: null });
                fetchData();
            } else {
                toast.error("Erreur lors de la mise à jour");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        }
    };

    const handleDeleteClick = (user: User) => {
        setDeleteDialog({ isOpen: true, user });
        setDeleteReason("");
    };

    const performDelete = async () => {
        if (!deleteDialog.user) return;
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/admin/users/${deleteDialog.user.id}`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ reason: deleteReason })
            });

            if (response.ok) {
                toast.success("Utilisateur supprimé et ressources nettoyées");
                setDeleteDialog({ isOpen: false, user: null });
                fetchData();
            } else {
                toast.error("Erreur lors de la suppression");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        }
    };

    const handleUpdatePoints = async () => {
        if (!editUser || !editPoints) return;

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/admin/users/${editUser.id}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ points: parseFloat(editPoints) })
            });

            if (response.ok) {
                toast.success("Points mis à jour");
                setEditUser(null);
                fetchData();
            } else {
                toast.error("Erreur lors de la mise à jour");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        }
    };

    const handleUpdateTemplate = async () => {
        if (!editTemplate || !newTemplatePrice) return;

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/admin/templates/${editTemplate.id}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    points: parseFloat(newTemplatePrice),
                    oldPrice: isPromo ? (parseFloat(promoPrice) || null) : null
                })
            });

            if (response.ok) {
                toast.success("Prix du template mis à jour");
                setEditTemplate(null);
                fetchData();
            } else {
                toast.error("Erreur lors de la mise à jour");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUser.toLowerCase())
    );

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };

    if (loading && !nodeStats) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-500/10 rounded-full blur-[80px] animate-float" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-up">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight gradient-text mb-2">Administration</h1>
                        <p className="text-muted-foreground text-lg">Vue d'ensemble et gestion complète de la plateforme</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            className="glass border-white/10 hover:bg-white/5 transition-all duration-300 group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Retour au Dashboard
                        </Button>
                        <Button
                            onClick={fetchData}
                            variant="outline"
                            size="icon"
                            className="glass border-white/10 hover:bg-white/5 transition-all duration-300 hover:rotate-180"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-8 animate-fade-up-delay-1">
                    <TabsList className="bg-black/40 backdrop-blur-xl p-1.5 border border-white/10 rounded-2xl w-full max-w-3xl mx-auto grid grid-cols-6 gap-1">
                        <TabsTrigger
                            value="overview"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Activity className="w-4 h-4" /> Vue
                        </TabsTrigger>
                        <TabsTrigger
                            value="users"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Users className="w-4 h-4" /> Users
                        </TabsTrigger>
                        <TabsTrigger
                            value="instances"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Server className="w-4 h-4" /> Globales
                        </TabsTrigger>
                        <TabsTrigger
                            value="templates"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Cpu className="w-4 h-4" /> Templates
                        </TabsTrigger>
                        <TabsTrigger
                            value="messages"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Mail className="w-4 h-4" /> Messages
                        </TabsTrigger>
                        <TabsTrigger
                            value="upgrades"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300"
                        >
                            <Zap className="w-4 h-4" /> Upgrades
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Content */}
                    <TabsContent value="overview" className="space-y-8 animate-fade-in">
                        {nodeStats && (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="glass border-primary/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">CPU Node</CardTitle>
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-bold mb-2">{(nodeStats.cpu * 100).toFixed(1)}%</div>
                                        <Progress value={nodeStats.cpu * 100} className="h-1.5" />
                                        <p className="text-xs text-muted-foreground mt-3 font-mono">{nodeStats.cpuinfo?.model}</p>
                                    </CardContent>
                                </Card>
                                {nodeStats.memory && (
                                    <Card className="glass border-purple-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">RAM Node</CardTitle>
                                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                                <Activity className="h-4 w-4" />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="relative z-10">
                                            <div className="text-3xl font-bold mb-2">{((nodeStats.memory.used / nodeStats.memory.total) * 100).toFixed(1)}%</div>
                                            <Progress value={(nodeStats.memory.used / nodeStats.memory.total) * 100} className="h-1.5 bg-purple-900/20" indicatorClassName="bg-purple-500" />
                                            <p className="text-xs text-muted-foreground mt-3 font-mono">{formatBytes(nodeStats.memory.used)} / {formatBytes(nodeStats.memory.total)}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                <Card className="glass border-emerald-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
                                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-bold mb-2">{Math.floor(nodeStats.uptime / 86400)}j</div>
                                        <p className="text-xs text-muted-foreground mt-2">En ligne depuis {Math.floor(nodeStats.uptime / 3600)} heures</p>
                                    </CardContent>
                                </Card>
                                <Card className="glass border-amber-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Version PVE</CardTitle>
                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative z-10">
                                        <div className="text-3xl font-bold mb-2">{nodeStats.pveversion.split('/')[1]?.split(' ')[0] || 'Unknown'}</div>
                                        <p className="text-xs text-muted-foreground mt-2 font-mono text-[10px]">{nodeStats.kversion}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="glass border-white/10">
                                <CardHeader>
                                    <CardTitle>Statistiques Plateforme</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-muted-foreground">Utilisateurs Totaux</span>
                                        <span className="font-bold text-2xl">{users.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-muted-foreground">Instances Totales</span>
                                        <span className="font-bold text-2xl">{allInstances.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-muted-foreground">Instances en Ligne</span>
                                        <span className="font-bold text-2xl text-emerald-500">{allInstances.filter(i => i.status === 'online').length}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Upgrades Content */}
                    <TabsContent value="upgrades" className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Packs d'Amélioration</h2>
                            <Dialog open={createPackOpen} onOpenChange={setCreatePackOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-primary hover:bg-primary/90">
                                        <Plus className="w-4 h-4 mr-2" /> Nouveau Pack
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Créer un pack d'amélioration</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pack-name">Nom</Label>
                                            <Input
                                                id="pack-name"
                                                placeholder="Ex: +1 vCPU, +4GB RAM"
                                                value={newPack.name}
                                                onChange={e => setNewPack({ ...newPack, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pack-type">Type</Label>
                                                <select
                                                    id="pack-type"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={newPack.type}
                                                    onChange={e => setNewPack({ ...newPack, type: e.target.value })}
                                                >
                                                    <option value="cpu">CPU (vCore)</option>
                                                    <option value="ram">RAM (GB)</option>
                                                    <option value="storage">Stockage (GB)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="pack-amount">Quantité</Label>
                                                <Input
                                                    id="pack-amount"
                                                    type="number"
                                                    value={newPack.amount}
                                                    onChange={e => setNewPack({ ...newPack, amount: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pack-cost">Coût en Points (par jour)</Label>
                                            <Input
                                                id="pack-cost"
                                                type="number"
                                                step="0.1"
                                                value={newPack.pointsCost}
                                                onChange={e => setNewPack({ ...newPack, pointsCost: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={async () => {
                                            try {
                                                const userStr = localStorage.getItem("user");
                                                if (!userStr) return;
                                                const user = JSON.parse(userStr);
                                                const res = await fetch('/api/admin/upgrades', {
                                                    method: 'POST',
                                                    headers: {
                                                        "Authorization": `Bearer ${user.token}`,
                                                        "Content-Type": "application/json"
                                                    },
                                                    body: JSON.stringify(newPack)
                                                });
                                                if (res.ok) {
                                                    toast.success("Pack créé !");
                                                    setCreatePackOpen(false);
                                                    fetchData();
                                                }
                                            } catch (e) { toast.error("Erreur"); }
                                        }}>Créer</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upgradePacks.map(pack => (
                                <Card key={pack.id} className="glass border-white/10 relative overflow-hidden group">
                                    <div className={`absolute top-0 right-0 p-2 opacity-50`}>
                                        {pack.type === 'cpu' && <Cpu className="w-12 h-12" />}
                                        {pack.type === 'ram' && <MemoryStick className="w-12 h-12" />}
                                        {pack.type === 'storage' && <HardDrive className="w-12 h-12" />}
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="flex justify-between items-center">
                                            {pack.name}
                                            <Badge variant={pack.isActive ? "default" : "secondary"}>
                                                {pack.isActive ? "Actif" : "Inactif"}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>{pack.type.toUpperCase()} +{pack.amount}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold mb-4">{pack.pointsCost} pts/jour</div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={async () => {
                                                const userStr = localStorage.getItem("user");
                                                if (!userStr) return;
                                                const user = JSON.parse(userStr);
                                                await fetch(`/api/admin/upgrades/${pack.id}`, {
                                                    method: 'PUT',
                                                    headers: { "Authorization": `Bearer ${user.token}`, "Content-Type": "application/json" },
                                                    body: JSON.stringify({ name: pack.name, isActive: !pack.isActive })
                                                });
                                                fetchData();
                                            }}>
                                                {pack.isActive ? "Désactiver" : "Activer"}
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={async () => {
                                                if (!confirm("Supprimer ce pack ?")) return;
                                                const userStr = localStorage.getItem("user");
                                                if (!userStr) return;
                                                const user = JSON.parse(userStr);
                                                await fetch(`/api/admin/upgrades/${pack.id}`, {
                                                    method: 'DELETE',
                                                    headers: { "Authorization": `Bearer ${user.token}` }
                                                });
                                                fetchData();
                                            }}>
                                                Supprimer
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Users Content */}
                    <TabsContent value="users" className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher un utilisateur..."
                                    className="pl-9"
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20 backdrop-blur-sm">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Rôle</TableHead>
                                        <TableHead>Points</TableHead>
                                        <TableHead>Instances</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">{user.points.toFixed(2)}</TableCell>
                                            <TableCell>{user._count?.instances || 0}</TableCell>
                                            <TableCell>
                                                {user.isBanned ? (
                                                    <Badge variant="destructive">Banni</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Actif</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline" size="sm"
                                                        onClick={() => {
                                                            setEditUser(user);
                                                            setEditPoints(user.points.toString());
                                                        }}
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>

                                                    <Button
                                                        variant={user.isBanned ? "default" : "destructive"}
                                                        size="sm"
                                                        onClick={() => handleBanClick(user)}
                                                    >
                                                        {user.isBanned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                                    </Button>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteClick(user)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* Global Instances Content */}
                    <TabsContent value="instances" className="space-y-6 animate-fade-in">
                        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20 backdrop-blur-sm">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-transparent border-white/10">
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Propriétaire</TableHead>
                                        <TableHead>Template</TableHead>
                                        <TableHead>PVE ID</TableHead>
                                        <TableHead>IP</TableHead>
                                        <TableHead>Ressources</TableHead>
                                        <TableHead>Coût/Jour</TableHead>
                                        <TableHead>Créée le</TableHead>
                                        <TableHead>Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allInstances.map((inst) => (
                                        <TableRow key={inst.id} className="border-white/10 hover:bg-white/5">
                                            <TableCell className="font-medium">{inst.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{inst.user?.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">{inst.template}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{inst.vmid}</TableCell>
                                            <TableCell className="font-mono text-xs text-blue-400">{inst.ip || '-'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {inst.cpu} vCPU / {inst.ram} GB / {inst.storage} GB
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {inst.pointsPerDay} pts
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(inst.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    inst.status === 'online' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                        inst.status === 'stopped' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                            "bg-white/5 text-muted-foreground"
                                                }>
                                                    {inst.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="templates" className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map((tpl) => {
                                const isPromo = tpl.oldPrice && tpl.points < tpl.oldPrice;
                                return (
                                    <div key={tpl.id} className="glass rounded-xl p-6 border-white/10 relative overflow-hidden group hover:border-primary/50 transition-colors">
                                        {isPromo && (
                                            <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-red-500 to-pink-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl shadow-lg z-10">
                                                Promotion
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Cpu className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{tpl.name}</h3>
                                                <p className="text-xs text-muted-foreground font-mono">{tpl.id}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                <span className="text-muted-foreground">CPU</span>
                                                <span className="font-mono">{tpl.cpu}</span>
                                            </div>
                                            <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                <span className="text-muted-foreground">RAM</span>
                                                <span className="font-mono">{tpl.ram}</span>
                                            </div>
                                            <div className="flex justify-between text-sm py-1 border-b border-white/5">
                                                <span className="text-muted-foreground">Storage</span>
                                                <span className="font-mono">{tpl.storage}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between mb-6">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Prix par jour</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-bold gradient-text">{tpl.points} pts</span>
                                                    {isPromo && (
                                                        <span className="text-sm text-muted-foreground line-through decoration-red-500/50 decoration-2">
                                                            {tpl.oldPrice} pts
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className="w-full border-white/10 hover:bg-white/5"
                                            onClick={() => {
                                                setEditTemplate(tpl);
                                                setNewTemplatePrice(tpl.points.toString());
                                                setIsPromo(!!tpl.oldPrice);
                                                setPromoPrice(tpl.oldPrice ? tpl.oldPrice.toString() : tpl.points.toString());
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Modifier le prix
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </TabsContent>

                    <TabsContent value="messages" className="space-y-4 animate-fade-in">
                        <Card className="glass border-white/10">
                            <CardHeader>
                                <CardTitle>Messages reçus</CardTitle>
                                <CardDescription>Gérez les messages envoyés depuis le formulaire de contact.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MessagesTable />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Edit Points Dialog */}
                <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier les points</DialogTitle>
                            <DialogDescription>
                                Mettre à jour le solde de {editUser?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="points-edit">Points</Label>
                                <Input
                                    id="points-edit"
                                    type="number"
                                    value={editPoints}
                                    onChange={(e) => setEditPoints(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
                            <Button onClick={handleUpdatePoints}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Template Dialog */}
                <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Modifier le prix du Template</DialogTitle>
                            <DialogDescription>
                                Changer le prix journalier pour {editTemplate?.name}.
                                <br />
                                <span className="text-xs text-muted-foreground mt-2 block">
                                    Note: Si vous baissez le prix, une étiquette "Promotion" sera affichée.
                                    Si vous l'augmentez, la promotion sera retirée.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="tpl-points">Points par jour (Prix Actuel)</Label>
                                <Input
                                    id="tpl-points"
                                    type="number"
                                    value={newTemplatePrice}
                                    onChange={(e) => setNewTemplatePrice(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                            <div className="flex items-center space-x-2 border p-3 rounded-lg border-white/10">
                                <Switch id="promo-mode" checked={isPromo} onCheckedChange={setIsPromo} />
                                <Label htmlFor="promo-mode">Activer la promotion</Label>
                            </div>

                            {isPromo && (
                                <div className="animate-in slide-in-from-top-2">
                                    <Label htmlFor="old-price">Prix d'origine (barré)</Label>
                                    <Input
                                        id="old-price"
                                        type="number"
                                        value={promoPrice}
                                        onChange={(e) => setPromoPrice(e.target.value)}
                                        className="mt-2"
                                        placeholder="Ex: 28"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Ce prix apparaîtra barré à côté du nouveau prix.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditTemplate(null)}>Annuler</Button>
                            <Button onClick={handleUpdateTemplate}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Ban Dialog */}
                <Dialog open={banDialog.isOpen} onOpenChange={(o) => setBanDialog(prev => ({ ...prev, isOpen: o }))}>
                    <DialogContent className="border-destructive/20">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                                <Ban className="w-5 h-5" />
                                Bannir l'utilisateur
                            </DialogTitle>
                            <DialogDescription>
                                Vous êtes sur le point de bannir {banDialog.user?.name}. L'utilisateur ne pourra plus se connecter.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Raison du bannissement</Label>
                                <Input
                                    placeholder="Non respect des règles..."
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Durée (heures) - Laisser vide pour permanent</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex: 24"
                                    value={banDuration}
                                    onChange={(e) => setBanDuration(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setBanDialog({ isOpen: false, user: null })}>Annuler</Button>
                            <Button variant="destructive" onClick={() => performBan(banDialog.user!.id, true, banReason, banDuration)}>
                                Bannir
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog open={deleteDialog.isOpen} onOpenChange={(o) => setDeleteDialog(prev => ({ ...prev, isOpen: o }))}>
                    <DialogContent className="border-destructive/50">
                        <DialogHeader>
                            <DialogTitle className="text-destructive flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Supprimer définitivement
                            </DialogTitle>
                            <DialogDescription>
                                ⚠️ Cette action est irréversible. L'utilisateur {deleteDialog.user?.name} sera supprimé, ainsi que toutes ses instances.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Raison de la suppression (envoyée par email)</Label>
                                <Input
                                    placeholder="Violation grave des CGU..."
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialog({ isOpen: false, user: null })}>Annuler</Button>
                            <Button variant="destructive" onClick={performDelete}>
                                Supprimer définitivement
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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


        </div>
    );
};

export default AdminDashboard;

const MessagesTable = () => {
    interface Message {
        id: string;
        createdAt: string;
        name: string;
        email: string;
        message: string;
        isRead: boolean;
    }

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyOpen, setReplyOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [replySubject, setReplySubject] = useState("");
    const [replyContent, setReplyContent] = useState("");

    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

    const fetchMessages = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const res = await fetch("/api/contact", { // Changed to use admin route, wait. Actually contactRoutes has /api/contact/messages? No, route is /api/contact/
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            // Based on backend routes: router.get('/', authMiddleware, getMessages); mounted at /api/contact
            // So url is /api/contact

            if (res.ok) {
                const data = await res.json();
                setMessages(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleDelete = (id: string) => {
        setDeleteConfirm({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return;
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const res = await fetch(`/api/contact/${deleteConfirm.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            if (res.ok) {
                toast.success("Message supprimé");
                fetchMessages();
            }
        } catch (e) {
            toast.error("Erreur lors de la suppression");
        } finally {
            setDeleteConfirm({ isOpen: false, id: null });
        }
    };

    const handleReply = (msg: Message) => {
        setSelectedMessage(msg);
        setReplySubject(`Re: Message de ${msg.name}`);
        setReplyOpen(true);
    };

    const sendReply = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const res = await fetch(`/api/contact/${selectedMessage.id}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({ subject: replySubject, content: replyContent })
            });

            if (res.ok) {
                toast.success("Réponse envoyée");
                setReplyOpen(false);
                setReplyContent("");
                fetchMessages();
            } else {
                throw new Error();
            }
        } catch (e) {
            toast.error("Erreur d'envoi");
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {messages.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">Aucun message</TableCell>
                        </TableRow>
                    ) : (
                        messages.map((msg) => (
                            <TableRow key={msg.id}>
                                <TableCell>{new Date(msg.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>{msg.name}</TableCell>
                                <TableCell>{msg.email}</TableCell>
                                <TableCell className="max-w-md truncate" title={msg.message}>{msg.message}</TableCell>
                                <TableCell>
                                    <Badge variant={msg.isRead ? "outline" : "default"}>
                                        {msg.isRead ? "Lu/Répondu" : "Nouveau"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => handleReply(msg)}>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Répondre
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(msg.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Répondre à {selectedMessage?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Sujet</Label>
                            <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="min-h-[150px]"
                                placeholder="Votre réponse..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyOpen(false)}>Annuler</Button>
                        <Button onClick={sendReply} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Send className="w-4 h-4 mr-2" />
                            Envoyer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <AlertDialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
