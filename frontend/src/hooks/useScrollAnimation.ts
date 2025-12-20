import { useEffect } from "react";

export const useScrollAnimation = (selector = ".animate-on-scroll", deps: any[] = []) => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Add animation class
                    entry.target.classList.add("animate-fade-up");

                    // Remove initial hidden state
                    entry.target.classList.remove("opacity-0");
                    entry.target.classList.remove("translate-y-10");

                    // Only animate once
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => observer.observe(el));
        }, 100);

        return () => {
            observer.disconnect();
            clearTimeout(timeoutId);
        }
    }, [selector, ...deps]);
};
