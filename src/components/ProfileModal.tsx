import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Camera, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const profileSchema = z.object({
  first_name: z.string().max(100, "Maximo 100 caracteres").optional(),
  last_name: z.string().max(100, "Maximo 100 caracteres").optional(),
  phone: z.string().max(20, "Maximo 20 caracteres").optional(),
  institution_work: z.string().max(200, "Maximo 200 caracteres").optional(),
  institution_study: z.string().max(200, "Maximo 200 caracteres").optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Minimo 6 caracteres"),
    newPassword: z.string().min(6, "Minimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Minimo 6 caracteres"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Senhas nao coincidem",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      institution_work: "",
      institution_study: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      loadProfile();
    }
  }, [open, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
        return;
      }

      if (data) {
        profileForm.reset({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: (data as { phone?: string }).phone || "",
          institution_work: data.institution_work || "",
          institution_study: data.institution_study || "",
        });
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem valida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no maximo 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("content-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("content-images")
        .getPublicUrl(filePath);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: newAvatarUrl });

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast.success("Avatar atualizado");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao enviar avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        phone: data.phone || null,
        institution_work: data.institution_work || null,
        institution_study: data.institution_study || null,
      });

      if (error) throw error;

      toast.success("Perfil atualizado");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso");
      passwordForm.reset();
      setShowPasswordSection(false);
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      const message = error instanceof Error ? error.message : "Erro ao alterar senha";
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-primary-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <Separator />

          {/* Profile Form */}
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input placeholder="Sobrenome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="institution_work"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instituicao de Trabalho</FormLabel>
                    <FormControl>
                      <Input placeholder="Empresa ou organizacao" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="institution_study"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instituicao de Estudo</FormLabel>
                    <FormControl>
                      <Input placeholder="Universidade ou escola" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>

          <Separator />

          {/* Password Section */}
          <Collapsible open={showPasswordSection} onOpenChange={setShowPasswordSection}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Lock className="h-4 w-4" />
                Alterar Senha
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={changingPassword} className="w-full">
                    {changingPassword && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Alterar Senha
                  </Button>
                </form>
              </Form>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
