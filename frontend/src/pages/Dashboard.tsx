import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cloud, Play, Square, Trash2, Plus, Coins, TrendingDown, Lightbulb, Server, Container, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Instance {
  id: string;
  name: string;
  template: string;
  status: "online" | "stopped";
  pointsPerDay: number;
  type: "ct" | "vm";
}

const Dashboard = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const fetchInstances = async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      setTotalPoints(user.points || 0);

      try {
        const response = await fetch("http://localhost:3001/api/instances", {
          headers: {
            "Authorization": `Bearer ${user.token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setInstances(data);
        }
      } catch (error) {
        console.error("Failed to fetch instances", error);
      }
    };

    // Initial fetch of instances
    fetchInstances();

    // Polling for real-time points update
    const interval = setInterval(async () => {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);

      try {
        const response = await fetch("http://localhost:3001/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${user.token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setTotalPoints(userData.points);

          // Optionally update local storage (be careful not to overwrite token)
          // const updatedUser = { ...user, points: userData.points };
          // localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.error("Failed to fetch fresh profile", error);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const maxPoints = 500;
  const dailyConsumption = instances
    .filter((i) => i.status === "online")
    .reduce((acc, i) => acc + i.pointsPerDay, 0);

  const toggleStatus = async (id: string) => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    try {
      const response = await fetch(`http://localhost:3001/api/instances/${id}/toggle`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const updatedInstance = await response.json();
        setInstances((prev) =>
          prev.map((instance) =>
            instance.id === id ? { ...instance, status: updatedInstance.status } : instance
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  // Double confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ step: number; instance: Instance | null; inputValue: string }>({
    step: 0,
    instance: null,
    inputValue: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (instance: Instance) => {
    setDeleteConfirm({ step: 1, instance, inputValue: '' });
  };

  const handleDeleteConfirmStep1 = () => {
    setDeleteConfirm(prev => ({ ...prev, step: 2 }));
  };

  const handleDeleteConfirmStep2 = async () => {
    if (!deleteConfirm.instance) return;
    if (deleteConfirm.inputValue !== deleteConfirm.instance.name) return;

    setIsDeleting(true);
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    try {
      const response = await fetch(`http://localhost:3001/api/instances/${deleteConfirm.instance.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        setInstances((prev) => prev.filter((instance) => instance.id !== deleteConfirm.instance?.id));
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              Mini<span className="gradient-text">Cloud</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
              <Coins className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold">{totalPoints.toFixed(2)}</span>
              <span className="text-muted-foreground text-sm">pts</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/account">Mon compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Points Balance */}
          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Solde de points</h3>
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold mb-3">{totalPoints.toFixed(2)} <span className="text-lg text-muted-foreground">pts</span></div>
            <Progress value={(totalPoints / maxPoints) * 100} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">≈ {Math.floor(totalPoints / dailyConsumption)} jours restants</p>
          </div>

          {/* Daily Consumption */}
          <div className="glass rounded-2xl p-6 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Consommation / jour</h3>
              <TrendingDown className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-3xl font-bold mb-3">{dailyConsumption} <span className="text-lg text-muted-foreground">pts/j</span></div>
            <p className="text-xs text-muted-foreground">
              {instances.filter((i) => i.status === "online").length} instance(s) active(s)
            </p>
          </div>

          {/* Quick Tip */}
          <div className="gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Astuce DevOps</h3>
              <Lightbulb className="w-5 h-5 text-warning" />
            </div>
            <p className="text-sm text-muted-foreground">
              💡 Utilisez <code className="text-primary font-mono text-xs">docker-compose</code> pour orchestrer plusieurs containers sur un seul template Medium.
            </p>
          </div>
        </div>

        {/* Instances Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Mes instances</h2>
          <Button variant="hero" asChild>
            <Link to="/create">
              <Plus className="w-4 h-4 mr-2" />
              Créer VM
            </Link>
          </Button>
        </div>

        {instances.length === 0 ? (
          <div className="glass rounded-2xl p-12 border border-border/50 text-center">
            <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune instance</h3>
            <p className="text-muted-foreground mb-6">Créez votre première instance pour commencer.</p>
            <Button variant="hero" asChild>
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Créer une instance
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className="glass rounded-xl p-4 md:p-6 border border-border/50 flex flex-col md:flex-row md:items-center gap-4 hover:border-border transition-colors"
              >
                {/* Icon & Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    {instance.type === "ct" ? (
                      <Container className="w-6 h-6 text-primary" />
                    ) : (
                      <Server className="w-6 h-6 text-secondary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/instance/${instance.id}`} className="font-semibold hover:underline hover:text-primary transition-colors">
                        {instance.name}
                      </Link>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${instance.status === "online"
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {instance.status === "online" ? "● En ligne" : "○ Arrêté"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Template {instance.template} • {(instance.type || "VM").toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Points */}
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className={instance.status === "online" ? "text-foreground" : "text-muted-foreground"}>
                    {instance.status === "online" ? instance.pointsPerDay : 0} pts/jour
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(instance.id)}
                  >
                    {instance.status === "online" ? (
                      <>
                        <Square className="w-4 h-4 mr-1" />
                        Arrêter
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        Démarrer
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClick(instance)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications */}
        {totalPoints < 50 && (
          <div className="mt-8 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-4">
            <Coins className="w-6 h-6 text-warning flex-shrink-0" />
            <div>
              <p className="font-medium text-warning">Points faibles</p>
              <p className="text-sm text-muted-foreground">
                Votre solde est bas. Rechargez pour éviter l'interruption de vos instances.
              </p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto flex-shrink-0">
              Recharger
            </Button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.step > 0 && deleteConfirm.instance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 border border-border/50 w-full max-w-md mx-4">
            {deleteConfirm.step === 1 ? (
              <>
                <h3 className="text-xl font-bold mb-4 text-destructive">Supprimer l'instance ?</h3>
                <p className="text-muted-foreground mb-6">
                  Êtes-vous sûr de vouloir supprimer <span className="font-semibold text-foreground">{deleteConfirm.instance.name}</span> ?
                  Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleDeleteCancel}>
                    Annuler
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={handleDeleteConfirmStep1}>
                    Oui, continuer
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4 text-destructive">Confirmation finale</h3>
                <p className="text-muted-foreground mb-4">
                  Cette action supprimera définitivement la VM et toutes ses données.
                  Tapez <span className="font-mono font-semibold text-foreground">{deleteConfirm.instance.name}</span> pour confirmer.
                </p>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg bg-muted border border-border focus:border-destructive focus:outline-none mb-6"
                  placeholder="Tapez le nom de l'instance"
                  value={deleteConfirm.inputValue}
                  onChange={(e) => setDeleteConfirm(prev => ({ ...prev, inputValue: e.target.value }))}
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleDeleteCancel} disabled={isDeleting}>
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteConfirmStep2}
                    disabled={deleteConfirm.inputValue !== deleteConfirm.instance.name || isDeleting}
                  >
                    {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
