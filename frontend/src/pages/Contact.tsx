import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MessageSquare, User, Send, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";


const contactSchema = z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
    });

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast({
                    title: "Message envoyé !",
                    description: "Nous vous répondrons dans les plus brefs délais.",
                });
                reset();
            } else {
                throw new Error("Erreur lors de l'envoi");
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible d'envoyer le message. Veuillez réessayer.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-12 relative z-10 glass rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
                    {/* Left Column - Info */}
                    <div className="space-y-8">
                        <div>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
                                <MessageSquare className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold mb-4 tracking-tight">Contactez-nous</h1>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Une question ? Une suggestion ? Ou simplement envie de discuter ?
                                Notre équipe est là pour vous aider à tirer le meilleur parti de SMP4cloud.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Email</p>
                                    <a href="mailto:support@smp4.xyz" className="hover:text-primary transition-colors">support@smp4.xyz</a>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-muted-foreground">
                                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                                    <Cloud className="w-5 h-5 text-secondary" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Communauté</p>
                                    <p>Rejoignez notre Discord pour une aide en direct</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="bg-background/50 rounded-2xl p-6 md:p-8 border border-white/5 shadow-inner">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom complet</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        className="pl-10"
                                        {...register("name")}
                                    />
                                </div>
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        className="pl-10"
                                        {...register("email")}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Comment pouvons-nous vous aider ?"
                                    className="min-h-[150px] resize-none"
                                    {...register("message")}
                                />
                                {errors.message && (
                                    <p className="text-sm text-destructive">{errors.message.message}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg" variant="hero">
                                {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                                <Send className="w-4 h-4 ml-2" />
                            </Button>
                        </form>
                    </div>
                </div>
            </main>


        </div>
    );
};

export default Contact;
