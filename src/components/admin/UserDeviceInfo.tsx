import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Monitor, 
  Smartphone, 
  Globe, 
  MapPin, 
  Fingerprint, 
  Clock, 
  Cpu,
  Languages,
  Home
} from "lucide-react";
import { formatDateTime } from "@/lib/date-utils";

interface UserDeviceInfoProps {
  userId: string;
  userEmail: string;
}

interface ProfileData {
  last_ip_address: string | null;
  last_browser: string | null;
  last_os: string | null;
  last_device_fingerprint: string | null;
  last_screen_resolution: string | null;
  last_timezone: string | null;
  last_language: string | null;
  last_login_at: string | null;
  registration_ip_address: string | null;
  registration_browser: string | null;
  registration_os: string | null;
  registration_device_fingerprint: string | null;
  registration_location: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
}

interface AuditLog {
  ip_address: string;
  browser_name: string;
  os_name: string;
  device_fingerprint: string;
  screen_resolution: string;
  geo_city: string;
  geo_region: string;
  geo_country: string;
  created_at: string;
}

export const UserDeviceInfo = ({ userId, userEmail }: UserDeviceInfoProps) => {
  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile-device", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          last_ip_address,
          last_browser,
          last_os,
          last_device_fingerprint,
          last_screen_resolution,
          last_timezone,
          last_language,
          last_login_at,
          registration_ip_address,
          registration_browser,
          registration_os,
          registration_device_fingerprint,
          registration_location,
          address_cep,
          address_street,
          address_number,
          address_complement,
          address_neighborhood,
          address_city,
          address_state
        `)
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
    enabled: !!userId,
  });

  // Fetch latest audit logs for this user
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ["user-audit-logs", userEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("user_email", userEmail)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!userEmail,
  });

  if (profileLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  const formatAddress = () => {
    if (!profile?.address_street) return null;
    const parts = [
      profile.address_street,
      profile.address_number,
      profile.address_complement,
      profile.address_neighborhood,
      profile.address_city,
      profile.address_state,
      profile.address_cep,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const formatLocation = () => {
    if (!profile?.registration_location) return null;
    const loc = profile.registration_location;
    return [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
  };

  const InfoCard = ({ icon: Icon, label, value, variant = "default" }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null;
    variant?: "default" | "highlight";
  }) => (
    <div className={`
      flex items-start gap-3 p-3 rounded-lg border
      ${variant === "highlight" ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/50"}
    `}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${variant === "highlight" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
      `}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${value ? "" : "text-muted-foreground italic"}`}>
          {value || "Não disponível"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 bg-muted/20 rounded-lg">
      {/* Address Section */}
      {formatAddress() && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Home className="w-4 h-4" />
            Endereço Cadastrado
          </h4>
          <div className="p-3 bg-background rounded-lg border">
            <p className="text-sm">{formatAddress()}</p>
          </div>
        </div>
      )}

      {/* Current Session Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          Última Sessão
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard icon={Globe} label="IP" value={profile?.last_ip_address?.toString() || null} />
          <InfoCard icon={Monitor} label="Navegador" value={profile?.last_browser} />
          <InfoCard icon={Cpu} label="Sistema Operacional" value={profile?.last_os} />
          <InfoCard icon={Smartphone} label="Resolução" value={profile?.last_screen_resolution} />
          <InfoCard icon={Fingerprint} label="Fingerprint" value={profile?.last_device_fingerprint?.slice(0, 16) + "..."} />
          <InfoCard icon={Clock} label="Timezone" value={profile?.last_timezone} />
          <InfoCard icon={Languages} label="Idioma" value={profile?.last_language} />
          <InfoCard 
            icon={Clock} 
            label="Último Login" 
            value={profile?.last_login_at ? formatDateTime(profile.last_login_at) : null} 
          />
        </div>
      </div>

      {/* Registration Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-500">
          <Fingerprint className="w-4 h-4" />
          Dados do Cadastro
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard icon={Globe} label="IP Cadastro" value={profile?.registration_ip_address?.toString() || null} variant="highlight" />
          <InfoCard icon={Monitor} label="Navegador Cadastro" value={profile?.registration_browser} variant="highlight" />
          <InfoCard icon={Cpu} label="OS Cadastro" value={profile?.registration_os} variant="highlight" />
          <InfoCard icon={MapPin} label="Localização" value={formatLocation()} variant="highlight" />
        </div>
      </div>

      {/* Audit Logs Preview */}
      {auditLogs && auditLogs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            Últimas Atividades de Segurança
          </h4>
          <div className="space-y-2">
            {auditLogs.slice(0, 3).map((log, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {log.browser_name || "Unknown"}
                  </Badge>
                  <span className="text-muted-foreground">{log.ip_address}</span>
                  {log.geo_city && (
                    <span className="text-muted-foreground">• {log.geo_city}, {log.geo_country}</span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
