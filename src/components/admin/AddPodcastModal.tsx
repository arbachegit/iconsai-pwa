import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Music } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddPodcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPodcastCreated: (id: string) => void;
}

export const AddPodcastModal = ({ open, onOpenChange, onPodcastCreated }: AddPodcastModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("audio_contents")
        .insert({
          title: title || "Novo Podcast",
          audio_url: audioUrl,
          description: description || "Descrição do podcast",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast({
        title: "Podcast adicionado",
        description: title ? `"${title}" criado com sucesso.` : "Preencha os dados do podcast.",
      });
      setTitle("");
      setAudioUrl("");
      setDescription("");
      onOpenChange(false);
      onPodcastCreated(data.id);
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o podcast.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Preencha o título do podcast.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Adicionar Podcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do podcast"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">URL do Áudio</Label>
            <Input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do podcast"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Music className="h-4 w-4 mr-1" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
