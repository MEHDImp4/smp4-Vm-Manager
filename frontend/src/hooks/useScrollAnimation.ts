import { useEffect } from "react";

export const useScrollAnimation = (selector = ".animate-on-scroll") => {
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

        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [selector]);
};
