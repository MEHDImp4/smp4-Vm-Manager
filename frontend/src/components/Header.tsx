import { Cloud, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Cloud className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            SMP4<span className="gradient-text">cloud</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#concept" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Concept
          </a>
          <a href="#templates" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Templates
          </a>
          <a href="#points" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Tarification
          </a>
          <a href="#why" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Avantages
          </a>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Se connecter</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/register">Créer un compte</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-border/50 py-4 px-4 animate-fade-up">
          <nav className="flex flex-col gap-3 mb-4">
            <a href="#concept" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Concept
            </a>
            <a href="#templates" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Templates
            </a>
            <a href="#points" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Tarification
            </a>
            <a href="#why" className="text-muted-foreground hover:text-foreground transition-colors py-2">
              Avantages
            </a>
          </nav>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button variant="hero" className="w-full" asChild>
              <Link to="/register">Créer un compte</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
