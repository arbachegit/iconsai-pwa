import { useState, useEffect } from "react";
import { Settings, Sun, Moon, Monitor, Globe, Bell, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "pt" | "en" | "fr";
  email_notifications: boolean;
  whatsapp_notifications: boolean;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    language: "pt",
    email_notifications: true,
    whatsapp_notifications: true,
  });

  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading preferences:", error);
        return;
      }

      if (data) {
        const prefs = {
          theme: (data.theme as UserPreferences["theme"]) || "system",
          language: (data.language as UserPreferences["language"]) || "pt",
          email_notifications: data.email_notifications ?? true,
          whatsapp_notifications: data.whatsapp_notifications ?? true,
        };
        setPreferences(prefs);
        setTheme(prefs.theme);
        if (i18n.language !== prefs.language) {
          i18n.changeLanguage(prefs.language);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!user) return;

    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    // Apply theme and language immediately
    if (newPrefs.theme) {
      setTheme(newPrefs.theme);
    }
    if (newPrefs.language) {
      i18n.changeLanguage(newPrefs.language);
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        ...updatedPrefs,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferencias");
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  const languageOptions = [
    { value: "pt", label: "Portugues" },
    { value: "en", label: "English" },
    { value: "fr", label: "Francais" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuracoes
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Appearance Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sun className="h-4 w-4" />
                APARENCIA
              </div>
              <RadioGroup
                value={preferences.theme}
                onValueChange={(value) =>
                  savePreferences({ theme: value as UserPreferences["theme"] })
                }
                className="grid grid-cols-3 gap-2"
              >
                {themeOptions.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      preferences.theme === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="sr-only"
                    />
                    <option.icon className="h-5 w-5" />
                    <span className="text-sm">{option.label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Language Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                IDIOMA
              </div>
              <Select
                value={preferences.language}
                onValueChange={(value) =>
                  savePreferences({ language: value as UserPreferences["language"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Bell className="h-4 w-4" />
                NOTIFICACOES
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications" className="flex-1">
                    Receber por Email
                  </Label>
                  <Switch
                    id="email-notifications"
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) =>
                      savePreferences({ email_notifications: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="whatsapp-notifications" className="flex-1">
                    Receber por WhatsApp
                  </Label>
                  <Switch
                    id="whatsapp-notifications"
                    checked={preferences.whatsapp_notifications}
                    onCheckedChange={(checked) =>
                      savePreferences({ whatsapp_notifications: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>

            {saving && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
