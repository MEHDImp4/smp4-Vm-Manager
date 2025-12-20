import { Cloud, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {


  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4 md:mb-0 select-none">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Cloud className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">SMP4cloud</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              SMP4cloud - La solution simple pour vos VMs et conteneurs.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/MEHDImp4"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/diouri-mehdi-a73579301/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/templates" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Templates
                </Link>
              </li>
              <li>
                <Link to="/tarification" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Tarification
                </Link>
              </li>
              <li>
                <Link to="/docker-guide" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Ressources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Tutoriels
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Centre d'aide
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-medium">
              Projet éducatif
            </span>
            <span>© 2024 SMP4cloud. Tous droits réservés.</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Confidentialité
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              CGU
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
