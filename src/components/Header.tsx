import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Brain, Languages, Check, Loader2 } from "lucide-react";
import Cookies from 'js-cookie';
import knowriskLogo from "@/assets/knowrisk-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const languages = [
    { code: "pt", label: "Português", flag: "🇧🇷" },
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
  ];

  const handleLanguageChange = async (code: string) => {
    setIsChangingLanguage(true);
    await i18n.changeLanguage(code);
    localStorage.setItem("language", code);
    Cookies.set("language", code, { expires: 365 });
    setTimeout(() => setIsChangingLanguage(false), 400);
  };

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          
          // Calculate scroll progress percentage
          const windowHeight = window.innerHeight;
          const documentHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY;
          const maxScroll = documentHeight - windowHeight;
          const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
          setScrollProgress(Math.min(progress, 100));
          
          ticking = false;
        });
        
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: t("header.software"), href: "#software" },
    { label: t("header.internet"), href: "#internet" },
    { label: t("header.tech"), href: "#tech-sem-proposito" },
    { label: t("header.kubrick"), href: "#kubrick" },
    { label: t("header.watson"), href: "#watson" },
    { label: t("header.newEra"), href: "#ia-nova-era" },
    { label: t("header.knowyou"), href: "#knowyou" },
    { label: t("header.goodPrompt"), href: "#bom-prompt" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen ? "bg-background/95 backdrop-blur-lg shadow-lg" : "bg-transparent"
      }`}
    >
      {/* Scroll Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/20">
        <div 
          className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={knowriskLogo} 
              alt="KnowRisk" 
              className="h-8 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => scrollToSection(item.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
            
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground hover:!text-black dark:hover:!text-white transition-all duration-200 hover:scale-110 flex items-center gap-1"
                  title="Idioma / Language"
                  disabled={isChangingLanguage}
                >
                  {isChangingLanguage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Languages className="w-5 h-5" />
                  )}
                  <span className="text-xs uppercase">{i18n.language}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-background/95 backdrop-blur-lg border-border z-[100]"
              >
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {i18n.language === lang.code && (
                      <Check className="w-4 h-4 ml-auto text-primary" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link 
              to="/admin" 
              className="text-white hover:text-white transition-all duration-200 hover:scale-110"
              title="Admin Panel"
            >
              <Brain className="w-5 h-5" />
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            {/* Mobile Brain (Login) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              asChild
            >
              <Link to="/admin/login" aria-label="Login Admin" title="Login Admin">
                <Brain className="h-6 w-6" />
              </Link>
            </Button>

            {/* Mobile Menu (Sheet) */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[min(92vw,22rem)] p-0 !bg-card border-l border-border">
                <SheetTitle className="sr-only">Menu</SheetTitle>

                <div className="px-4 pt-6 pb-4 border-b border-border">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Menu
                  </h2>
                </div>

                <nav className="flex flex-col py-2">
                  {navItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => scrollToSection(item.href)}
                      className="flex items-center w-full text-left py-2.5 px-4 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-all"
                    >
                      {item.label}
                    </button>
                  ))}

                  {/* Login */}
                  <div className="border-t border-border mt-2 pt-2 px-2">
                    <Link
                      to="/admin/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                      aria-label="Login Admin"
                      title="Login Admin"
                    >
                      <Brain className="h-5 w-5" />
                      <span>Login</span>
                    </Link>
                  </div>

                  {/* Language options in mobile menu */}
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="px-4 text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Idioma
                    </p>
                    <div className="px-2 pb-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={cn(
                            "flex items-center gap-3 w-full py-2 px-3 rounded-lg transition-all",
                            i18n.language === lang.code
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          )}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span>{lang.label}</span>
                          {i18n.language === lang.code && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
