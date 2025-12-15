import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cpu, HardDrive, MemoryStick, Rocket } from "lucide-react";
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
}

const CreateInstance = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await fetch("http://localhost:3001/api/templates");
                if (response.ok) {
                    const data = await response.json();
                    setTemplates(data);
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

            const response = await fetch("http://localhost:3001/api/instances", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    name,
                    template: templateData?.name, // Send name "Small", "Nano" etc
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
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-8"
                    onClick={() => navigate("/dashboard")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour au Dashboard
                </Button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Nouvelle Instance</h1>
                    <p className="text-muted-foreground">Configurez votre environnement en quelques clics.</p>
                </div>

                <div className="grid gap-8">
                    {/* Step 1: Template */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold shadow-lg shadow-primary/20">1</span>
                            Choisir un template
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`cursor-pointer group relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${selectedTemplate === template.id
                                        ? "bg-primary/10 border-primary ring-1 ring-primary shadow-lg shadow-primary/10 scale-[1.02]"
                                        : "glass border-border/50 hover:border-primary/50 hover:bg-secondary/5 hover:-translate-y-1"
                                        }`}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <div className={`w-4 h-4 rounded-full border-2 ${selectedTemplate === template.id ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                                    </div>

                                    <div className="mb-4">
                                        <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-colors ${selectedTemplate === template.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'}`}>
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg">{template.name}</h3>
                                        <div className="text-xs font-mono text-primary font-medium mt-1">
                                            {template.points} pts/jour
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2.5 bg-background/40 p-1.5 rounded-lg border border-transparent group-hover:border-border/30 transition-colors">
                                            <Cpu className="w-3.5 h-3.5 text-primary/70" />
                                            <span className="font-medium text-foreground/80">{template.cpu}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-background/40 p-1.5 rounded-lg border border-transparent group-hover:border-border/30 transition-colors">
                                            <MemoryStick className="w-3.5 h-3.5 text-secondary/70" />
                                            <span className="font-medium text-foreground/80">{template.ram}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-background/40 p-1.5 rounded-lg border border-transparent group-hover:border-border/30 transition-colors">
                                            <HardDrive className="w-3.5 h-3.5 text-warning/70" />
                                            <span className="font-medium text-foreground/80">{template.storage}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Step 2: Configuration */}
                    <section className="space-y-6 max-w-xl">
                        <h2 className="text-xl font-semibold flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold shadow-lg shadow-primary/20">2</span>
                            Configuration
                        </h2>

                        <div className="glass p-6 rounded-2xl border border-border/50 space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-base">Nom de l'instance</Label>
                                <Input
                                    id="name"
                                    placeholder="ex: mon-projet-web"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-background/50 border-border/50 focus:border-primary h-12 text-lg"
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    ℹ️ Uniquement des lettres minuscules, chiffres et tirets.
                                </p>
                            </div>

                            {selectedTemplate && (
                                <div className="pt-4 border-t border-border/50">
                                    <Label className="text-base mb-4 block">Ressources allouées ({templates.find(t => t.id === selectedTemplate)?.name})</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-background/30 border border-border/50 flex flex-col items-center justify-center gap-2 text-center group hover:border-primary/50 transition-all">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <Cpu className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{templates.find(t => t.id === selectedTemplate)?.cpu}</div>
                                                <div className="text-xs text-muted-foreground">Processeur</div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-background/30 border border-border/50 flex flex-col items-center justify-center gap-2 text-center group hover:border-secondary/50 transition-all">
                                            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                                <MemoryStick className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{templates.find(t => t.id === selectedTemplate)?.ram}</div>
                                                <div className="text-xs text-muted-foreground">Mémoire RAM</div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-background/30 border border-border/50 flex flex-col items-center justify-center gap-2 text-center group hover:border-warning/50 transition-all">
                                            <div className="p-2 rounded-lg bg-warning/10 text-warning">
                                                <HardDrive className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{templates.find(t => t.id === selectedTemplate)?.storage}</div>
                                                <div className="text-xs text-muted-foreground">Stockage SSD</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Action */}
                    <div className="pt-8 pb-12">
                        <Button
                            size="lg"
                            className="w-full md:w-auto min-w-[200px] h-12 text-base shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                            onClick={handleCreate}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                "Création en cours..."
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

export default CreateInstance; // Force refresh
