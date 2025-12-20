import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users, Server, Activity, Shield, Search, RefreshCw, Ban, UserCheck, Edit, Plus, Trash2, Power } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [nodeStats, setNodeStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [allInstances, setAllInstances] = useState<any[]>([]);
    const [searchUser, setSearchUser] = useState("");
    const [editUser, setEditUser] = useState<any>(null);
    const [editPoints, setEditPoints] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const headers = { "Authorization": `Bearer ${user.token}` };

            // Fetch in parallel
            const [usersRes, instancesRes, nodeRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/instances', { headers }),
                fetch('/api/admin/node/stats', { headers })
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (instancesRes.ok) setAllInstances(await instancesRes.json());
            if (nodeRes.ok) setNodeStats(await nodeRes.json());

        } catch (error) {
            console.error("Failed to fetch admin data", error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleBanUser = async (userId: number, currentStatus: boolean) => {
        if (!confirm(`Voulez-vous vraiment ${currentStatus ? 'débannir' : 'bannir'} cet utilisateur ?`)) return;

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ isBanned: !currentStatus })
            });

            if (response.ok) {
                toast.success(`Utilisateur ${!currentStatus ? 'banni' : 'débanni'}`);
                fetchData();
            } else {
                toast.error("Erreur lors de la mise à jour");
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
        <div className="min-h-screen bg-background text-foreground p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight gradient-text">Administration</h1>
                        <p className="text-muted-foreground">Vue d'ensemble et gestion de la plateforme</p>
                    </div>
                    <Button onClick={fetchData} variant="outline" size="icon">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="overview" className="gap-2"><Activity className="w-4 h-4" /> Vue d'ensemble</TabsTrigger>
                        <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" /> Utilisateurs</TabsTrigger>
                        <TabsTrigger value="instances" className="gap-2"><Server className="w-4 h-4" /> Instances Globales</TabsTrigger>
                    </TabsList>

                    {/* Overview Content */}
                    <TabsContent value="overview" className="space-y-6 animate-fade-in">
                        {nodeStats && (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <Card className="glass border-primary/20">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">CPU Node</CardTitle>
                                        <Activity className="h-4 w-4 text-primary" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{(nodeStats.cpu * 100).toFixed(1)}%</div>
                                        <Progress value={nodeStats.cpu * 100} className="mt-2 h-2" />
                                        <p className="text-xs text-muted-foreground mt-2">{nodeStats.cpuinfo?.model} ({nodeStats.cpuinfo?.cpus} cores)</p>
                                    </CardContent>
                                </Card>
                                <Card className="glass border-primary/20">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">RAM Node</CardTitle>
                                        <Activity className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{((nodeStats.memory.used / nodeStats.memory.total) * 100).toFixed(1)}%</div>
                                        <Progress value={(nodeStats.memory.used / nodeStats.memory.total) * 100} className="mt-2 h-2 bg-purple-900/20" />
                                        <p className="text-xs text-muted-foreground mt-2">{formatBytes(nodeStats.memory.used)} / {formatBytes(nodeStats.memory.total)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="glass border-primary/20">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                                        <Activity className="h-4 w-4 text-emerald-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{Math.floor(nodeStats.uptime / 86400)}j</div>
                                        <p className="text-xs text-muted-foreground mt-2">En ligne depuis {Math.floor(nodeStats.uptime / 3600)} heures</p>
                                    </CardContent>
                                </Card>
                                <Card className="glass border-primary/20">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Version PVE</CardTitle>
                                        <Shield className="h-4 w-4 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{nodeStats.pveversion.split('/')[1]?.split(' ')[0] || 'Unknown'}</div>
                                        <p className="text-xs text-muted-foreground mt-2">{nodeStats.kversion}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="glass">
                                <CardHeader>
                                    <CardTitle>Statistiques Plateforme</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                        <span>Utilisateurs Totaux</span>
                                        <span className="font-bold text-xl">{users.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                        <span>Instances Totales</span>
                                        <span className="font-bold text-xl">{allInstances.length}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                        <span>Instances en Ligne</span>
                                        <span className="font-bold text-xl text-emerald-500">{allInstances.filter(i => i.status === 'online').length}</span>
                                    </div>
                                </CardContent>
                            </Card>
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
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => {
                                                                    setEditUser(user);
                                                                    setEditPoints(user.points.toString());
                                                                }}
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Modifier les points</DialogTitle>
                                                                <DialogDescription>
                                                                    Mettre à jour le solde de {user.name}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4 py-4">
                                                                <div className="space-y-2">
                                                                    <Label>Points</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={editPoints}
                                                                        onChange={(e) => setEditPoints(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <Button onClick={handleUpdatePoints}>Sauvegarder</Button>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Button
                                                        variant={user.isBanned ? "default" : "destructive"}
                                                        size="sm"
                                                        onClick={() => handleBanUser(user.id, user.isBanned)}
                                                    >
                                                        {user.isBanned ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
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
                                        <TableHead>VMID</TableHead>
                                        <TableHead>Ressources</TableHead>
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
                                            <TableCell className="text-xs text-muted-foreground">
                                                {inst.cpu} vCPU / {inst.ram} GB / {inst.storage} GB
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
                </Tabs>
            </div>
        </div>
    );
};

export default AdminDashboard;
