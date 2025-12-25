/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Terminal, RotateCw, Cpu, MemoryStick, HardDrive, Camera, History, Download, Trash2, ExternalLink, Shield, Globe, BookOpen, ArrowLeft, Square, Play, Power, Loader2, Plus, Clock, Link as LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface UpgradePack {
    id: number;
    name: string;
    type: 'cpu' | 'ram' | 'storage';
    amount: number;
    pointsCost: number;
    isActive: boolean;
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

    // Upgrades State
    const [upgradePacks, setUpgradePacks] = useState<UpgradePack[]>([]);
    const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // Alert/Confirm State
    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; description: React.ReactNode; onConfirm: () => void }>({ isOpen: false, title: "", description: "", onConfirm: () => { } });
    const [inputDialog, setInputDialog] = useState<{ isOpen: boolean; title: string; onConfirm: (val: string) => void }>({ isOpen: false, title: "", onConfirm: () => { } });
    const [inputValue, setInputValue] = useState("");

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
                const response = await fetch("/api/instances", {
                    headers: { "Authorization": `Bearer ${user.token}` }
                });

                if (response.ok) {
                    const result = await response.json();
                    const instances = result.data || [];
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
    const fetchSnapshots = useCallback(async () => {
        const userStr = localStorage.getItem("user");
        if (!userStr || !id) return;
        const user = JSON.parse(userStr);

        try {
            const response = await fetch(`/api/instances/${id}/snapshots`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSnapshots(Array.isArray(data.snapshots) ? data.snapshots : []);
                setMaxSnapshots(data.maxSnapshots);
                // Store backups in instance state or separate state. 
                // Since instance is an object, update it or add new state.
                // Let's add 'backups' to instance object for simplicity in rendering as implemented above
                setInstance((prev: any) => ({ ...prev, backups: data.backups }));
            }
        } catch (e) {
            console.error("Failed to fetch snapshots", e);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchSnapshots();
    }, [id, fetchSnapshots]);

    const handleCreateSnapshot = () => {
        setInputValue("");
        setInputDialog({
            isOpen: true,
            title: "Créer un backup",
            onConfirm: (name) => executeCreateSnapshot(name)
        });
    };

    const executeCreateSnapshot = async (name: string) => {
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

    const handleRestoreSnapshot = (snapId: string, snapName: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Restaurer le backup ?",
            description: (
                <div className="space-y-2">
                    <p>Voulez-vous vraiment restaurer le backup <strong>"{snapName}"</strong> ?</p>
                    <p className="text-sm text-yellow-500/90 font-medium pb-2 border-b border-yellow-500/20">
                        Attention: Le conteneur sera arrêté puis redémarré avec l'état du backup.
                    </p>
                    <p className="text-xs text-muted-foreground">Toutes les données créées après ce backup seront perdues.</p>
                </div>
            ),
            onConfirm: () => executeRestoreSnapshot(snapId)
        });
    };

    const executeRestoreSnapshot = async (snapId: string) => {
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

    const handleDeleteSnapshot = (snapId: string, snapName: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Supprimer le backup ?",
            description: `Voulez-vous vraiment supprimer définitivement le backup "${snapName}" ?`,
            onConfirm: () => executeDeleteSnapshot(snapId)
        });
    };

    const executeDeleteSnapshot = async (snapId: string) => {
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
                toast.success("Backup prêt", {
                    description: (
                        <div className="space-y-1 mt-1">
                            <p><strong>Fichier:</strong> {data.backup.filename}</p>
                            <p><strong>Taille:</strong> {Math.round(data.backup.size / 1024 / 1024)} MB</p>
                            <p className="border-l-2 border-primary/20 pl-2 mt-2 text-xs italic opacity-80">{data.note}</p>
                        </div>
                    ),
                    duration: 10000,
                });
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
    const fetchDomains = useCallback(async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/instances/${id}/domains`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDomains(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch domains", error);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchDomains();
    }, [id, fetchDomains]);

    useEffect(() => {
        const fetchPacks = async () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);
            try {
                const res = await fetch('/api/upgrades', { headers: { "Authorization": `Bearer ${user.token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setUpgradePacks(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                // ignore
            }
        };
        fetchPacks();
    }, []);

    const handlePurchaseUpgrade = async (pack: UpgradePack) => {
        if (!instance) return;
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        setPurchaseLoading(true);
        try {
            const response = await fetch(`/api/instances/${id}/upgrade`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({ packId: pack.id })
            });

            if (response.ok) {
                const data = await response.json();
                toast.success("Amélioration appliquée avec succès !");
                // Update instance state locally
                // fetchInstance(); triggers full reload, which is fine
                setUpgradeDialogOpen(false);
                // Force reload of page or fetch
                window.location.reload();
            } else {
                const err = await response.json();
                toast.error(err.error || "Erreur lors de l'achat");
            }
        } catch (e) {
            toast.error("Erreur de connexion");
        } finally {
            setPurchaseLoading(false);
        }
    };

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

    const handleDeleteDomain = (domainId: string) => {
        setConfirmDialog({
            isOpen: true,
            title: "Supprimer le domaine ?",
            description: "Êtes-vous sûr de vouloir supprimer ce domaine ? Cette action est irréversible.",
            onConfirm: () => executeDeleteDomain(domainId)
        });
    };

    const executeDeleteDomain = async (domainId: string) => {
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

    const handleDownloadVpnConfig = async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const toastId = toast.loading("Récupération de la configuration VPN...");

            const response = await fetch(`/api/instances/${id}/vpn`, {
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();

                // Create Blob and download
                const blob = new Blob([data.config], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vpn-${instance.name.toLowerCase()}.conf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success("Configuration téléchargée", { id: toastId });
            } else {
                toast.error("Impossible de récupérer la configuration", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur de téléchargement");
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
            allowTransparency: true,
            theme: {
                background: '#00000000', // Transparent to let CSS background show throuh
                foreground: '#f4f4f5',
                selectionBackground: 'rgba(255, 255, 255, 0.3)',
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
        const userStr = localStorage.getItem("user");
        const token = userStr ? JSON.parse(userStr).token : '';
        const wsUrl = `${protocol}//${window.location.host}/ws/ssh?vmid=${instance.vmid}&host=${stats.ip}&token=${token}`;
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

    const handleRestart = () => {
        setConfirmDialog({
            isOpen: true,
            title: "Redémarrer l'instance ?",
            description: "Voulez-vous vraiment redémarrer cette instance ? Les services seront temporairement indisponibles.",
            onConfirm: () => executeRestart()
        });
    };

    const executeRestart = async () => {
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
        // If specific restart button is clicked, we might want confirmation too, but the UI has a separate restart button calling handleRestart.
        // The power action bar calls handlePowerAction("restart").
        // I should intercept restart action here too if I want confirmation on that button.
        // Based on code at line 727, handlePowerAction("restart") is called directly.
        // I will modify handlePowerAction to check for restart. or better, modify the button to call handleRestart?
        // But handlePowerAction handles start/stop too.

        if (action === 'restart') {
            handleRestart();
            return;
        }

        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        setLoading(true); // Temporarily lock buttons

        try {
            let url = `/api/instances/${id}/toggle`; // Default for start/stop
            const method = 'POST';

            // action is guaranteed to be 'start' or 'stop' here due to early return
            url = `/api/instances/${id}/toggle`;

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

    // Prioritize real-time status from stats, fallback to static instance status
    // Normalize 'running' (Proxmox) to 'online' (DB/UI)
    const displayStatus = stats.status && stats.status !== 'unknown'
        ? (stats.status === 'running' ? 'online' : stats.status)
        : instance.status;

    const isDisplayOnline = displayStatus === 'online';
    const isDisplayStopped = displayStatus === 'stopped';
    const isOnline = isDisplayOnline; // Restore expected variable for usage below

    const portainerDomain = domains.find(d => d.port === 9000);
    const portainerUrl = portainerDomain
        ? `https://${portainerDomain.subdomain}.smp4.xyz`
        : (stats.ip ? `http://${stats.ip}:9000` : '#');

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
                                    <div className={`px-3 py-1 rounded-full border ${isDisplayOnline
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                                        } text-xs font-semibold flex items-center gap-2 backdrop-blur-md`}>
                                        <div className={`w-2 h-2 rounded-full ${isDisplayOnline ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
                                            }`} />
                                        {isDisplayOnline ? 'EN LIGNE' : 'HORS LIGNE'}
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
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20"
                            onClick={() => setUpgradeDialogOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Améliorer
                        </Button>
                        <div className="w-px h-8 bg-white/10 mx-1" />
                        <Button
                            onClick={() => handlePowerAction("start")}
                            disabled={loading || isDisplayOnline}
                            className={`rounded-lg transition-all duration-300 ${isDisplayOnline
                                ? "bg-transparent text-muted-foreground hover:bg-white/5"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                }`}
                        >
                            <Play className="w-4 h-4 mr-2" /> Démarrer
                        </Button>
                        <Button
                            onClick={() => handlePowerAction("stop")}
                            disabled={loading || isDisplayStopped}
                            className={`rounded-lg transition-all duration-300 ${isDisplayStopped
                                ? "bg-transparent text-muted-foreground hover:bg-white/5"
                                : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                }`}
                        >
                            <Square className="w-4 h-4 mr-2" /> Arrêter
                        </Button>
                        <Button
                            onClick={() => handlePowerAction("restart")}
                            disabled={loading || isDisplayStopped}
                            className="bg-transparent hover:bg-white/10 text-foreground border border-white/10"
                        >
                            <RotateCw className="w-4 h-4 mr-2" /> Redémarrer
                        </Button>

                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* Email Password Notification */}
                    {isOnline && stats.ip && (
                        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl flex items-center gap-3 animate-fade-up">
                            <div className="p-2 bg-blue-500/20 rounded-full">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">Mot de passe envoyé !</h4>
                                <p className="text-xs text-blue-400/80">
                                    Vos identifiants de connexion (root) ont été envoyés à votre adresse email.
                                    Vérifiez votre boîte de réception (et spams).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Main Content: Terminal */}
                    <div className="w-full space-y-4 animate-fade-up-delay-1">
                        <div className="glass rounded-xl border border-white/10 overflow-hidden flex flex-col h-[600px] shadow-2xl relative group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                            <div className="bg-zinc-900/50 px-4 py-3 flex items-center justify-between border-b border-white/10 relative z-10 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    </div>
                                    <div className="h-4 w-px bg-white/10 mx-2" />
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-black/40 border border-white/5 shadow-inner">
                                        <Terminal className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs text-zinc-400 font-mono">ssh smp4@{stats.ip || '...'}</span>
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
                            <div className="flex-1 bg-zinc-950/90 p-4 font-mono text-sm overflow-hidden relative backdrop-blur-sm" ref={terminalRef}>
                                {(!isOnline || !stats.ip) && (
                                    <div className="absolute inset-0 flex items-center justify-center flex-col z-10 select-none pointer-events-none bg-zinc-950/80 backdrop-blur-[2px]">
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
                            {/* Portainer Access Removed */}

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



                        {/* Snapshots */}
                        <div className="glass rounded-xl p-6 md:p-8 border border-white/10 animate-fade-up-delay-3 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <History className="w-5 h-5" />
                                    </div>
                                    Snapshots (Points de restauration)
                                </h3>
                                <div className="flex items-center gap-2">
                                    {(loading || snapshotLoading) && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                    <Button size="sm" onClick={handleCreateSnapshot} disabled={snapshotLoading || snapshots.length >= maxSnapshots} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                                        <Plus className="w-4 h-4 mr-2" /> Créer
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl flex items-start gap-3">
                                    <Shield className="w-5 h-5 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold mb-1">Système de Snapshots</p>
                                        <p className="opacity-80">
                                            Vous pouvez créer jusqu'à {maxSnapshots} snapshots manuels.
                                            Utile pour tester des modifications sans risque.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {snapshots.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-white/5 border-dashed">
                                            Aucun snapshot pour le moment.
                                            <br />
                                            <span className="text-xs opacity-50">Créez-en un manuellement ci-dessus.</span>
                                        </div>
                                    ) : (
                                        snapshots.map((snap) => (
                                            <div key={snap.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                                        <Camera className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-foreground">{snap.name}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                            {new Date(snap.createdAt).toLocaleString()}
                                                            {snap.name.includes("Auto") && (
                                                                <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">Auto</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                                                        disabled={snapshotLoading}
                                                        title="Restaurer"
                                                        className="h-8 w-8 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                                                        disabled={snapshotLoading}
                                                        title="Supprimer"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Prochain backup dans {timeUntilSnapshot}
                                </div>
                                <div>
                                    {snapshots.length} / {maxSnapshots} slots utilisés
                                </div>
                            </div>
                        </div>

                        {/* Actions Card - Grid Layout */}
                        <div className="animate-fade-up-delay-3 space-y-4">
                            <h3 className="font-semibold text-lg text-muted-foreground pl-1">Actions Rapides</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <a
                                    href={(!isDisplayOnline || !stats.ip) ? '#' : portainerUrl}
                                    onClick={(e) => (!isDisplayOnline || !stats.ip) && e.preventDefault()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`relative overflow-hidden group p-6 rounded-xl border border-white/10 glass transition-all hover:-translate-y-1 hover:shadow-glow ${(!isDisplayOnline || !stats.ip) ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''}`}
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
                                    onClick={() => handleDownloadVpnConfig()}
                                    title="Télécharger la config VPN (Générée automatiquement)"
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

                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/instance/${id}/domains`)}
                                    className="h-auto relative overflow-hidden group p-6 rounded-xl border-white/10 glass hover:bg-transparent hover:border-warning/50 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] justify-start"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative z-10 flex flex-col gap-3 items-start text-left w-full">
                                        <div className="p-3 w-fit rounded-lg bg-warning/20 text-warning">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base text-foreground">Sous-domaines</div>
                                            <div className="text-sm text-muted-foreground">Configuration DNS ({domains.length}/2 utilisés)</div>
                                        </div>
                                    </div>
                                </Button>
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
                                            Interface disponible sur <a href={portainerUrl} target="_blank" rel="noreferrer" className="bg-black/50 px-1.5 py-0.5 rounded text-xs text-primary font-mono hover:underline truncate inline-block max-w-[250px] align-bottom">{portainerUrl}</a>.

                                            <Link to="/docker-guide" className="inline-flex items-center gap-1 ml-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                                                <BookOpen className="w-3 h-3" />
                                                Guide Docker
                                            </Link>

                                            <span className="block mt-2 text-amber-400/90 text-xs font-medium bg-amber-400/10 p-2 rounded border border-amber-400/20">
                                                ⚠️ Si Portainer ne répond pas immédiatement, essayez de redémarrer la VM via le bouton en haut.
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold text-sm">3</div>
                                    <div>
                                        <h4 className="font-medium mb-1 text-foreground">Accès VPN (Recommandé)</h4>
                                        <div className="text-sm text-muted-foreground space-y-2">
                                            <p>Pour accéder à votre VM de manière sécurisée et accéder aux services locaux :</p>
                                            <ol className="list-decimal pl-4 space-y-1 text-xs marker:text-muted-foreground">
                                                <li>Téléchargez votre fichier de configuration via le bouton <strong>VPN Config</strong> ci-dessus.</li>
                                                <li>Installez le client officiel <a href="https://www.wireguard.com/install/" target="_blank" rel="noreferrer" className="text-primary hover:underline">WireGuard</a>.</li>
                                                <li>Importez le fichier <code className="bg-black/50 px-1 py-0.5 rounded text-secondary font-mono">.conf</code> téléchargé.</li>
                                                <li>Activez la connexion ("Activate") pour accéder à l'IP locale.</li>
                                            </ol>
                                        </div>
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
            {/* Custom Alert/Confirm Dialogs */}
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

            {/* Input Dialog (Backup Name) */}
            <Dialog open={inputDialog.isOpen} onOpenChange={(open) => setInputDialog(prev => ({ ...prev, isOpen: open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{inputDialog.title}</DialogTitle>
                        <DialogDescription>
                            Entrez un nom pour identifier ce backup.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="input-name" className="mb-2 block">Nom</Label>
                        <Input
                            id="input-name"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ex: Avant mise à jour..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    inputDialog.onConfirm(inputValue);
                                    setInputDialog(prev => ({ ...prev, isOpen: false }));
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setInputDialog(prev => ({ ...prev, isOpen: false }))}>Annuler</Button>
                        <Button onClick={() => {
                            inputDialog.onConfirm(inputValue);
                            setInputDialog(prev => ({ ...prev, isOpen: false }));
                        }}>
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Upgrade */}
            <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Plus className="w-6 h-6 text-primary" />
                            Améliorer mon instance
                        </DialogTitle>
                        <DialogDescription>
                            Ajoutez des ressources instantanément à votre VM. Le coût journalier sera mis à jour.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-6">
                        {upgradePacks.map(pack => (
                            <div key={pack.id} className="relative group cursor-pointer" onClick={() => handlePurchaseUpgrade(pack)}>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative glass border border-white/10 p-6 rounded-2xl hover:border-primary/50 transition-colors flex flex-col items-center text-center gap-4 bg-black/40">
                                    <div className="p-3 rounded-full bg-white/5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                                        {pack.type === 'cpu' && <Cpu className="w-6 h-6 text-primary" />}
                                        {pack.type === 'ram' && <MemoryStick className="w-6 h-6 text-purple-400" />}
                                        {pack.type === 'storage' && <HardDrive className="w-6 h-6 text-emerald-400" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{pack.name}</h3>
                                        <p className="text-sm text-muted-foreground">Ajoute +{pack.amount} {pack.type === 'storage' ? 'GB' : (pack.type === 'ram' ? 'GB' : 'vCore')}</p>
                                    </div>
                                    <div className="mt-auto pt-4 border-t border-white/5 w-full">
                                        <div className="font-bold text-xl gradient-text">+{pack.pointsCost} pts/j</div>
                                    </div>
                                    {purchaseLoading && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {upgradePacks.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                Aucun pack d'amélioration disponible pour le moment.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InstanceDetails;
