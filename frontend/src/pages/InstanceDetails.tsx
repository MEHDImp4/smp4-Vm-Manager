import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Terminal, RotateCw, Cpu, MemoryStick, HardDrive, Camera, History, Download, Trash2, ExternalLink, Shield, Globe, BookOpen, ArrowLeft, Square, Play, Power, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useRef } from "react";

interface Snapshot {
    id: string;
    name: string;
    proxmoxSnapName: string;
    description?: string;
    createdAt: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const InstanceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ cpu: 0, ram: 0, storage: 0, diskBytes: 0, maxDiskBytes: 0, ip: null, status: 'unknown', rootPassword: null });
    const [cpuData, setCpuData] = useState<any[]>([]);
    const [ramData, setRamData] = useState<any[]>([]);
    const [instance, setInstance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [showDocDialog, setShowDocDialog] = useState(false);
    const [snapshotLoading, setSnapshotLoading] = useState(false);
    const [maxSnapshots, setMaxSnapshots] = useState(3);
    const [refreshKey, setRefreshKey] = useState(0);
    const [timeUntilSnapshot, setTimeUntilSnapshot] = useState("");

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0); // Next midnight

            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeUntilSnapshot(`${hours}h ${minutes}m`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const hasSeen = localStorage.getItem("hasSeenDocPopup");
        if (!hasSeen) {
            setShowDocDialog(true);
        }
    }, []);

    const handleCloseDialog = () => {
        setShowDocDialog(false);
        localStorage.setItem("hasSeenDocPopup", "true");
    };

    const handleReadDocs = () => {
        handleCloseDialog();
        setTimeout(() => {
            document.getElementById('quick-guide')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        if (!id) return;

        const fetchStats = async () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            try {
                const response = await fetch(`/api/instances/${id}/stats`, {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);

                    const timeStr = new Date().toLocaleTimeString();
                    setCpuData(prev => [...prev.slice(-19), { time: timeStr, value: data.cpu }]);
                    setRamData(prev => [...prev.slice(-19), { time: timeStr, value: data.ram }]);
                }
            } catch (e) {
                console.error("Stats poll error", e);
            }
        };

        fetchStats(); // Initial fetching
        const interval = setInterval(fetchStats, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [id]);

    // Fetch instance details
    useEffect(() => {
        const fetchInstance = async () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                navigate("/login");
                return;
            }
            const user = JSON.parse(userStr);

            try {
                // const response = await fetch("http://localhost:3001/api/instances", {
                const response = await fetch("/api/instances", {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });

                if (response.ok) {
                    const instances = await response.json();
                    const found = instances.find((i: any) => i.id === id);
                    if (found) {
                        setInstance(found);
                    } else {
                        // navigate("/dashboard"); 
                    }
                }
            } catch (error) {
                console.error("Failed to fetch instance", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInstance();
    }, [id, navigate]);

    // Fetch snapshots
    const fetchSnapshots = async () => {
        const userStr = localStorage.getItem("user");
        if (!userStr || !id) return;
        const user = JSON.parse(userStr);

        try {
            const response = await fetch(`/api/instances/${id}/snapshots`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSnapshots(data.snapshots);
                setMaxSnapshots(data.maxSnapshots);
            }
        } catch (e) {
            console.error("Failed to fetch snapshots", e);
        }
    };

    useEffect(() => {
        if (id) fetchSnapshots();
    }, [id]);

    const handleCreateSnapshot = async () => {
        const name = prompt("Nom du backup (optionnel):");
        if (name === null) return; // User cancelled

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        setSnapshotLoading(true);
        try {
            const response = await fetch(`/api/instances/${id}/snapshots`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${user.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: name || undefined })
            });

            if (response.ok) {
                toast.success("Backup créé avec succès");
                fetchSnapshots();
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors de la création");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        } finally {
            setSnapshotLoading(false);
        }
    };

    const handleRestoreSnapshot = async (snapId: string, snapName: string) => {
        if (!confirm(`Voulez-vous vraiment restaurer le backup "${snapName}" ?\n\nAttention: Le conteneur sera arrêté puis redémarré.`)) return;

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        setSnapshotLoading(true);
        try {
            const response = await fetch(`/api/instances/${id}/snapshots/${snapId}/restore`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                toast.success("Backup restauré avec succès");
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors de la restauration");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        } finally {
            setSnapshotLoading(false);
        }
    };

    const handleDeleteSnapshot = async (snapId: string, snapName: string) => {
        if (!confirm(`Voulez-vous vraiment supprimer le backup "${snapName}" ?`)) return;

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        setSnapshotLoading(true);
        try {
            const response = await fetch(`/api/instances/${id}/snapshots/${snapId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                toast.success("Backup supprimé");
                fetchSnapshots();
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors de la suppression");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        } finally {
            setSnapshotLoading(false);
        }
    };

    const handleDownloadSnapshot = async (snapId: string) => {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        toast.info("Préparation du téléchargement... Cela peut prendre quelques minutes.");
        setSnapshotLoading(true);

        try {
            const response = await fetch(`/api/instances/${id}/snapshots/${snapId}/download`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Backup créé: ${data.backup.filename}`);
                alert(`Le backup a été créé sur le serveur.\n\nFichier: ${data.backup.filename}\nTaille: ${Math.round(data.backup.size / 1024 / 1024)} MB\n\n${data.note}`);
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors du téléchargement");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        } finally {
            setSnapshotLoading(false);
        }
    };

    // Terminal Logic
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!instance?.vmid || !stats.ip || !stats.rootPassword) return;

        // Cleanup previous session
        if (xtermRef.current) {
            xtermRef.current.dispose();
            xtermRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const term = new XTerminal({
            cursorBlink: true,
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            theme: {
                background: '#09090b', // zinc-950
                foreground: '#f4f4f5',
            }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
            xtermRef.current = term;
        }

        term.write('Connecting to SSH WebSocket...\r\n');

        // Connect to WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/ssh?vmid=${instance.vmid}&host=${stats.ip}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            term.write('WebSocket Connected. Authenticating...\r\n');
            ws.send(JSON.stringify({
                type: 'auth',
                username: 'smp4'
                // password: stats.rootPassword // Removed for interactive auth
            }));
        };

        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === 'data') {
                    term.write(msg.data);
                } else if (msg.type === 'error') {
                    term.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
                } else if (msg.type === 'connected') {
                    term.write('\r\n\x1b[32mSSH Session Established.\x1b[0m\r\n');
                    term.focus();
                } else if (msg.type === 'disconnect') {
                    term.write('\r\n\x1b[33mDisconnected.\x1b[0m\r\n');
                }
            } catch (e) {
                // If not JSON, just write raw (fallback)
                // term.write(ev.data);
            }
        };

        ws.onerror = () => {
            term.write('\r\n\x1b[31mWebSocket Error.\x1b[0m\r\n');
        };

        ws.onclose = () => {
            term.write('\r\nConnection Closed.\r\n');
        };

        term.onData(data => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data }));
            }
        });

        term.onResize(size => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', rows: size.rows, cols: size.cols }));
            }
        });

        const resizeObserver = new ResizeObserver(() => fitAddon.fit());
        if (terminalRef.current) resizeObserver.observe(terminalRef.current);

        return () => {
            if (ws.readyState === WebSocket.OPEN) ws.close();
            term.dispose();
            resizeObserver.disconnect();
        };
    }, [instance?.vmid, stats.ip, stats.rootPassword, refreshKey]); // Added refreshKey dependency

    const handleRestart = async () => {
        if (!confirm("Voulez-vous vraiment redémarrer cette instance ?")) return;

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            const response = await fetch(`/api/instances/${id}/restart`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                // toast.success("Redémarrage en cours..."); 
                alert("Redémarrage en cours...");
            } else {
                alert("Erreur lors du redémarrage");
            }
        } catch (error) {
            console.error("Restart error", error);
        }
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Chargement...</div>;
    if (!instance) return <div className="min-h-screen bg-background flex items-center justify-center">Instance non trouvée</div>;

    const isOnline = stats.status === 'online' || stats.status === 'running';

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                {instance.name}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isOnline ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                                    {isOnline ? '● En ligne' : '○ Arrêté'}
                                </span>
                            </h1>
                            <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                ID: {instance.id} • IP: <span className="font-mono bg-secondary/10 px-1 rounded">{stats.ip || 'En attente...'}</span>
                                {stats.rootPassword && (
                                    <>
                                        • Password: <span className="font-mono bg-secondary/10 px-1 rounded select-all cursor-text text-red-400">{stats.rootPassword}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`gap-2 ${isOnline ? 'text-destructive border-destructive/50 hover:bg-destructive/10' : 'text-success border-success/50 hover:bg-success/10'}`}
                            onClick={async () => {
                                const userStr = localStorage.getItem("user");
                                if (!userStr) return;
                                const user = JSON.parse(userStr);
                                try {
                                    const res = await fetch(`/api/instances/${id}/toggle`, {
                                        method: "POST",
                                        headers: { "Authorization": `Bearer ${user.token}` }
                                    });
                                    if (res.ok) {
                                        toast.success(isOnline ? "Arrêt en cours..." : "Démarrage en cours...");
                                        // Optinally refresh stats immediately or wait for poll
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                        >
                            {isOnline ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                            {isOnline ? "Arrêter" : "Démarrer"}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-secondary/20 hover:bg-secondary/40 border-border/50 gap-2"
                            onClick={handleRestart}
                            disabled={!isOnline}
                        >
                            <RotateCw className="w-4 h-4" />
                            Redémarrer
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                                const confirmName = prompt(`Pour confirmer la suppression, tapez le nom de l'instance :\n${instance.name}`);
                                if (confirmName !== instance.name) {
                                    if (confirmName !== null) alert("Nom incorrect. Suppression annulée.");
                                    return;
                                }

                                const userStr = localStorage.getItem("user");
                                if (!userStr) return;
                                const user = JSON.parse(userStr);

                                try {
                                    const res = await fetch(`/api/instances/${id}`, {
                                        method: "DELETE",
                                        headers: { "Authorization": `Bearer ${user.token}` }
                                    });
                                    if (res.ok) {
                                        toast.success("Instance supprimée avec succès");
                                        navigate("/dashboard");
                                    } else {
                                        alert("Erreur lors de la suppression");
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert("Erreur de connexion");
                                }
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* Main Content: Terminal */}
                    <div className="w-full space-y-6">
                        <div className="glass rounded-xl border border-border/50 overflow-hidden flex flex-col h-[600px] shadow-2xl">
                            <div className="bg-black/80 px-4 py-3 flex items-center justify-between border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-mono">smp4@server:~</span>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Refraîchir le Terminal"
                                        className="h-6 w-6 p-0 hover:bg-white/10"
                                        onClick={() => setRefreshKey(prev => prev + 1)}
                                    >
                                        <RotateCw className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                                    </Button>
                                    <div className="flex gap-1.5 ml-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 bg-black p-1 font-mono text-sm overflow-hidden relative" ref={terminalRef}>
                                {(!isOnline || !stats.ip) && (
                                    <div className="absolute inset-0 flex items-center justify-center flex-col opacity-50 z-10 select-none pointer-events-none">
                                        <Terminal className="w-16 h-16 mb-4 text-muted-foreground" />
                                        <p className="text-muted-foreground">En attente de connexion...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Widgets Section (Vertical Stack) */}
                    <div className="space-y-6">

                        {/* Resources Card - Moved first for better visibility */}
                        <div className="glass rounded-xl p-6 border border-border/50 flex flex-col justify-between h-auto bg-card/30 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold text-base text-card-foreground flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Ressources en direct
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* CPU Graph */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-blue-500/10 text-blue-500">
                                                <Cpu className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-muted-foreground">CPU</span>
                                        </div>
                                        <span className="font-bold text-foreground font-mono">{stats.cpu}%</span>
                                    </div>
                                    <div className="h-[100px] w-full rounded-md border border-white/10 bg-black/40 overflow-hidden relative shadow-inner">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={cpuData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#3b82f6"
                                                    strokeWidth={1.5}
                                                    fill="url(#cpuGradient)"
                                                    isAnimationActive={false}
                                                />
                                                <YAxis hide domain={[0, 100]} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* RAM Graph */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-purple-500/10 text-purple-500">
                                                <MemoryStick className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-muted-foreground">RAM</span>
                                        </div>
                                        <span className="font-bold text-foreground font-mono">{stats.ram}%</span>
                                    </div>
                                    <div className="h-[100px] w-full rounded-md border border-white/10 bg-black/40 overflow-hidden relative shadow-inner">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={ramData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#a855f7"
                                                    strokeWidth={1.5}
                                                    fill="url(#ramGradient)"
                                                    isAnimationActive={false}
                                                />
                                                <YAxis hide domain={[0, 100]} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Storage Bar */}
                                <div className="space-y-4 flex flex-col justify-center">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded bg-amber-500/10 text-amber-500">
                                                <HardDrive className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-muted-foreground">Stockage</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 font-mono">
                                            <span className="font-bold text-foreground">{formatBytes(stats.diskBytes || 0)}</span>
                                            <span className="text-xs text-muted-foreground">/ {formatBytes(stats.maxDiskBytes || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="h-4 w-full bg-secondary/20 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-sm transition-all duration-700 ease-in-out"
                                            style={{ width: `${Math.min(stats.storage, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right">Espace utilisé sur le disque principal</p>
                                </div>
                            </div>
                        </div>

                        {/* Backups Card - Full Width */}
                        <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-base text-muted-foreground flex items-center gap-2">
                                    <Camera className="w-5 h-5" />
                                    Backups
                                </h3>
                                <div className="flex items-center gap-4">
                                    <p className="text-xs text-muted-foreground">
                                        Prochain backup auto dans <span className="font-mono text-primary font-bold">{timeUntilSnapshot}</span>
                                    </p>
                                    <span className="text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full">
                                        {snapshots.length}/{maxSnapshots} slots utilisés
                                    </span>
                                </div>
                            </div>

                            {/* Backups List */}
                            <div className="space-y-2">
                                {snapshots.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border/50 rounded-lg">
                                        Aucun backup disponible pour le moment
                                    </div>
                                ) : (
                                    snapshots.map((snap) => (
                                        <div
                                            key={snap.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-border/30 hover:bg-secondary/10 hover:border-primary/30 transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded bg-primary/10 text-primary">
                                                    <History className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{snap.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Créé le {new Date(snap.createdAt).toLocaleDateString('fr-FR', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-success hover:text-success hover:bg-success/10"
                                                    onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                                                    disabled={snapshotLoading}
                                                >
                                                    <History className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Restaurer</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-blue-500 hover:text-blue-500 hover:bg-blue-500/10"
                                                    onClick={() => handleDownloadSnapshot(snap.id)}
                                                    disabled={snapshotLoading}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Télécharger</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                                                    disabled={snapshotLoading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {snapshots.length >= maxSnapshots && (
                                <p className="text-xs text-amber-500 text-center bg-amber-500/10 py-2 rounded">
                                    ⚠️ Limite de backups atteinte. Le prochain backup automatique remplacera le plus ancien.
                                </p>
                            )}
                        </div>

                        {/* Actions Card - Grid Layout */}
                        <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
                            <h3 className="font-semibold text-base text-muted-foreground">Actions Rapides</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <a
                                    href={stats.ip ? `http://${stats.ip}:9000` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center p-4 rounded-lg border border-border/50 transition-colors group ${stats.ip ? 'hover:bg-primary/5 hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`}
                                >
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary mr-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <ExternalLink className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Accès Portainer</div>
                                        <div className="text-xs text-muted-foreground">Gérer les conteneurs Docker</div>
                                    </div>
                                </a>

                                <Button
                                    variant="outline"
                                    className="flex items-center justify-start h-auto p-4 border-border/50 hover:bg-secondary/5 hover:border-secondary/50 group"
                                >
                                    <div className="p-3 rounded-lg bg-secondary/10 text-secondary mr-4 group-hover:bg-secondary group-hover:text-primary-foreground transition-colors">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">VPN Config</div>
                                        <div className="text-xs text-muted-foreground">Télécharger le profil .ovpn</div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="flex items-center justify-start h-auto p-4 border-border/50 hover:bg-warning/5 hover:border-warning/50 group"
                                >
                                    <div className="p-3 rounded-lg bg-warning/10 text-warning mr-4 group-hover:bg-warning group-hover:text-primary-foreground transition-colors">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-sm">Sous-domaines</div>
                                        <div className="text-xs text-muted-foreground">Configurer les DNS</div>
                                    </div>
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Documentation Section */}
            <div id="quick-guide" className="glass rounded-2xl p-6 border border-border/50 mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Guide de démarrage rapide
                </h3>

                <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">1</div>
                        <div>
                            <h4 className="font-medium mb-1">Connexion SSH</h4>
                            <p className="text-sm text-muted-foreground">
                                Utilisez le terminal ci-dessus ou connectez-vous via SSH avec l'utilisateur <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">smp4</code> et le mot de passe affiché.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">2</div>
                        <div>
                            <h4 className="font-medium mb-1">Changer votre mot de passe</h4>
                            <p className="text-sm text-muted-foreground">
                                Lors de la première connexion, vous serez invité à changer votre mot de passe. Choisissez un mot de passe sécurisé que vous n'oublierez pas.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">3</div>
                        <div>
                            <h4 className="font-medium mb-1">Accéder à Portainer</h4>
                            <p className="text-sm text-muted-foreground">
                                Portainer est préinstallé. Accédez-y via <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">http://{stats.ip || 'IP'}:9000</code> pour gérer vos containers Docker visuellement.
                                <span className="block mt-2 text-warning/80 text-xs font-medium">
                                    ⚠️ Si Portainer ne marche pas la première fois, redémarrez la VM.
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Step 4 - Placeholder */}
                    <div className="flex gap-4 opacity-60">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm">4</div>
                        <div>
                            <h4 className="font-medium mb-1 flex items-center gap-2">
                                Sous-domaines personnalisés
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Bientôt</span>
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Créez des sous-domaines personnalisés pour accéder à vos services. Cette fonctionnalité sera bientôt disponible.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showDocDialog} onOpenChange={handleCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Bienvenue sur votre VM !
                        </DialogTitle>
                        <DialogDescription>
                            C'est votre première visite ? Nous avons préparé un guide rapide pour vous aider à configurer votre environnement, accéder à Portainer et sécuriser votre instance.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="ghost" onClick={handleCloseDialog}>
                            Plus tard
                        </Button>
                        <Button onClick={handleReadDocs}>
                            Lire le guide
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default InstanceDetails;
