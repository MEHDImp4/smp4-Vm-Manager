/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Cloud, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, { message: "Le nom doit contenir au moins 2 caractères" }).max(50),
  email: z.string().trim().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Check if the path contains "register" to be more robust (e.g. /register/)
  const isLogin = !location.pathname.includes("register");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState<LoginFormData>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue');
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur MiniCloud !",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(registerForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue');
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: "Compte créé",
        description: "Votre compte a été créé avec succès. Bienvenue !",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8 hover-lift">
            <img src="/logo.png" alt="SMP4 Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold">
              SMP4<span className="gradient-text">cloud</span>
            </span>
          </Link>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2">
            {isLogin ? "Bon retour !" : "Créer un compte"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? "Connectez-vous pour accéder à vos instances."
              : "Rejoignez SMP4cloud et déployez vos premiers projets."}
          </p>

          {/* Toggle Tabs */}
          <div className="flex gap-2 p-1 rounded-lg bg-muted mb-8">
            <button
              onClick={() => { navigate("/login"); setErrors({}); }}
              className={cn(
                "flex-1 py-2.5 rounded-md text-sm font-medium transition-all",
                isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Connexion
            </button>
            <button
              onClick={() => { navigate("/register"); setErrors({}); }}
              className={cn(
                "flex-1 py-2.5 rounded-md text-sm font-medium transition-all",
                !isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Inscription
            </button>
          </div>

          {/* Forms */}
          {(() => {
            if (isLogin) {
              return (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="vous@exemple.com"
                        className="pl-10"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">SMP4cloud</h1>
                    <p className="text-sm text-muted-foreground">
                      {isLogin ? "Heureux de vous revoir" : "Créez votre compte en quelques secondes"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <a href="#" className="text-sm text-primary hover:underline">
                        Mot de passe oublié ?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <Button variant="hero" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? "Connexion..." : "Se connecter"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              );
            }

            return (
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Jean Dupont"
                      className="pl-10"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="pl-10"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="register-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button variant="hero" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? "Création..." : "Créer mon compte"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  En créant un compte, vous acceptez nos{" "}
                  <a href="#" className="text-primary hover:underline">CGU</a> et{" "}
                  <a href="#" className="text-primary hover:underline">politique de confidentialité</a>.
                </p>
              </form>
            );
          })()}
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gradient-radial from-secondary/20 via-secondary/5 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="glass rounded-2xl p-8 border border-border/50 mb-8">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 hover-lift">
              <img src="/logo.png" alt="SMP4 Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Déployez en quelques secondes</h2>
            <p className="text-muted-foreground">
              Containers et VM légères pour apprendre, tester et construire sans complexité.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <div className="glass rounded-lg px-4 py-2 border border-border/50">
              <span className="text-2xl font-bold gradient-text">5</span>
              <span className="text-muted-foreground text-sm ml-1">templates</span>
            </div>
            <div className="glass rounded-lg px-4 py-2 border border-border/50">
              <span className="text-2xl font-bold gradient-text">100+</span>
              <span className="text-muted-foreground text-sm ml-1">utilisateurs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
