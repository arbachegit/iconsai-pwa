import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, GraduationCap, Settings, Boxes } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DocumentRoutingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    filename: string;
    suggestedTags: string[];
  } | null;
  onRedirect: (category: 'health' | 'study' | 'both' | 'general') => void;
}

export function DocumentRoutingModal({
  open,
  onOpenChange,
  document,
  onRedirect,
}: DocumentRoutingModalProps) {
  const { t } = useTranslation();
  
  if (!document) return null;

  const handleRedirect = (category: 'health' | 'study' | 'both' | 'general') => {
    onRedirect(category);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('documentRouting.title')}
          </DialogTitle>
          <DialogDescription>
            {t('documentRouting.description', { filename: document.filename })}
          </DialogDescription>
        </DialogHeader>
        
        {/* Display suggested tags */}
        {document.suggestedTags.length > 0 && (
          <div className="my-4">
            <p className="text-sm text-muted-foreground mb-2">{t('documentRouting.suggestedTags')}</p>
            <div className="flex flex-wrap gap-2">
              {document.suggestedTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Redirect options */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            onClick={() => handleRedirect('health')}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Heart className="h-6 w-6 text-red-500" />
            <span className="text-sm font-semibold">{t('documentRouting.health')}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t('documentRouting.healthDesc')}
            </span>
          </Button>
          
          <Button
            onClick={() => handleRedirect('study')}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <GraduationCap className="h-6 w-6 text-blue-500" />
            <span className="text-sm font-semibold">{t('documentRouting.study')}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t('documentRouting.studyDesc')}
            </span>
          </Button>
          
          <Button
            onClick={() => handleRedirect('both')}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Boxes className="h-6 w-6 text-emerald-500" />
            <span className="text-sm font-semibold">{t('documentRouting.both')}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t('documentRouting.bothDesc')}
            </span>
          </Button>
          
          <Button
            onClick={() => handleRedirect('general')}
            variant="secondary"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Settings className="h-6 w-6 text-gray-500" />
            <span className="text-sm font-semibold">{t('documentRouting.general')}</span>
            <span className="text-xs text-muted-foreground text-center">
              {t('documentRouting.generalDesc')}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}