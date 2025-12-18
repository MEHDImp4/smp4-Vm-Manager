declare module 'canvas-confetti' {
    interface Options {
        particleCount?: number;
        angle?: number;
        spread?: number;
        origin?: {
            x?: number;
            y?: number;
        };
        colors?: string[];
        gravity?: number;
        scalar?: number;
        drift?: number;
        ticks?: number;
        startVelocity?: number;
        shapes?: string[];
        zIndex?: number;
    }

    function confetti(options?: Options): void;

    export default confetti;
}
