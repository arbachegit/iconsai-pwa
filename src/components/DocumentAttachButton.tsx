import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
interface DocumentAttachButtonProps {
  onAttach: (documentId: string, documentName: string) => void;
  disabled?: boolean;
}
export function DocumentAttachButton({
  onAttach,
  disabled
}: DocumentAttachButtonProps) {
  const {
    t
  } = useTranslation();
  const [open, setOpen] = useState(false);
  const {
    data: documents,
    isLoading
  } = useQuery({
    queryKey: ["health-documents"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documents").select("id, title, content, category, source, tags, created_at").order("created_at", {
        ascending: false
      }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open
  });
  const handleAttach = (documentId: string, documentName: string) => {
    onAttach(documentId, documentName);
    setOpen(false);
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Paperclip className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('documentAttach.title')}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('documentAttach.loading')}</span>
          </div> : <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {documents && documents.length > 0 ? documents.map(doc => <button key={doc.id} onClick={() => handleAttach(doc.id, doc.title)} className={cn("w-full p-4 rounded-lg border-2 text-left transition-all", "hover:border-primary hover:bg-primary/5", "focus:outline-none focus:ring-2 focus:ring-primary")}>
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{doc.title}</div>
                        {doc.category && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {doc.category}
                          </div>}
                        <div className="flex items-center gap-2 mt-2">
                          {doc.source && <Badge variant="secondary" className="text-xs">
                            {doc.source}
                          </Badge>}
                        </div>
                      </div>
                    </div>
                  </button>) : <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('documentAttach.noDocuments')}</p>
                  <p className="text-sm mt-1">{t('documentAttach.noDocumentsDesc')}</p>
                </div>}
            </div>
          </ScrollArea>}
      </DialogContent>
    </Dialog>;
}