import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';

interface MermaidZoomModalProps {
  chart: string;
  id: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: 'dark' | 'light';
}

export const MermaidZoomModal = ({ 
  chart, 
  id, 
  title, 
  open, 
  onOpenChange,
  theme = 'dark' 
}: MermaidZoomModalProps) => {
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleResetZoom}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4">
          <div 
            className="transition-transform duration-200 origin-top-left"
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <MermaidDiagram chart={chart} id={`${id}-modal`} theme={theme} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
