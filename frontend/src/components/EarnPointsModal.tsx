import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Gift, DollarSign, Twitter, Github, Linkedin, TrendingUp, Coins, Clock, Zap } from "lucide-react";
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
    const [wonPrize, setWonPrize] = useState<number | null>(null);
    const [nextSpinTime, setNextSpinTime] = useState("");
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

                // Calculate rotation to land on the prize
                const segmentAngle = 360 / WHEEL_PRIZES.length;
                const targetRotation = 360 * 5 + (prizeIndex * segmentAngle); // 5 full rotations + target

                setRotation(targetRotation);

                // Wait for animation
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

    const handleSocialBonus = async (platform: string) => {
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
                body: JSON.stringify({ platform })
            });

            if (response.ok) {
                const data = await response.json();

                // Mini confetti for social bonus
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#3b82f6', '#8b5cf6', '#ec4899']
                });

                toast.success(data.message);
                onPointsEarned();
            } else {
                const error = await response.json();
                toast.error(error.error);
            }
        } catch (error) {
            toast.error("Erreur de connexion");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-3">
                            <Sparkles className="w-8 h-8 text-amber-400" />
                            <h2 className="text-3xl font-bold gradient-text">Gagner des Points</h2>
                            <Sparkles className="w-8 h-8 text-amber-400" />
                        </div>
                        <p className="text-muted-foreground">Tournez la roue, suivez-nous, ou achetez des points !</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Daily Wheel */}
                        <div className="glass rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2 rounded-xl bg-amber-500/10">
                                    <Gift className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Roue Quotidienne</h3>
                                    <p className="text-sm text-muted-foreground">Gagnez de 10 à 200 points</p>
                                </div>
                            </div>

                            {/* Wheel */}
                            <div className="relative w-64 h-64 mx-auto my-6">
                                {/* Glow effect when ready */}
                                {canSpin && !isSpinning && (
                                    <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
                                )}

                                {/* Pointer */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                                    {isSpinning && (
                                        <div className="absolute inset-0 w-6 h-6 -translate-x-1/2 animate-ping">
                                            <Sparkles className="w-6 h-6 text-amber-400" />
                                        </div>
                                    )}
                                    <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-400 drop-shadow-lg" />
                                </div>

                                {/* Wheel SVG */}
                                <svg
                                    className="w-full h-full drop-shadow-2xl relative z-10"
                                    viewBox="0 0 200 200"
                                    style={{
                                        transform: `rotate(${rotation}deg)`,
                                        transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
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
                                        const textX = 100 + 60 * Math.cos(textRad);
                                        const textY = 100 + 60 * Math.sin(textRad);

                                        return (
                                            <g key={index}>
                                                <path
                                                    d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                                                    fill={PRIZE_COLORS[index]}
                                                    stroke="#fff"
                                                    strokeWidth="2"
                                                />
                                                <text
                                                    x={textX}
                                                    y={textY}
                                                    fill="white"
                                                    fontSize="18"
                                                    fontWeight="bold"
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                                                >
                                                    {prize}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* Center circle */}
                                    <circle cx="100" cy="100" r="25" fill="white" stroke="#f59e0b" strokeWidth="4" />
                                    <text x="100" y="100" fill="#f59e0b" fontSize="24" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                                        🎁
                                    </text>
                                </svg>
                            </div>

                            {wonPrize && (
                                <div className="text-center mb-4">
                                    <div className={`inline-block px-6 py-3 rounded-2xl bg-gradient-to-r ${wonPrize >= 150
                                        ? 'from-yellow-400 to-orange-500 shadow-2xl shadow-yellow-500/50'
                                        : wonPrize >= 75
                                            ? 'from-amber-500 to-orange-500 shadow-2xl shadow-amber-500/50'
                                            : 'from-blue-500 to-indigo-500 shadow-xl shadow-blue-500/30'
                                        } ${wonPrize >= 150 ? 'animate-celebrate' : 'animate-bounce'}`}>
                                        <p className="text-3xl font-bold text-white flex items-center gap-2">
                                            {wonPrize >= 150 ? (
                                                <>
                                                    <Sparkles className="w-8 h-8 animate-spin" />
                                                    <span>🏆 +{wonPrize} pts! 🏆</span>
                                                    <Sparkles className="w-8 h-8 animate-spin" />
                                                </>
                                            ) : wonPrize >= 75 ? (
                                                <>
                                                    <Sparkles className="w-6 h-6" />
                                                    <span>⭐ +{wonPrize} pts!</span>
                                                    <Sparkles className="w-6 h-6" />
                                                </>
                                            ) : (
                                                <>
                                                    <Coins className="w-6 h-6" />
                                                    <span>+{wonPrize} pts!</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleSpin}
                                disabled={!canSpin || isSpinning}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 shadow-lg disabled:opacity-50"
                            >
                                {isSpinning ? (
                                    <>
                                        <Zap className="w-5 h-5 mr-2 animate-spin" />
                                        Tournage...
                                    </>
                                ) : canSpin ? (
                                    <>
                                        <Gift className="w-5 h-5 mr-2" />
                                        Tourner la Roue
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-5 h-5 mr-2" />
                                        Reviens dans {nextSpinTime}
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Social Media Bonuses */}
                            <div className="glass rounded-2xl p-6 border border-blue-500/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-blue-500/10">
                                        <TrendingUp className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Bonus Réseaux</h3>
                                        <p className="text-xs text-muted-foreground">+50 pts par plateforme</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={() => {
                                            window.open("https://twitter.com/yourhandle", "_blank");
                                            handleSocialBonus("twitter");
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30"
                                    >
                                        <Twitter className="w-5 h-5 text-blue-400" />
                                        <span>Suivre sur Twitter</span>
                                        <span className="ml-auto text-emerald-400 font-bold">+50</span>
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            window.open("https://github.com/yourhandle", "_blank");
                                            handleSocialBonus("github");
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3 border-white/10 hover:bg-purple-500/10 hover:border-purple-500/30"
                                    >
                                        <Github className="w-5 h-5 text-purple-400" />
                                        <span>Follow sur GitHub</span>
                                        <span className="ml-auto text-emerald-400 font-bold">+50</span>
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            window.open("https://linkedin.com/in/yourhandle", "_blank");
                                            handleSocialBonus("linkedin");
                                        }}
                                        variant="outline"
                                        className="w-full justify-start gap-3 border-white/10 hover:bg-blue-600/10 hover:border-blue-600/30"
                                    >
                                        <Linkedin className="w-5 h-5 text-blue-500" />
                                        <span>Connecter sur LinkedIn</span>
                                        <span className="ml-auto text-emerald-400 font-bold">+50</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Purchase Points */}
                            <div className="glass rounded-2xl p-6 border border-emerald-500/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl bg-emerald-500/10">
                                        <DollarSign className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Acheter des Points</h3>
                                        <p className="text-xs text-muted-foreground">1$ = 200 points</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { usd: 1, points: 200 },
                                        { usd: 2, points: 400 },
                                        { usd: 5, points: 1000 },
                                        { usd: 10, points: 2000 }
                                    ].map((pack) => (
                                        <Button
                                            key={pack.usd}
                                            variant="outline"
                                            className="flex flex-col items-center p-4 h-auto border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                                        >
                                            <span className="text-2xl font-bold text-emerald-400">{pack.points}</span>
                                            <span className="text-xs text-muted-foreground">pts</span>
                                            <span className="text-sm mt-1">${pack.usd}</span>
                                        </Button>
                                    ))}
                                </div>

                                <p className="text-xs text-center text-amber-400 mt-4">
                                    💳 Paiement sécurisé - Bientôt disponible
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EarnPointsModal;
