import { useEffect, useState } from "react";
import { Clock, Baby, Users, GraduationCap, Rocket, Bot, Sparkles, Snowflake, Skull, Crown, Home, Cat, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Era {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  colorFrom: string;
  colorTo: string;
  items: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }>;
}

interface Event {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  era: string;
}

interface MobileHistoryCarouselProps {
  events: Event[];
  currentEventId: string;
  eventImages: Record<string, string>;
  loadingImages: boolean;
  onEventSelect?: (eventId: string) => void;
}

export const MobileHistoryCarousel = ({
  events,
  currentEventId,
  eventImages,
  loadingImages,
  onEventSelect,
}: MobileHistoryCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-scroll quando o currentEventId muda
  useEffect(() => {
    if (!api) return;
    const eventIndex = events.findIndex((event) => event.id === currentEventId);
    if (eventIndex !== -1 && eventIndex !== current) {
      api.scrollTo(eventIndex);
    }
  }, [currentEventId, api, events, current]);

  return (
    <div className="w-full h-full flex flex-col">
      <Carousel setApi={setApi} className="w-full flex-1">
        <CarouselContent>
          {events.map((event) => {
            const Icon = event.icon;
            return (
              <CarouselItem key={event.id}>
                <Card className="border-none bg-transparent">
                  <div className="p-6 space-y-4">
                    {/* Imagem do evento */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted/50">
                      {loadingImages ? (
                        <Skeleton className="w-full h-full" />
                      ) : eventImages[event.id] ? (
                        <img
                          src={eventImages[event.id]}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-16 h-16 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Ícone, data e título */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-primary shrink-0">
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        {/* Badge com data em fonte Typewriter - 2x maior com máxima visibilidade */}
                        <Badge 
                          variant="outline" 
                          className="mb-4 font-mono text-xs tracking-widest px-2.5 py-1 border-2 border-primary bg-primary/40 !text-white font-extrabold shadow-lg"
                        >
                          {event.date}
                        </Badge>
                        <h3 className="text-lg font-bold text-primary mb-2">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>

      {/* Dot indicators com ícones */}
      <div className="flex justify-center gap-2 py-4">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <button
              key={event.id}
              onClick={() => {
                api?.scrollTo(index);
                onEventSelect?.(event.id);
              }}
              className={cn(
                "rounded-full transition-all flex items-center justify-center",
                index === current 
                  ? "w-8 h-8 bg-primary" 
                  : "w-6 h-6 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para ${event.title}`}
            >
              {index === current && <Icon className="w-4 h-4 text-primary-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
