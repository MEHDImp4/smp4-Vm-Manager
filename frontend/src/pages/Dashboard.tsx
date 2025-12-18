import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cloud, Play, Square, Trash2, Plus, Coins, TrendingDown, Lightbulb, Server, Container, BarChart3, Loader2, ArrowRight, Zap, Activity, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner"; // Assuming sonner is available as used in InstanceDetails

interface Instance {
  id: string;
  name: string;
  template: string;
  status: "online" | "stopped" | "provisioning" | "error";
  pointsPerDay: number;
  type: "ct" | "vm";
}

const LOADING_MESSAGES = [
  "Initialisation du conteneur...",
  "Configuration du réseau...",
  "Sécurisation des accès...",
  "Mise en place du pare-feu...",
  "Démarrage des services...",
  "Préparation de votre environnement...",
  "Vérification des systèmes...",
  "Presque prêt..."
];

const Dashboard = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Authentication & Data Fetching
  useEffect(() => {
    const fetchInstances = async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);

      try {
        const response = await fetch(`/api/instances?t=${Date.now()}`, {
          headers: {
            "Authorization": `Bearer ${user.token}`,
            "Cache-Control": "no-cache"
          }
        });
        if (response.ok) {
          const data = await response.json();
          setInstances(data);
        }
      } catch (error) {
        console.error("Failed to fetch instances", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserData = async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);

      try {
        const response = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${user.token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setTotalPoints(userData.points);

          // Update local storage
          const updatedUser = { ...user, points: userData.points };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error("Failed to fetch fresh profile", error);
      }
    };

    // Initial load
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setTotalPoints(user.points || 0);
    }

    fetchInstances();
    fetchUserData();

    fetchInstances();
    fetchUserData();

    // Dynamic Polling Interval
    // If any instance is provisioning, poll fast (2s). Otherwise poll slow (10s).
    const hasProvisioning = instances.some(i => i.status === 'provisioning');
    const pollInterval = hasProvisioning ? 2000 : 10000;

    const interval = setInterval(() => {
      fetchInstances();
      fetchUserData();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [instances.some(i => i.status === 'provisioning')]); // Re-run effect when provisioning state changes

  const maxPoints = 500;
  const dailyConsumption = instances
    .filter((i) => i.status === "online")
    .reduce((acc, i) => acc + i.pointsPerDay, 0);

  // Actions
  const toggleStatus = async (id: string) => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    // Optimistic Update
    setInstances(prev => prev.map(i =>
      i.id === id ? { ...i, status: i.status === 'online' ? 'stopped' : 'online' } : i
    ));

    try {
      const response = await fetch(`/api/instances/${id}/toggle`, {
        method: "PUT", // Keeping PUT as per original file, though InstanceDetails used POST. Verify if API supports both or stick to one. Original Dashboard used PUT.
        headers: { "Authorization": `Bearer ${user.token}` }
      });

      if (response.ok) {
        const updatedInstance = await response.json();
        // Re-sync with actual server response
        setInstances((prev) =>
          prev.map((instance) =>
            instance.id === id ? { ...instance, status: updatedInstance.status } : instance
          )
        );
        toast.success(`Instance ${updatedInstance.status === 'online' ? 'démarrée' : 'arrêtée'}`);
      } else {
        // Revert on failure
        setInstances(prev => prev.map(i =>
          i.id === id ? { ...i, status: i.status === 'online' ? 'stopped' : 'online' } : i
        ));
        toast.error("Erreur lors de l'action");
      }
    } catch (error) {
      console.error("Failed to toggle status", error);
      toast.error("Erreur de connexion");
    }
  };

  // Delete Logic
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; instance: Instance | null; inputValue: string }>({
    step: 0,
    instance: null,
    inputValue: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (instance: Instance, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    setDeleteConfirm({ step: 1, instance, inputValue: '' });
  };

  const handleDeleteConfirmStep1 = () => {
    setDeleteConfirm(prev => ({ ...prev, step: 2 }));
  };

  const handleDeleteConfirmStep2 = async () => {
    if (!deleteConfirm.instance) return;

    setIsDeleting(true);
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    try {
      const response = await fetch(`/api/instances/${deleteConfirm.instance.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${user.token}` }
      });

      if (response.ok) {
        setInstances((prev) => prev.filter((instance) => instance.id !== deleteConfirm.instance?.id));
        toast.success("Instance supprimée");
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Failed to delete instance", error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ step: 0, instance: null, inputValue: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ step: 0, instance: null, inputValue: '' });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans selection:bg-primary/20">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
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
            <Button variant="ghost" size="sm" asChild className="hover:bg-white/5 hidden md:flex">
              <Link to="/guide">
                <BookOpen className="w-4 h-4 mr-2 text-blue-400" />
                Guide Déploiement
              </Link>
            </Button>

            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="p-1 rounded-full bg-primary/20 text-primary">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono font-bold text-sm">{totalPoints.toFixed(2)}</span>
              <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">pts</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="hover:bg-white/5">
              <Link to="/account">Mon compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-7xl">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10 animate-fade-up-delay-1">
          {/* Points Balance Card */}
          <div className="glass rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:shadow-glow">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Coins className="w-24 h-24 rotate-[-15deg]" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full" />
                Solde de points
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-bold mb-4 tracking-tight flex items-baseline gap-2">
                <span className="gradient-text">{totalPoints.toFixed(2)}</span>
                <span className="text-lg text-muted-foreground font-medium">pts</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Recharge</span>
                  <span>{Math.round((totalPoints / maxPoints) * 100)}%</span>
                </div>
                <Progress value={(totalPoints / maxPoints) * 100} className="h-1.5 bg-white/10" indicatorClassName="bg-gradient-to-r from-primary to-secondary" />
                {dailyConsumption > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    ≈ {Math.floor(totalPoints / (dailyConsumption || 1))} jours d'autonomie
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Daily Consumption Card */}
          <div className="glass rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:border-secondary/30 transition-all duration-300 hover:shadow-lg hover:shadow-secondary/5">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 rotate-[-15deg]" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-4 bg-secondary rounded-full" />
                Conso. journalière
              </h3>
            </div>
            <div className="relative z-10">
              <div className="text-4xl font-bold mb-4 tracking-tight flex items-baseline gap-2">
                <span className="text-foreground">{dailyConsumption}</span>
                <span className="text-lg text-muted-foreground font-medium">pts/j</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 w-fit">
                <div className="flex -space-x-2">
                  {instances.filter(i => i.status === 'online').slice(0, 3).map((_, idx) => (
                    <div key={idx} className="w-6 h-6 rounded-full bg-secondary/20 border border-black flex items-center justify-center text-[10px] text-secondary">
                      <Zap className="w-3 h-3 fill-current" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {instances.filter((i) => i.status === "online").length} instance(s) active(s)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="relative rounded-2xl p-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden hover:border-amber-500/40 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-500 mb-1">Astuce Pro</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Pour optimiser vos coûts, pensez à éteindre vos instances de développement la nuit.
                  Utilisez <Link to="/guide" className="hover:underline decoration-amber-500/50"><code className="text-foreground bg-white/10 px-1 py-0.5 rounded text-xs font-mono cursor-pointer hover:bg-white/20 transition-colors">docker-compose</code></Link> sur les templates Medium+.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-500/20 rounded-full blur-[40px]" />
          </div>
        </div>

        {/* Instances Section */}
        <div className="animate-fade-up-delay-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Server className="w-6 h-6 text-primary" />
              Mes Instances
            </h2>
            <Button variant="hero" asChild className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300">
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle VM
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center border border-white/10">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground animate-pulse">Chargement de vos ressources...</p>
            </div>
          ) : instances.length === 0 ? (
            <div className="glass rounded-2xl p-16 border border-dashed border-white/10 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                  <Server className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">C'est un peu vide ici</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Démarrez votre infrastructure en quelques secondes. Choisissez un template et lancez votre première machine.
                </p>
                <Button variant="hero" asChild size="lg">
                  <Link to="/create">
                    <Plus className="w-5 h-5 mr-2" />
                    Créer une instance
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {instances.map((instance) => {
                if (instance.status === 'provisioning') {
                  return (
                    <div key={instance.id} className="glass p-8 rounded-2xl border border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center relative z-10">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">{instance.name}</h3>
                          <div className="h-6 overflow-hidden relative">
                            <p className="text-muted-foreground animate-fade-up text-sm font-mono">
                              {LOADING_MESSAGES[Math.floor((Date.now() / 2000) % LOADING_MESSAGES.length)]}
                            </p>
                          </div>
                        </div>
                        <div className="w-full max-w-xs bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-secondary animate-progress-indeterminate" />
                        </div>
                        <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Création en cours</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={instance.id}
                    className="glass p-1 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="bg-black/40 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden">
                      {/* Status Glow Blob */}
                      <div className={`absolute top-0 right-0 w-[200px] h-[200px] rounded-full blur-[80px] pointer-events-none transition-colors duration-500 ${instance.status === 'online' ? 'bg-emerald-500/10' : 'bg-transparent'}`} />

                      {/* Icon & Details */}
                      <div className="flex items-center gap-5 flex-1 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-500 ${instance.status === 'online' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400' : 'bg-white/5 text-muted-foreground'}`}>
                          {instance.type === "ct" ? (
                            <Container className="w-7 h-7" />
                          ) : (
                            <Server className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <Link to={`/instance/${instance.id}`} className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-2 group/link">
                              {instance.name}
                              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                            </Link>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                            <span className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${instance.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                              {instance.status === 'online' ? 'Running' : 'Stopped'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>Template {instance.template}</span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 relative z-10 pl-6 md:pl-0 border-l md:border-l-0 border-white/10">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Coût</p>
                          <div className={`font-mono font-bold flex items-center gap-1.5 ${instance.status === 'online' ? 'text-primary' : 'text-muted-foreground'}`}>
                            <BarChart3 className="w-4 h-4" />
                            {instance.pointsPerDay} <span className="text-xs opacity-70">pts/j</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 md:ml-4 relative z-10 pt-4 md:pt-0 border-t md:border-t-0 border-white/10 md:pl-6 md:border-l border-white/10">
                        <Button
                          onClick={() => toggleStatus(instance.id)}
                          className={`rounded-lg transition-all border ${instance.status === 'online'
                            ? 'bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground hover:text-white'
                            : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'}`}
                        >
                          {instance.status === "online" ? (
                            <>
                              <Square className="w-4 h-4 mr-2 fill-current" />
                              Arrêter
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2 fill-current" />
                              Démarrer
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          onClick={(e) => handleDeleteClick(instance, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Balance Warning */}
        {totalPoints < 50 && (
          <div className="mt-8 p-1 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/20 animate-fade-up">
            <div className="bg-black/80 rounded-xl p-4 flex items-center gap-4 backdrop-blur-md">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-orange-100">Solde faible</h4>
                <p className="text-sm text-orange-200/70">Rechargez votre compte pour éviter l'interruption de services.</p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto border-orange-500/30 hover:bg-orange-500/10 text-orange-300">
                Recharger
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.step > 0 && deleteConfirm.instance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="glass rounded-2xl border border-white/10 w-full max-w-md mx-4 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />

            <div className="p-6 md:p-8">
              {deleteConfirm.step === 1 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-6 text-destructive mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-center">Supprimer l'instance ?</h3>
                  <p className="text-muted-foreground text-center mb-8">
                    Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-foreground bg-white/5 px-1.5 py-0.5 rounded">{deleteConfirm.instance.name}</span> ?
                    <br />Cette action est irréversible.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={handleDeleteCancel} className="h-11">
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteConfirmStep1} className="h-11">
                      Oui, continuer
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-4 text-destructive flex items-center gap-2">
                    <Activity className="w-5 h-5 animate-pulse" />
                    Confirmation de sécurité
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 bg-destructive/5 p-4 rounded-lg border border-destructive/10">
                    Pour éviter toute erreur, veuillez taper le nom de l'instance pour confirmer la suppression définitive.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom de l'instance</div>
                    <div className="font-mono text-center p-2 rounded bg-white/5 select-all border border-white/5 text-lg">
                      {deleteConfirm.instance.name}
                    </div>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-destructive/50 focus:ring-1 focus:ring-destructive/50 focus:outline-none text-center font-mono placeholder:text-muted-foreground/50 transition-all"
                      placeholder={`Tapez "${deleteConfirm.instance.name}"`}
                      value={deleteConfirm.inputValue}
                      onChange={(e) => setDeleteConfirm(prev => ({ ...prev, inputValue: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={handleDeleteCancel} disabled={isDeleting} className="h-11">
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 shadow-lg shadow-destructive/20"
                      onClick={handleDeleteConfirmStep2}
                      disabled={deleteConfirm.inputValue !== deleteConfirm.instance.name || isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Suppression...
                        </>
                      ) : 'Confirmer la suppression'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
