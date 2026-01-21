import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Tag } from "@/types/tag";
import type { TagFormData } from "./types";

interface TagEditDialogProps {
  open: boolean;
  tag: Tag | null;
  isParent: boolean;
  formData: TagFormData;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (data: Partial<TagFormData>) => void;
  onSubmit: () => void;
}

export const TagEditDialog = memo(function TagEditDialog({
  open,
  tag,
  isParent,
  formData,
  isPending,
  onOpenChange,
  onFormChange,
  onSubmit,
}: TagEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tag ? "Editar Tag" : `Criar Tag ${isParent ? "Pai" : "Filha"}`}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos para {tag ? "atualizar" : "criar"} a tag
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da Tag</Label>
            <Input
              value={formData.tag_name}
              onChange={(e) => onFormChange({ tag_name: e.target.value })}
              placeholder="ex: Cardiologia"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Input
              value={formData.tag_type}
              onChange={(e) => onFormChange({ tag_type: e.target.value })}
              placeholder="ex: medical_specialty"
            />
          </div>
          <div>
            <Label>Confiança (0-1)</Label>
            <Input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={formData.confidence}
              onChange={(e) => onFormChange({ confidence: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>Origem</Label>
            <Select 
              value={formData.source} 
              onValueChange={(val) => onFormChange({ source: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">IA</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
