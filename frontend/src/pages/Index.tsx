import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeatureSection from "@/components/FeatureSection";
import ConceptSection from "@/components/ConceptSection";
import TemplatesSection from "@/components/TemplatesSection";
import PointsSection from "@/components/PointsSection";
import WhySection from "@/components/WhySection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeatureSection />
        <PointsSection />
        <TemplatesSection />
        <WhySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
