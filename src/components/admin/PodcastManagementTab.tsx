import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Music, Save, X, Edit2, Loader2, Plus, Headphones, Settings, Lightbulb, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddPodcastModal } from "./AddPodcastModal";
import { AddAudioModal } from "./AddAudioModal";
import { ManageAudiosModal } from "./ManageAudiosModal";
import { AudioPlayerCard } from "./AudioPlayerCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface Podcast {
  id: string;
  title: string;
  spotify_episode_id: string;
  description: string;
  display_order: number | null;
  is_active: boolean | null;
}

interface Audio {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean | null;
}

export const PodcastManagementTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", spotify_episode_id: "", description: "" });
  const [showAddPodcast, setShowAddPodcast] = useState(false);
  const [showAddAudio, setShowAddAudio] = useState(false);
  const [showManageAudios, setShowManageAudios] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<Audio | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [deletePodcastId, setDeletePodcastId] = useState<string | null>(null);

  const { data: podcasts, isLoading: loadingPodcasts } = useQuery({
    queryKey: ["podcasts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcast_contents")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Podcast[];
    },
  });

  const { data: audios, isLoading: loadingAudios } = useQuery({
    queryKey: ["audio-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_contents")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Audio[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; spotify_episode_id: string; description: string }) => {
      const { error } = await supabase
        .from("podcast_contents")
        .update({
          title: data.title,
          spotify_episode_id: data.spotify_episode_id,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast({ title: "Salvo com sucesso", description: "Podcast atualizado." });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  const deletePodcastMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("podcast_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast({ title: "Podcast excluído", description: "Removido com sucesso." });
      setDeletePodcastId(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    },
  });

  const handleEdit = (podcast: Podcast) => {
    setEditingId(podcast.id);
    setEditForm({
      title: podcast.title,
      spotify_episode_id: podcast.spotify_episode_id,
      description: podcast.description,
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    saveMutation.mutate({
      id: editingId,
      title: editForm.title,
      spotify_episode_id: editForm.spotify_episode_id,
      description: editForm.description,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ title: "", spotify_episode_id: "", description: "" });
  };

  const handlePodcastCreated = (id: string) => {
    const newPodcast = podcasts?.find((p) => p.id === id);
    if (newPodcast) {
      handleEdit(newPodcast);
    } else {
      // Refetch and then edit
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] }).then(() => {
        setEditingId(id);
        setEditForm({ title: "Novo Podcast", spotify_episode_id: "", description: "Descrição do podcast" });
      });
    }
  };

  if (loadingPodcasts || loadingAudios) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SEÇÃO: Podcasts Spotify */}
      <section className="space-y-4">
        <AdminTitleWithInfo
          title="Podcasts Spotify"
          level="h2"
          tooltipText="Gerencie os podcasts do Spotify exibidos no app"
          infoContent={
            <p>Gerencie os podcasts do Spotify. Cada podcast tem título, link do Spotify e descrição que aparece em um modal ao clicar no ícone de lâmpada.</p>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {podcasts?.map((podcast, index) => (
            <Card key={podcast.id} className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1DB954]/10 rounded-lg">
                      <Music className="w-5 h-5 text-[#1DB954]" />
                    </div>
                    <CardTitle className="text-base">Podcast {index + 1}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedPodcast(podcast)}
                      title="Ver descrição"
                    >
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                    </Button>
                    {editingId !== podcast.id && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(podcast)}>
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePodcastId(podcast.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingId === podcast.id ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Título</Label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="border-blue-400/60 focus:border-blue-500"
                        placeholder="Título do podcast"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">ID do Episódio Spotify</Label>
                      <Input
                        value={editForm.spotify_episode_id}
                        onChange={(e) => setEditForm({ ...editForm, spotify_episode_id: e.target.value })}
                        className="border-blue-400/60 focus:border-blue-500"
                        placeholder="Ex: 2lORJJJIGECuG57sxtbmTx"
                      />
                      <p className="text-xs text-muted-foreground">
                        O ID do episódio encontra-se na URL do Spotify após "episode/"
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Descrição</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="border-blue-400/60 focus:border-blue-500 min-h-[120px]"
                        placeholder="Descrição do episódio"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
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
                    <div className="rounded-lg overflow-hidden">
                      <iframe
                        src={`https://open.spotify.com/embed/episode/${podcast.spotify_episode_id}?theme=0`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Título</Label>
                      <p className="text-sm font-medium">{podcast.title}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Descrição</Label>
                      <p className="text-sm text-muted-foreground line-clamp-2">{podcast.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Botão Adicionar Podcast */}
          <Card
            className="border-dashed border-2 border-muted-foreground/30 hover:border-[#1DB954]/50 cursor-pointer transition-colors flex items-center justify-center min-h-[300px]"
            onClick={() => setShowAddPodcast(true)}
          >
            <div className="text-center text-muted-foreground">
              <div className="p-4 bg-[#1DB954]/10 rounded-full mx-auto mb-3 w-fit">
                <Plus className="w-8 h-8 text-[#1DB954]" />
              </div>
              <p className="font-medium">Adicionar Podcast</p>
              <p className="text-xs mt-1">Clique para inserir um novo</p>
            </div>
          </Card>
        </div>
      </section>

      {/* SEÇÃO: Áudios no Banco de Dados */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <AdminTitleWithInfo
            title="Áudios no Banco de Dados"
            level="h2"
            tooltipText="Gerencie áudios armazenados no sistema"
            infoContent={
              <p>Gerencie áudios enviados e armazenados no banco de dados. Estes áudios podem ser usados em diferentes partes do app.</p>
            }
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAddAudio(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Áudio
            </Button>
            <Button variant="outline" onClick={() => setShowManageAudios(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Gerenciar
            </Button>
          </div>
        </div>

        {audios && audios.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {audios.map((audio, index) => (
              <AudioPlayerCard
                key={audio.id}
                audio={audio}
                index={index}
                onDeleted={() => setSelectedAudio(null)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/30">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Headphones className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum áudio cadastrado</p>
              <p className="text-sm mt-1">Clique em "Novo Áudio" para adicionar</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Modais */}
      <AddPodcastModal
        open={showAddPodcast}
        onOpenChange={setShowAddPodcast}
        onPodcastCreated={handlePodcastCreated}
      />

      <AddAudioModal open={showAddAudio} onOpenChange={setShowAddAudio} />

      <ManageAudiosModal
        open={showManageAudios}
        onOpenChange={setShowManageAudios}
        onSelectAudio={(audio) => setSelectedAudio(audio)}
      />

      {/* Modal de descrição do podcast */}
      <Dialog open={!!selectedPodcast} onOpenChange={() => setSelectedPodcast(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-[#1DB954]" />
              {selectedPodcast?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedPodcast?.description}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão de podcast */}
      <AlertDialog open={!!deletePodcastId} onOpenChange={() => setDeletePodcastId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O podcast será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletePodcastId && deletePodcastMutation.mutate(deletePodcastId)}
              disabled={deletePodcastMutation.isPending}
            >
              {deletePodcastMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
