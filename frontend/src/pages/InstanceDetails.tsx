import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Terminal, RotateCw, Cpu, MemoryStick, HardDrive, Camera, History, Download, Trash2, ExternalLink, Shield, Globe, BookOpen, ArrowLeft, Square, Play, Power, Loader2, Plus, Clock, Link as LinkIcon } from "lucide-react";
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

const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (parts.length === 0) return `${Math.floor(seconds % 60)}s`;

    return parts.join(' ');
};

const InstanceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ cpu: 0, ram: 0, storage: 0, diskBytes: 0, maxDiskBytes: 0, ip: null, status: 'unknown', rootPassword: null, uptime: 0 });
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
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState({ subdomain: "", port: "" });
    const [domainLoading, setDomainLoading] = useState(false);

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
                        if (found.status === 'provisioning') {
                            toast.info("Instance en cours de création. Veuillez patienter.");
                            navigate("/dashboard");
                            return;
                        }
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

    // --- Domain Management ---
    const fetchDomains = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/instances/${id}/domains`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDomains(data);
            }
        } catch (error) {
            console.error("Failed to fetch domains", error);
        }
    };

    useEffect(() => {
        if (id) fetchDomains();
    }, [id]);

    const handleCreateDomain = async () => {
        if (!newDomain.subdomain || !newDomain.port) {
            toast.error("Veuillez remplir tous les champs");
            return;
        }

        setDomainLoading(true);
        const toastId = toast.loading("Création du domaine...");

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
                    subdomain: newDomain.subdomain,
                    port: parseInt(newDomain.port)
                })
            });

            if (response.ok) {
                toast.success("Domaine créé avec succès !", { id: toastId });
                setNewDomain({ subdomain: "", port: "" });
                fetchDomains();
            } else {
                const error = await response.json();
                toast.error(error.error || "Erreur lors de la création", { id: toastId });
            }
        } catch (error) {
            console.error("Create domain error", error);
            toast.error("Erreur de connexion", { id: toastId });
        } finally {
            setDomainLoading(false);
        }
    };

    const handleDeleteDomain = async (domainId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce domaine ?")) return;

        setDomainLoading(true);
        const toastId = toast.loading("Suppression du domaine...");

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
                fetchDomains();
            } else {
                const error = await response.json();
                toast.error(error.error || "Erreur lors de la suppression", { id: toastId });
            }
        } catch (error) {
            console.error("Delete domain error", error);
            toast.error("Erreur de connexion", { id: toastId });
        } finally {
            setDomainLoading(false);
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
                toast.success("Redémarrage en cours...");
            } else {
                toast.error("Erreur lors du redémarrage");
            }
        } catch (error) {
            console.error("Restart error", error);
        }
    };

    const handlePowerAction = async (action: "start" | "stop" | "restart") => {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // Optimistic UI update or loading state
        setLoading(true); // Temporarily lock buttons

        try {
            let url = `/api/instances/${id}/toggle`; // Default for start/stop
            let method = 'POST';

            if (action === 'restart') {
                url = `/api/instances/${id}/restart`;
            } else {
                url = `/api/instances/${id}/toggle`;
            }

            const response = await fetch(url, {
                method: method,
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                toast.success(`Action ${action} effectuée`);
                // Force stats refresh
                setRefreshKey(prev => prev + 1);
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors de l'action");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erreur de connexion");
        } finally {
            // Delay unlocking to allow status to propagate
            setTimeout(() => setLoading(false), 2000);
        }
    };



    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!instance) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Instance non trouvée</div>;

    const isOnline = stats.status === 'online' || stats.status === 'running';

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container mx-auto p-6 md:p-8 relative z-10 max-w-7xl">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-fade-up">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard')}
                            className="rounded-full hover:bg-white/5 hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-4xl font-bold tracking-tight gradient-text">
                                    {instance?.name || 'Chargement...'}
                                </h1>
                                {instance && (
                                    <div className={`px-3 py-1 rounded-full border ${instance.status === 'online'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                                        } text-xs font-semibold flex items-center gap-2 backdrop-blur-md`}>
                                        <div className={`w-2 h-2 rounded-full ${instance.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
                                            }`} />
                                        {instance.status === 'online' ? 'EN LIGNE' : 'HORS LIGNE'}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                    <Cpu className="w-3.5 h-3.5" /> {instance?.cpu}
                                </span>
                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                    <MemoryStick className="w-3.5 h-3.5" /> {formatBytes((parseInt(instance?.ram) || 0) * 1024 * 1024 * 1024)}
                                </span>
                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                                    <HardDrive className="w-3.5 h-3.5" /> {instance?.storage}
                                </span>
                                {stats.ip && (
                                    <span className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                        <Globe className="w-3.5 h-3.5" /> {stats.ip}
                                    </span>
                                )}
                                {stats.uptime > 0 && (
                                    <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                        <Clock className="w-3.5 h-3.5" /> {formatUptime(stats.uptime)}
                                    </span>
                                )}

                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 glass p-1.5 rounded-xl">
                        <Button
                            onClick={() => handlePowerAction("start")}
                            disabled={loading || instance?.status === "online"}
                            className={`rounded-lg transition-all duration-300 ${instance?.status === "online"
                                ? "bg-transparent text-muted-foreground hover:bg-white/5"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                }`}
                        >
                            <Play className="w-4 h-4 mr-2" /> Démarrer
                        </Button>
                        <Button
                            onClick={() => handlePowerAction("stop")}
                            disabled={loading || instance?.status === "stopped"}
                            className={`rounded-lg transition-all duration-300 ${instance?.status === "stopped"
                                ? "bg-transparent text-muted-foreground hover:bg-white/5"
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                }`}
                        >
                            <Square className="w-4 h-4 mr-2" /> Arrêter
                        </Button>
                        <Button
                            onClick={() => handlePowerAction("restart")}
                            disabled={loading || instance?.status === "stopped"}
                            className="bg-transparent hover:bg-white/10 text-foreground border border-white/10"
                        >
                            <RotateCw className="w-4 h-4 mr-2" /> Redémarrer
                        </Button>

                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Main Content: Terminal */}
                    <div className="w-full space-y-4 animate-fade-up-delay-1">
                        <div className="glass rounded-xl border border-white/10 overflow-hidden flex flex-col h-[600px] shadow-2xl relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="bg-black/80 px-4 py-3 flex items-center justify-between border-b border-white/10 relative z-10 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    </div>
                                    <div className="h-4 w-px bg-white/10 mx-2" />
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10">
                                        <Terminal className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs text-muted-foreground font-mono">ssh smp4@{stats.ip || '...'}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Refraîchir le Terminal"
                                    className="h-7 w-7 p-0 hover:bg-white/10 hover:text-white rounded-md transition-colors"
                                    onClick={() => setRefreshKey(prev => prev + 1)}
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="flex-1 bg-black/95 p-1 font-mono text-sm overflow-hidden relative" ref={terminalRef}>
                                {(!isOnline || !stats.ip) && (
                                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 select-none pointer-events-none">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                            <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
                                        </div>
                                        <p className="text-muted-foreground mt-4 font-mono animate-pulse">Initialisation de la connexion sécurisée...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Widgets Section (Vertical Stack) */}
                    <div className="space-y-8">

                        {/* Resources Card - Moved first for better visibility */}
                        <div className="glass rounded-xl p-6 md:p-8 border border-white/10 flex flex-col justify-between h-auto animate-fade-up-delay-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px]" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <Cpu className="w-5 h-5" />
                                    </div>
                                    Monitoring en temps réel
                                </h3>
                                {/* <div className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5">
                                    LIVE
                                </div> */}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                {/* CPU Graph */}
                                <div className="space-y-3 group">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-muted-foreground flex items-center gap-2">
                                            CPU Usage
                                        </span>
                                        <span className="font-bold text-foreground font-mono bg-white/5 px-2 rounded text-base">{stats.cpu}%</span>
                                    </div>
                                    <div className="h-[120px] w-full rounded-xl border border-white/10 bg-black/40 overflow-hidden relative shadow-inner group-hover:border-primary/30 transition-colors">
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
                                                    strokeWidth={2}
                                                    fill="url(#cpuGradient)"
                                                    isAnimationActive={false}
                                                />
                                                <YAxis hide domain={[0, 100]} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* RAM Graph */}
                                <div className="space-y-3 group">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-muted-foreground">RAM Usage</span>
                                        <span className="font-bold text-foreground font-mono bg-white/5 px-2 rounded text-base">{stats.ram}%</span>
                                    </div>
                                    <div className="h-[120px] w-full rounded-xl border border-white/10 bg-black/40 overflow-hidden relative shadow-inner group-hover:border-purple-500/30 transition-colors">
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
                                                    strokeWidth={2}
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
                                        <span className="font-medium text-muted-foreground">Disque NVMe</span>
                                        <div className="flex items-baseline gap-1 font-mono">
                                            <span className="font-bold text-foreground">{formatBytes(stats.diskBytes || 0)}</span>
                                            <span className="text-xs text-muted-foreground">/ {formatBytes(stats.maxDiskBytes || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="h-4 w-full bg-secondary/20 rounded-full overflow-hidden border border-white/5 relative">
                                        <div
                                            className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 opacity-20"
                                        />
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-700 ease-in-out relative"
                                            style={{ width: `${Math.min(stats.storage, 100)}%` }}
                                        >
                                            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/50" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right font-mono">
                                        {Math.round(stats.storage)}% utilisés
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Domains Card */}
                        <div className="glass rounded-xl p-6 md:p-8 border border-white/10 space-y-6 animate-fade-up-delay-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[80px]" />
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    Domaines & Accès Public
                                </h3>
                            </div>

                            <div className="relative z-10 space-y-6">
                                {/* Creation Form */}
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2 w-full">
                                        <label className="text-sm font-medium text-muted-foreground">Sous-domaine</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="mon-app"
                                                    value={newDomain.subdomain}
                                                    onChange={(e) => setNewDomain({ ...newDomain, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                                                />
                                            </div>
                                            <span className="text-muted-foreground font-mono text-sm">.smp4.xyz</span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-32 space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Port Interne</label>
                                        <input
                                            type="number"
                                            placeholder="8080"
                                            value={newDomain.port}
                                            onChange={(e) => setNewDomain({ ...newDomain, port: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleCreateDomain}
                                        disabled={domainLoading || !newDomain.subdomain || !newDomain.port}
                                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {domainLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        Créer
                                    </Button>
                                </div>

                                {/* Domains List */}
                                <div className="space-y-3">
                                    {domains.length === 0 ? (
                                        <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                                            <Globe className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                            Aucun domaine configuré
                                        </div>
                                    ) : (
                                        domains.map((dom) => (
                                            <div key={dom.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all hover:bg-white/10 group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                                        <LinkIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <a
                                                            href={`https://${dom.subdomain}.smp4.xyz`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-base font-semibold text-foreground hover:underline decoration-indigo-500/50 underline-offset-4 flex items-center gap-2"
                                                        >
                                                            {dom.subdomain}.smp4.xyz
                                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                                        </a>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            Port interne: {dom.port}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                    onClick={() => handleDeleteDomain(dom.id)}
                                                    disabled={domainLoading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Backups Card */}
                        <div className="glass rounded-xl p-6 md:p-8 border border-white/10 space-y-6 animate-fade-up-delay-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px]" />
                            <div className="flex items-center justify-between relative z-10">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    Backups & Instantanés
                                </h3>

                            </div>

                            <div className="flex items-center gap-6 text-sm text-muted-foreground relative z-10 pb-2 border-b border-border/50">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    {snapshots.length} / {maxSnapshots} slots utilisés
                                </span>
                                <span className="flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    Prochain auto: <span className="text-foreground font-mono">{timeUntilSnapshot}</span>
                                </span>
                            </div>

                            {/* Backups List */}
                            <div className="grid gap-3 relative z-10">
                                {snapshots.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                                        <Camera className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                        Aucun backup disponible pour le moment
                                    </div>
                                ) : (
                                    snapshots.map((snap) => (
                                        <div
                                            key={snap.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all hover:bg-white/10 group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                                    <History className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-semibold text-foreground">{snap.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {new Date(snap.createdAt).toLocaleDateString('fr-FR', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                                    onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                                                    disabled={snapshotLoading}
                                                >
                                                    <RotateCw className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Restaurer</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                    onClick={() => handleDownloadSnapshot(snap.id)}
                                                    disabled={snapshotLoading}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Télécharger</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10"
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
                        </div>

                        {/* Actions Card - Grid Layout */}
                        <div className="animate-fade-up-delay-3 space-y-4">
                            <h3 className="font-semibold text-lg text-muted-foreground pl-1">Actions Rapides</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <a
                                    href={stats.ip ? `http://${stats.ip}:9000` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`relative overflow-hidden group p-6 rounded-xl border border-white/10 glass transition-all hover:-translate-y-1 hover:shadow-glow ${!stats.ip && 'opacity-50 cursor-not-allowed'}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex flex-col gap-3">
                                        <div className="p-3 w-fit rounded-lg bg-primary/20 text-primary">
                                            <ExternalLink className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base text-foreground">Accès Portainer</div>
                                            <div className="text-sm text-muted-foreground">Interface Docker UI</div>
                                        </div>
                                    </div>
                                </a>

                                <Button
                                    variant="outline"
                                    className="h-auto relative overflow-hidden group p-6 rounded-xl border-white/10 glass hover:bg-transparent hover:border-secondary/50  transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] justify-start"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex flex-col gap-3 items-start text-left w-full">
                                        <div className="p-3 w-fit rounded-lg bg-secondary/20 text-secondary">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base text-foreground">VPN Config</div>
                                            <div className="text-sm text-muted-foreground">Accès distant sécurisé</div>
                                        </div>
                                    </div>
                                </Button>

                                {/* Removed dummy subdomain button */}
                            </div>
                        </div>

                        {/* Documentation Section */}
                        <div id="quick-guide" className="glass rounded-xl p-8 border border-white/10 animate-fade-up-delay-3">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                <BookOpen className="w-6 h-6 text-primary" />
                                Guide de démarrage rapide
                            </h3>

                            <div className="grid gap-4">
                                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">1</div>
                                    <div>
                                        <h4 className="font-medium mb-1 text-foreground">Connexion SSH</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Authentifiez-vous avec l'utilisateur <code className="bg-black/50 px-1.5 py-0.5 rounded text-xs text-primary font-mono">smp4</code>. Le mot de passe root initial vous a été fourni.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">2</div>
                                    <div>
                                        <h4 className="font-medium mb-1 text-foreground">Accéder à Portainer</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Interface disponible sur <code className="bg-black/50 px-1.5 py-0.5 rounded text-xs text-primary font-mono">http://{stats.ip || 'IP'}:9000</code>.
                                            <span className="block mt-2 text-amber-400/90 text-xs font-medium bg-amber-400/10 p-2 rounded border border-amber-400/20">
                                                ⚠️ Si Portainer ne répond pas immédiatement, essayez de redémarrer la VM via le bouton en haut.
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
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
        </div>
    );
};

export default InstanceDetails;
