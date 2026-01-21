import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { TooltipIcon } from "@/components/TooltipIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  reverse?: boolean;
  quote?: string;
  quoteAuthor?: string;
}

const Section = ({ id, title, subtitle, children, reverse = false, quote, quoteAuthor }: SectionProps) => {
  // Section images - disabled since generated_images table doesn't have section_id/image_url columns
  const sectionImage: string | undefined = undefined;
  const isLoading = false;

  return (
    <section id={id} className="py-8 relative">
      <div className="container mx-auto px-4">
        <div
          className={`grid lg:grid-cols-2 gap-12 items-center ${
            reverse ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className={`space-y-6 ${reverse ? "lg:order-2" : ""}`}>
            <div className="flex items-center">
              <div className="inline-block px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-sm text-primary font-medium">{subtitle}</span>
              </div>
              <TooltipIcon sectionId={id} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">{title}</h2>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {children}
            </div>
            
            {quote && (
              <blockquote className="mt-6 pt-4 border-t border-primary/20">
                <p className="text-xl md:text-2xl italic bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent">
                  "{quote}"
                </p>
                {quoteAuthor && (
                  <footer className="mt-2 text-sm text-muted-foreground not-italic">
                    by {quoteAuthor}
                  </footer>
                )}
              </blockquote>
            )}
          </div>

          <div className={reverse ? "lg:order-1" : ""}>
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/10 glow-effect-secondary">
              <div className="aspect-square rounded-lg bg-gradient-subtle flex items-center justify-center overflow-hidden">
                {isLoading || !sectionImage ? (
                  <div className="text-6xl text-primary/20">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
                    </div>
                  </div>
                ) : (
                <img 
                  src={sectionImage} 
                  alt={title}
                  className="w-full h-full object-cover rounded-lg"
                  loading="lazy"
                  decoding="async"
                />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section;
