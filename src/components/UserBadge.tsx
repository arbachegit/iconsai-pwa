import { useState } from "react";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ProfileModal } from "@/components/ProfileModal";
import { SettingsModal } from "@/components/SettingsModal";

export function UserBadge() {
  const { user, role, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null;

  const initials = user.email?.[0]?.toUpperCase() || "U";
  
  const roleLabels: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Admin",
    user: "Usuário",
  };

  const roleColors: Record<string, string> = {
    superadmin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    admin: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    user: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors outline-none">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage src={undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
            {user.email?.split("@")[0]}
          </span>
          {role && (
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 h-4 ${roleColors[role] || roleColors.user}`}
            >
              {roleLabels[role] || role}
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.email}</p>
          {role && (
            <Badge 
              variant="outline" 
              className={`mt-1 text-[10px] ${roleColors[role] || roleColors.user}`}
            >
              {roleLabels[role] || role}
            </Badge>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setProfileOpen(true)}
        >
          <User className="mr-2 h-4 w-4" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configuracoes
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </DropdownMenu>
  );
}
