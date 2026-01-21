import { Badge } from '@/components/ui/badge';
import type { PWAModuleType } from '@/types/pwa-conversations';
import { PWA_MODULES } from '@/types/pwa-conversations';
import { Globe, Heart, Lightbulb, type LucideIcon } from 'lucide-react';

interface PWAModuleBadgesProps {
  modulesUsed: PWAModuleType[];
  onModuleClick: (moduleType: PWAModuleType) => void;
}

const ICONS: Record<string, LucideIcon> = { 
  Globe, 
  Heart, 
  Lightbulb 
};

export const PWAModuleBadges = ({ modulesUsed, onModuleClick }: PWAModuleBadgesProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {PWA_MODULES.map((module) => {
        const isActive = modulesUsed.includes(module.type);
        const Icon = ICONS[module.icon];
        
        return (
          <Badge
            key={module.type}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer transition-all ${
              isActive 
                ? module.bgColor + ' hover:opacity-80' 
                : 'opacity-40 hover:opacity-60'
            }`}
            style={{ 
              borderColor: isActive ? module.color : undefined,
              color: isActive ? module.color : undefined
            }}
            onClick={() => isActive && onModuleClick(module.type)}
          >
            {Icon && <Icon className="w-3 h-3 mr-1" />}
            {module.name}
          </Badge>
        );
      })}
    </div>
  );
};
