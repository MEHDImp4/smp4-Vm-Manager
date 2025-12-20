import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Rocket, Sparkles, Zap, ChevronRight, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface Template {
    id: string;
    name: string;
    cpu: string;
    ram: string;
    storage: string;
    points: number;
    oldPrice?: number | null;
}

const CreateInstance = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const selectedTemplateData = templates.find((template) => template.id === selectedTemplate);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch("/api/templates");
                if (response.ok) {
                    const data = await response.json();
                    setTemplates(data);
                    // Pre-select 'Small' if available
                    const small = data.find((t: Template) => t.name === 'Small');
                    if (small) setSelectedTemplate(small.id);
                }
            } catch (error) {
                console.error("Failed to fetch templates", error);
            }
        };

        fetchTemplates();
    }, []);

    const handleCreate = async () => {
        if (!selectedTemplate || !name) {
            toast({
                variant: "destructive",
                title: "Champs manquants",
                description: "Veuillez sélectionner un template et donner un nom à votre instance.",
            });
            return;
        }

        try {
            setIsLoading(true);
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                navigate("/login");
                return;
            }
            const user = JSON.parse(userStr);

            const templateData = templates.find(t => t.id === selectedTemplate);

            const response = await fetch("/api/instances", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    name,
                    template: templateData?.name,
                    cpu: templateData?.cpu,
                    ram: templateData?.ram,
                    storage: templateData?.storage,
                    pointsPerDay: templateData?.points
                })
            });

            if (!response.ok) {
                throw new Error("Erreur lors de la création");
            }

            toast({
                title: "Instance créée !",
                description: "Votre nouvelle VM est en cours de déploiement.",
            });
            navigate("/dashboard");
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de créer l'instance. Vérifiez votre connexion.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden font-sans selection:bg-primary/20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto p-4 md:p-8">
                <Button
                    variant="ghost"
                    className="mb-8 hover:bg-white/5"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au Dashboard
                </Button>

                <div className="mb-12 animate-fade-up">
                    <h1 className="text-4xl font-bold mb-3 tracking-tight">
                        Nouvelle <span className="gradient-text">Instance</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Déployez votre environnement de développement en quelques secondes.
                        Choisissez la puissance adaptée à vos besoins.
                    </p>
                </div>

                <div className="grid gap-10">
                    {/* Step 1: Template */}
                    <section className="space-y-6 animate-fade-up-delay-1">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">1</div>
                            <h2 className="text-xl font-semibold">Choisir un template</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {templates.map((template) => {
                                const isRecommended = template.name === 'Small';
                                const isSelected = selectedTemplate === template.id;
                                const isPromo = template.oldPrice && template.points < template.oldPrice;

                                return (
                                    <div
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template.id)}
                                        className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${isSelected
                                            ? "bg-primary/10 border-primary ring-1 ring-primary shadow-lg shadow-primary/10 scale-[1.02]"
                                            : "glass border-white/5 hover:border-primary/50 hover:bg-white/5 hover:-translate-y-1"
                                            }`}
                                    >
                                        {/* Recommended Badge */}
                                        {isRecommended && (
                                            <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-bl from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl shadow-lg shadow-amber-500/20 z-10">
                                                Recommandé
                                            </div>
                                        )}

                                        {/* Promo Badge - show on left if Recommended exists, or right if not */}
                                        {isPromo && (
                                            <div className={`absolute top-0 ${isRecommended ? 'left-0 rounded-br-xl bg-gradient-to-br' : 'right-0 rounded-bl-xl bg-gradient-to-bl'} px-3 py-1 from-red-500 to-pink-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg z-10`}>
                                                Promotion
                                            </div>
                                        )}

                                        {/* Selection Check */}
                                        {isSelected && !isRecommended && !isPromo && (
                                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary shadow-glow-sm" />
                                        )}

                                        {/* Glow Effect for Recommended */}
                                        {isRecommended && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 to-transparent opacity-50" />
                                        )}

                                        <div className="mb-4 relative z-10">
                                            <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                : isRecommended
                                                    ? 'bg-amber-500/10 text-amber-500'
                                                    : 'bg-white/5 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                                                }`}>
                                                {isRecommended ? <Sparkles className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                                            </div>
                                            <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                                            <div className={`text-xs font-mono font-bold flex flex-col gap-1 ${isSelected ? 'text-primary' : isRecommended ? 'text-amber-500' : 'text-muted-foreground'}`}>

                                                <div className="flex items-center gap-1">
                                                    <Zap className="w-3 h-3 fill-current" />
                                                    {template.points} pts/jour
                                                </div>
                                                {isPromo && (
                                                    <span className="text-muted-foreground line-through decoration-red-500/50 ml-4 opacity-70">
                                                        {template.oldPrice} pts
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 relative z-10">
                                            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-black/20 border border-white/5">
                                                <span className="text-muted-foreground text-xs">CPU</span>
                                                <span className="font-mono font-semibold">{template.cpu}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-black/20 border border-white/5">
                                                <span className="text-muted-foreground text-xs">RAM</span>
                                                <span className="font-mono font-semibold">{template.ram}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-black/20 border border-white/5">
                                                <span className="text-muted-foreground text-xs">SSD</span>
                                                <span className="font-mono font-semibold">{template.storage}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Step 2: Configuration */}
                    <section className="space-y-6 max-w-2xl animate-fade-up-delay-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">2</div>
                            <h2 className="text-xl font-semibold">Configuration</h2>
                        </div>

                        <div className="glass p-8 rounded-3xl border border-white/10 space-y-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                            <div className="space-y-3 relative z-10">
                                <Label htmlFor="name" className="text-base font-medium">Nom de l'instance</Label>
                                <div className="relative">
                                    <Input
                                        id="name"
                                        placeholder="mon-projet-ou-app"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-black/30 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-14 text-lg pl-4 pr-12 rounded-xl transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <ChevronRight className="w-5 h-5 opacity-50" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-2 pl-1">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono">a-z, 0-9, -</span>
                                    Uniquement des lettres minuscules, chiffres et tirets.
                                </p>
                            </div>

                            {selectedTemplate && (
                                <div className="pt-6 border-t border-white/10 relative z-10">
                                    <Label className="text-sm font-medium text-muted-foreground mb-4 block uppercase tracking-wider">Résumé des ressources</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col items-center justify-center gap-2 text-center">
                                            <div className="p-2 rounded-lg bg-white/5 text-foreground/80">
                                                <Cpu className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg font-mono">{selectedTemplateData?.cpu}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">vCPU</div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col items-center justify-center gap-2 text-center">
                                            <div className="p-2 rounded-lg bg-white/5 text-foreground/80">
                                                <MemoryStick className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg font-mono">{selectedTemplateData?.ram}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">RAM</div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col items-center justify-center gap-2 text-center">
                                            <div className="p-2 rounded-lg bg-white/5 text-foreground/80">
                                                <HardDrive className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg font-mono">{selectedTemplateData?.storage}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">SSD</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Action */}
                    <div className="pt-4 pb-20 animate-fade-up-delay-3">
                        <Button
                            size="lg"
                            className="w-full md:w-auto min-w-[250px] h-14 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all font-bold rounded-xl"
                            onClick={handleCreate}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                                    Lancement...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-5 h-5 mr-2" />
                                    Lancer l'instance
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInstance;
