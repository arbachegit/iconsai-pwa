import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Search, Edit2, Trash2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Audio {
  id: string;
  title: string;
  description: string;
  audio_url: string;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface ManageAudiosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAudio: (audio: Audio) => void;
}

type SortField = "title" | "created_at";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

export const ManageAudiosModal = ({ open, onOpenChange, onSelectAudio }: ManageAudiosModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: audios, isLoading } = useQuery({
    queryKey: ["audio-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audio_contents")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Audio[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const audio = audios?.find((a) => a.id === id);
      
      // Delete from storage if exists
      if (audio?.storage_path) {
        await supabase.storage.from("tooltip-audio").remove([audio.storage_path]);
      }

      const { error } = await supabase.from("audio_contents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audio-contents"] });
      toast({ title: "Áudio excluído", description: "O áudio foi removido com sucesso." });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir o áudio.", variant: "destructive" });
    },
  });

  const filteredAndSorted = useMemo(() => {
    if (!audios) return [];
    
    let result = audios.filter((audio) =>
      audio.title.toLowerCase().includes(search.toLowerCase()) ||
      audio.description.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === "created_at") {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [audios, search, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Gerenciar Áudios
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nome ou descrição..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search ? "Nenhum áudio encontrado" : "Nenhum áudio cadastrado"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("title")}
                    >
                      Nome <SortIcon field="title" />
                    </TableHead>
                    <TableHead className="max-w-[300px]">Descrição</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("created_at")}
                    >
                      Data <SortIcon field="created_at" />
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((audio) => (
                    <TableRow
                      key={audio.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        onSelectAudio(audio);
                        onOpenChange(false);
                      }}
                    >
                      <TableCell className="font-medium">{audio.title}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={audio.description}>
                        {audio.description}
                      </TableCell>
                      <TableCell>
                        {audio.created_at
                          ? format(new Date(audio.created_at), "dd/MM/yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAudio(audio);
                              onOpenChange(false);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(audio.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredAndSorted.length} itens)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O áudio será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
