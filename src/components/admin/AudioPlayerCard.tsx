import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Headphones, Lightbulb, Edit2, Save, X, Loader2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Audio {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

interface AudioPlayerCardProps {
  audio: Audio;
  index: number;
  onDeleted?: () => void;
}

export const AudioPlayerCard = ({ audio, index, onDeleted }: AudioPlayerCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: audio.title,
    description: audio.description,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("audio_contents")
        .update({
          title: editForm.title,
          description: editForm.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", audio.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-contents"] });
      toast({ title: "Salvo com sucesso", description: "Áudio atualizado." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (audio.storage_path) {
        await supabase.storage.from("tooltip-audio").remove([audio.storage_path]);
      }
      const { error } = await supabase.from("audio_contents").delete().eq("id", audio.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-contents"] });
      toast({ title: "Áudio excluído", description: "Removido com sucesso." });
      setShowDeleteConfirm(false);
      onDeleted?.();
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    },
  });

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({ title: audio.title, description: audio.description });
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">Áudio {index + 1}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDescription(true)}
                title="Ver descrição"
              >
                <Lightbulb className="h-4 w-4 text-yellow-500" />
              </Button>
              {!isEditing && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Título</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="border-blue-400/60 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="border-blue-400/60 focus:border-blue-500 min-h-[100px]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleCancel} size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="text-sm font-medium">{audio.title}</p>
              </div>
              <div className="rounded-lg overflow-hidden bg-muted/50 p-2">
                <audio controls className="w-full h-10" preload="metadata">
                  <source src={audio.audio_url} />
                  Seu navegador não suporta áudio.
                </audio>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="text-sm text-muted-foreground line-clamp-2">{audio.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDescription} onOpenChange={setShowDescription}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              {audio.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{audio.description}</p>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O áudio "{audio.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
