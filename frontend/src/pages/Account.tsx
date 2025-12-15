
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cloud, LogOut, User } from "lucide-react";

const Account = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!user.email) {
            navigate("/login");
        }
    }, [user.email, navigate]);

    if (!user.email) return null;

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-background">
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
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/dashboard">Tableau de bord</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 flex justify-center">
                <div className="w-full max-w-lg glass rounded-2xl p-8 border border-border/50">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Mon Compte</h1>
                            <p className="text-muted-foreground">Gérez vos informations personnelles</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                            <div className="p-3 rounded-md bg-muted/50 border border-border">
                                {user.name || 'Non renseigné'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Adresse email</label>
                            <div className="p-3 rounded-md bg-muted/50 border border-border">
                                {user.email || 'Non renseigné'}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/50">
                            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Se déconnecter
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Account;
