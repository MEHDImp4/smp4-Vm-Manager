import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Gift, DollarSign, Twitter, Github, Linkedin, TrendingUp, Coins, Clock, Zap, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const WHEEL_PRIZES = [10, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200];
const PRIZE_COLORS = [
    "#94a3b8", // 10 - slate
    "#64748b", // 15 - slate dark
    "#60a5fa", // 20 - blue
    "#3b82f6", // 25 - blue
    "#2563eb", // 30 - blue dark
    "#818cf8", // 40 - indigo
    "#a78bfa", // 50 - violet
    "#c084fc", // 75 - purple
    "#e879f9", // 100 - fuchsia
    "#f472b6", // 125 - pink
    "#fb7185", // 150 - rose
    "#facc15", // 200 - yellow/gold
];

interface EarnPointsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPointsEarned: () => void;
}

const EarnPointsModal = ({ isOpen, onClose, onPointsEarned }: EarnPointsModalProps) => {
    const [canSpin, setCanSpin] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [wonPrize, setWonPrize] = useState<number | null>(null);
    const [nextSpinTime, setNextSpinTime] = useState("");
    const [isVerified, setIsVerified] = useState(true);
    const navigate = useNavigate();

    // Play win sound
    const playWinSound = (points: number) => {
        const audioContext = new (window.AudioContext || (window as unknown as Window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different pitch based on prize amount
        const frequency = points >= 150 ? 800 : points >= 75 ? 600 : 400;
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    // Trigger confetti
    const triggerConfetti = (points: number) => {
        const duration = points >= 150 ? 5000 : points >= 75 ? 3000 : 2000;
        const particleCount = points >= 150 ? 200 : points >= 75 ? 100 : 50;

        const end = Date.now() + duration;
        const colors = points >= 150
            ? ['#FFD700', '#FFA500', '#FF6347'] // Gold colors for big wins
            : points >= 75
                ? ['#10b981', '#3b82f6', '#8b5cf6'] // Mixed colors for medium
                : ['#3b82f6', '#60a5fa']; // Blue for small

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        // Extra burst for big wins
        if (points >= 150) {
            setTimeout(() => {
                confetti({
                    particleCount: particleCount,
                    spread: 180,
                    origin: { y: 0.6 },
                    colors: colors,
                    gravity: 0.5,
                    scalar: 1.2
                });
            }, 500);
        }
    };

    const checkSpinStatus = useCallback(async () => {
        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch("/api/points/can-spin", {
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCanSpin(data.canSpin);

                if (!data.canSpin && data.nextSpinIn) {
                    updateNextSpinTime(data.nextSpinIn);
                }
            }
        } catch (error) {
            console.error("Error checking spin status:", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const user = JSON.parse(userStr);
                setIsVerified(user.isVerified !== false);
            }
            void checkSpinStatus();
        }
    }, [isOpen, checkSpinStatus]);

    const updateNextSpinTime = (milliseconds: number) => {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        setNextSpinTime(`${hours}h ${minutes}m`);
    };

    const handleSpin = async () => {
        if (!canSpin || isSpinning) return;

        setIsSpinning(true);
        setWonPrize(null);

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch("/api/points/spin", {
                method: "POST",
                headers: { "Authorization": `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const prizeIndex = WHEEL_PRIZES.indexOf(data.points);

                // Disable animation and reset rotation
                setShouldAnimate(false);
                setRotation(0);

                // Wait for DOM to update, then enable animation and spin
                setTimeout(() => {
                    setShouldAnimate(true);

                    // Calculate rotation to land on the prize
                    const segmentAngle = 360 / WHEEL_PRIZES.length;
                    const targetRotation = 360 * 5 - (prizeIndex * segmentAngle) - (segmentAngle / 2); // 5 full rotations - target - centering

                    setRotation(targetRotation);

                    // Wait for animation to complete
                    setTimeout(() => {
                        setWonPrize(data.points);
                        setIsSpinning(false);
                        setCanSpin(false);

                        // Trigger effects!
                        playWinSound(data.points);
                        triggerConfetti(data.points);

                        toast.success(`🎉 ${data.message}`);
                        onPointsEarned();
                    }, 4000);
                }, 100); // Increased delay to ensure reset is applied

            } else {
                const error = await response.json();
                toast.error(error.error);
                setIsSpinning(false);
                checkSpinStatus();
            }
        } catch (error) {
            toast.error("Erreur de connexion");
            setIsSpinning(false);
        }
    };

    const [verifyingPlatform, setVerifyingPlatform] = useState<string | null>(null);
    const [socialUsername, setSocialUsername] = useState("");

    const handleSocialClick = (platform: string, url: string) => {
        window.open(url, "_blank");
        setVerifyingPlatform(platform);
        setSocialUsername("");
    };

    const submitSocialVerification = async () => {
        if (!verifyingPlatform || !socialUsername) return;

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const response = await fetch("/api/points/social-bonus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    platform: verifyingPlatform,
                    username: socialUsername
                })
            });

            if (response.ok) {
                const data = await response.json();
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#8b5cf6', '#ec4899']
                });
                toast.success(data.message);
                onPointsEarned();
                setVerifyingPlatform(null);
            } else {
                const error = await response.json();
                toast.error(error.error);
            }
        } catch (error) {
            toast.error("Erreur de connexion");
        }
    };

    const handlePurchase = (pack: { usd: number, points: number }) => {
        // Lien PayPal.me exemple - À REMPLACER par votre propre lien ou intégration API
        // Format: https://paypal.me/votrecompte/MONTANTUSD
        const paypalLink = `https://paypal.me/mehdimp477/${pack.usd}USD?locale.x=fr_XC&country.x=MA`;

        window.open(paypalLink, "_blank");

        toast.info("Une fois le paiement effectué, vos points seront crédités manuellement (pour l'instant).");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="glass rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/10 relative shadow-2xl shadow-primary/20 scrollbar-none">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-300 hover:rotate-90"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 md:p-10 relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-3 mb-3 bg-white/5 px-6 py-2 rounded-full border border-white/5">
                            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
                                Gagner des Points
                            </h2>
                            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                        </div>
                        <p className="text-muted-foreground text-lg">Tournez la roue, suivez-nous, ou boostez votre solde !</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 relative">
                        {!isVerified && (
                            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center p-8 animate-fade-in border border-white/10">
                                <div className="p-4 bg-yellow-500/10 rounded-full mb-6">
                                    <ShieldAlert className="w-16 h-16 text-yellow-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Vérification Requise</h3>
                                <p className="text-muted-foreground max-w-md mb-8 text-lg">
                                    Vérifiez votre adresse email pour débloquer la roue quotidienne, les bonus et la boutique.
                                </p>
                                <Button onClick={onClose} size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold border-none shadow-lg shadow-yellow-500/20">
                                    Retourner au Tableau de Bord
                                </Button>
                            </div>
                        )}
                        {/* Daily Wheel Column */}
                        <div className="glass rounded-3xl p-8 border border-amber-500/20 relative overflow-hidden flex flex-col items-center">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px]" />

                            <div className="text-center mb-8 relative z-10">
                                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 mb-4 shadow-lg shadow-amber-500/10">
                                    <Gift className="w-8 h-8 text-amber-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">Roue Quotidienne</h3>
                                <p className="text-sm text-muted-foreground">Gagnez jusqu'à <span className="text-amber-400 font-bold">200 points</span> chaque jour</p>
                            </div>

                            {/* Wheel Container */}
                            <div className="relative w-72 h-72 mb-8 group">
                                {/* Glow effect */}
                                {canSpin && !isSpinning && (
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 blur-xl opacity-40 animate-pulse" />
                                )}

                                {/* Pointer */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-lg">
                                    <div className="w-8 h-10 bg-gradient-to-b from-amber-300 to-amber-600 clip-path-triangle transform translate-y-2" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                                </div>

                                {/* Wheel SVG */}
                                <svg
                                    className={`w-full h-full drop-shadow-2xl relative z-10 ${shouldAnimate ? 'transition-transform duration-[4000ms]' : 'transition-none'}`}
                                    viewBox="0 0 200 200"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                                    }}
                                >
                                    {WHEEL_PRIZES.map((prize, index) => {
                                        const segmentAngle = 360 / WHEEL_PRIZES.length;
                                        const startAngle = index * segmentAngle - 90;
                                        const endAngle = startAngle + segmentAngle;

                                        const startRad = (startAngle * Math.PI) / 180;
                                        const endRad = (endAngle * Math.PI) / 180;

                                        const x1 = 100 + 100 * Math.cos(startRad);
                                        const y1 = 100 + 100 * Math.sin(startRad);
                                        const x2 = 100 + 100 * Math.cos(endRad);
                                        const y2 = 100 + 100 * Math.sin(endRad);

                                        const textAngle = startAngle + segmentAngle / 2;
                                        const textRad = (textAngle * Math.PI) / 180;
                                        const textX = 100 + 65 * Math.cos(textRad);
                                        const textY = 100 + 65 * Math.sin(textRad);

                                        return (
                                            <g key={index}>
                                                <path
                                                    d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                                                    fill={PRIZE_COLORS[index]}
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth="1"
                                                />
                                                <text
                                                    x={textX}
                                                    y={textY}
                                                    fill="white"
                                                    fontSize="14"
                                                    fontWeight="800"
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                                                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                                                >
                                                    {prize}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Center circle */}
                                    <circle cx="100" cy="100" r="22" fill="white" stroke="#f59e0b" strokeWidth="4" />
                                    <text x="100" y="100" fontSize="20" textAnchor="middle" dominantBaseline="middle">🎁</text>
                                </svg>
                            </div>

                            {/* Win Message / Action Button */}
                            <div className="w-full mt-auto">
                                {wonPrize ? (
                                    <div className="text-center animate-bounce-in">
                                        <div className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-xl shadow-amber-500/20">
                                            <p className="text-3xl font-black text-white flex items-center justify-center gap-3">
                                                <Sparkles className="w-6 h-6" />
                                                +{wonPrize} pts
                                                <Sparkles className="w-6 h-6" />
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleSpin}
                                        disabled={!canSpin || isSpinning}
                                        className={`w-full py-7 text-lg font-bold rounded-xl transition-all duration-300 relative overflow-hidden group ${canSpin
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transform hover:-translate-y-1'
                                            : 'bg-white/5 border border-white/10 text-muted-foreground'
                                            }`}
                                    >
                                        {isSpinning ? (
                                            <span className="flex items-center gap-2">
                                                <Zap className="w-5 h-5 animate-spin" />
                                                La roue tourne...
                                            </span>
                                        ) : canSpin ? (
                                            <span className="flex items-center gap-2">
                                                <Gift className="w-5 h-5 group-hover:animate-bounce" />
                                                Tenter ma chance
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Prochain tour dans</span>
                                                </div>
                                                <span className="text-xl font-mono text-foreground tracking-wider">{nextSpinTime}</span>
                                            </div>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Social & Shop */}
                        <div className="space-y-6 flex flex-col">

                            {/* Social Media Bonuses */}
                            <div className="glass rounded-3xl p-6 border border-blue-500/20 flex-1 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px]" />

                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20">
                                            <TrendingUp className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">Bonus Réseaux</h3>
                                            <p className="text-xs text-muted-foreground">Boostez vos points gratuitement</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                        +50 pts / action
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10 min-h-[200px]">
                                    {verifyingPlatform ? (
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-fade-in">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-semibold text-sm">Vérification {verifyingPlatform}</h4>
                                                <button onClick={() => setVerifyingPlatform(null)} className="text-muted-foreground hover:text-white">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Entrez votre nom d'utilisateur pour valider que vous avez bien suivi la page.
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={socialUsername}
                                                    onChange={(e) => setSocialUsername(e.target.value)}
                                                    placeholder={`Votre pseudo ${verifyingPlatform}...`}
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={submitSocialVerification}
                                                    disabled={!socialUsername}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                                >
                                                    Valider
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        [
                                            { id: 'twitter', icon: Twitter, label: 'Twitter', color: 'text-sky-400', hover: 'hover:border-sky-500/30 hover:bg-sky-500/5', url: 'https://twitter.com/yourhandle' },
                                            { id: 'github', icon: Github, label: 'GitHub', color: 'text-white', hover: 'hover:border-white/30 hover:bg-white/5', url: 'https://github.com/MEHDImp4' },
                                            { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-500', hover: 'hover:border-blue-500/30 hover:bg-blue-500/5', url: 'https://www.linkedin.com/in/diouri-mehdi-a73579301/' }
                                        ].map((social) => (
                                            <button
                                                key={social.id}
                                                onClick={() => handleSocialClick(social.id, social.url)}
                                                className={`w-full flex items-center p-4 rounded-xl border border-white/5 bg-white/5 ${social.hover} transition-all duration-300 group`}
                                            >
                                                <social.icon className={`w-5 h-5 ${social.color} mr-4 group-hover:scale-110 transition-transform`} />
                                                <span className="font-medium">Suivre sur {social.label}</span>
                                                <span className="ml-auto flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                                    <Sparkles className="w-3 h-3" /> +50
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Purchase Points */}
                            <div className="glass rounded-3xl p-6 border border-emerald-500/20 flex-1 relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px]" />

                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/20">
                                        <DollarSign className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Boutique de Points</h3>
                                        <p className="text-xs text-muted-foreground">Obtenez des points instantanément</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    {[
                                        { usd: 1, points: 300, popular: false, bonus: 0 },
                                        { usd: 2, points: 600, popular: false, bonus: 0 },
                                        { usd: 5, points: 1600, popular: true, bonus: 100 },
                                        { usd: 10, points: 3200, popular: false, bonus: 200 }
                                    ].map((pack) => (
                                        <button
                                            key={pack.usd}
                                            onClick={() => handlePurchase(pack)}
                                            className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group overflow-hidden ${pack.popular
                                                ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10'
                                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {pack.popular && (
                                                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                                    POPULAIRE
                                                </div>
                                            )}

                                            {pack.bonus > 0 && (
                                                <div className="absolute top-0 left-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg animate-pulse">
                                                    +{pack.bonus} BONUS
                                                </div>
                                            )}

                                            <span className={`text-2xl font-black mb-1 group-hover:scale-110 transition-transform ${pack.popular ? 'text-emerald-400' : 'text-foreground'}`}>
                                                {pack.points}
                                            </span>
                                            <span className="text-xs text-muted-foreground mb-2">points</span>
                                            <div className="px-3 py-1 rounded-full bg-white/10 text-sm font-semibold border border-white/10">
                                                {pack.usd}.00 $
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground bg-white/5 px-3 py-1 rounded-full">
                                        Paiement sécurisé par PayPal
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EarnPointsModal;
