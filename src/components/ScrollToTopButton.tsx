import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsVisible(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-8 left-8 z-40 h-12 w-12 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-110 animate-fade-in bg-gradient-to-br from-primary via-secondary to-accent"
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
};
