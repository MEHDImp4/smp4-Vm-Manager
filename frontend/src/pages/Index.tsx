import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PointsSection from "@/components/PointsSection";
import TemplatesSection from "@/components/TemplatesSection";
import WhySection from "@/components/WhySection";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <HeroSection />
        <TemplatesSection />
        <PointsSection />
        <WhySection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
