import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Trash2, ExternalLink, Play, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VimeoVideo {
  id: string;
  title: string;
  description: string | null;
  vimeo_id: string;
  thumbnail_url: string | null;
  duration: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to extract Vimeo ID from URL
const extractVimeoId = (url: string): string | null => {
  // Match patterns like:
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  // https://vimeo.com/channels/staffpicks/123456789
  // 123456789 (just the ID)

  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /^(\d+)$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

// Generate embed URL for Vimeo
const getVimeoEmbedUrl = (vimeoId: string): string => {
  return `https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`;
};

// Generate thumbnail URL for Vimeo
const getVimeoThumbnailUrl = (vimeoId: string): string => {
  return `https://vumbnail.com/${vimeoId}.jpg`;
};

export const VideosTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VimeoVideo | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    vimeoUrl: "",
    category: "geral",
  });

  // Fetch videos from database
  const { data: videos, isLoading } = useQuery({
    queryKey: ['vimeo-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vimeo_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VimeoVideo[];
    }
  });

  // Add video mutation
  const addVideoMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const vimeoId = extractVimeoId(data.vimeoUrl);

      if (!vimeoId) {
        throw new Error('URL do Vimeo inválida. Use o formato: https://vimeo.com/123456789');
      }

      const { error } = await supabase
        .from('vimeo_videos')
        .insert({
          title: data.title,
          description: data.description || null,
          vimeo_id: vimeoId,
          thumbnail_url: getVimeoThumbnailUrl(vimeoId),
          category: data.category,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vídeo adicionado",
        description: "O vídeo do Vimeo foi adicionado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['vimeo-videos'] });
      setIsAddDialogOpen(false);
      setFormData({ title: "", description: "", vimeoUrl: "", category: "geral" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vimeo_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vídeo removido",
        description: "O vídeo foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['vimeo-videos'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o vídeo.",
        variant: "destructive",
      });
    }
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('vimeo_videos')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status do vídeo foi atualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ['vimeo-videos'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addVideoMutation.mutate(formData);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const categories = [
    { value: "geral", label: "Geral" },
    { value: "tutorial", label: "Tutorial" },
    { value: "apresentacao", label: "Apresentação" },
    { value: "depoimento", label: "Depoimento" },
    { value: "institucional", label: "Institucional" },
    { value: "demonstracao", label: "Demonstração" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Gerenciamento de Vídeos (Vimeo)"
                level="h2"
                icon={Video}
                tooltipText="Gerencie vídeos do Vimeo"
                infoContent={
                  <>
                    <p>Adicione e gerencie vídeos do Vimeo para uso na plataforma.</p>
                    <p className="mt-2">Cole a URL do vídeo do Vimeo para adicionar automaticamente.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Adicione vídeos do Vimeo para exibição na plataforma KnowYOU
              </CardDescription>
            </div>

            {/* Add Video Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Vídeo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Vídeo do Vimeo</DialogTitle>
                  <DialogDescription>
                    Cole a URL do vídeo do Vimeo e preencha as informações.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="vimeoUrl">URL do Vimeo *</Label>
                    <Input
                      id="vimeoUrl"
                      placeholder="https://vimeo.com/123456789"
                      value={formData.vimeoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, vimeoUrl: e.target.value }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Exemplo: https://vimeo.com/123456789
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      placeholder="Título do vídeo"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descrição do vídeo (opcional)"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addVideoMutation.isPending}>
                      {addVideoMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adicionando...
                        </>
                      ) : (
                        "Adicionar"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Videos Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vídeos Cadastrados</CardTitle>
          <CardDescription>
            {videos?.length || 0} vídeo(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className={`overflow-hidden ${!video.is_active ? 'opacity-60' : ''}`}>
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-video bg-muted cursor-pointer group"
                    onClick={() => setPreviewVideo(video)}
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-black ml-1" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        {formatDuration(video.duration)}
                      </div>
                    )}

                    {/* Inactive badge */}
                    {!video.is_active && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/90 text-white text-xs rounded">
                        Inativo
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h4>
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{video.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 bg-muted rounded capitalize">{video.category || 'geral'}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(video.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleActiveMutation.mutate({ id: video.id, isActive: !video.is_active })}
                      >
                        {video.is_active ? 'Desativar' : 'Ativar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://vimeo.com/${video.vimeo_id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover vídeo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O vídeo "{video.title}" será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVideoMutation.mutate(video.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vídeo cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione vídeos do Vimeo para exibir na plataforma.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Vídeo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewVideo?.title}</DialogTitle>
            {previewVideo?.description && (
              <DialogDescription>{previewVideo.description}</DialogDescription>
            )}
          </DialogHeader>

          {previewVideo && (
            <div className="aspect-video w-full">
              <iframe
                src={getVimeoEmbedUrl(previewVideo.vimeo_id)}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title={previewVideo.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosTab;
