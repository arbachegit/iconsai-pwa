import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Headphones, FileAudio } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";

interface AddAudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAudioModal = ({ open, onOpenChange }: AddAudioModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setAudioFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!audioFile) throw new Error("Nenhum arquivo selecionado");

      // Upload to storage
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `audio-contents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tooltip-audio")
        .upload(storagePath, audioFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("tooltip-audio")
        .getPublicUrl(storagePath);

      // Get next display_order
      const { data: existing } = await supabase
        .from("audio_contents")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      // Insert record
      const { error: insertError } = await supabase
        .from("audio_contents")
        .insert({
          title,
          description,
          audio_url: urlData.publicUrl,
          storage_path: storagePath,
          display_order: nextOrder,
          is_active: true,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-contents"] });
      toast({
        title: "Áudio adicionado",
        description: "O áudio foi salvo com sucesso.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message || "Não foi possível adicionar o áudio.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAudioFile(null);
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !audioFile) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e selecione um arquivo.",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Adicionar Novo Áudio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nome do Áudio *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introdução ao Módulo 1"
              className="border-blue-400/60 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Descrição *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteúdo deste áudio..."
              className="border-blue-400/60 focus:border-blue-500 min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Arquivo de Áudio *</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : audioFile
                  ? "border-green-500 bg-green-500/10"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              {audioFile ? (
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <FileAudio className="h-8 w-8" />
                  <div>
                    <p className="font-medium">{audioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">
                    {isDragActive ? "Solte o arquivo aqui..." : "Arraste um arquivo ou clique para selecionar"}
                  </p>
                  <p className="text-xs mt-1">MP3, WAV, OGG, M4A (máx. 50MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || !audioFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            Salvar Áudio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
