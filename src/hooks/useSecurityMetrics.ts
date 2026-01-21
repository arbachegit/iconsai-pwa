import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityMetrics {
  totalDevices: number;
  verifiedDevices: number;
  blockedDevices: number;
  pendingVerification: number;
  totalViolations: number;
  activeBans: number;
  whitelistedCount: number;
  whitelistedIPs: number;
  whitelistedFingerprints: number;
  lastScanStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastScanDate: string | null;
  criticalFindings: number;
  warningFindings: number;
  passedFindings: number;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PWADevice {
  id: string;
  device_fingerprint: string;
  user_name: string | null;
  user_email: string | null;
  phone_number: string | null;
  is_verified: boolean;
  is_blocked: boolean;
  pwa_slugs: string[] | null;
  os_name: string | null;
  os_version: string | null;
  browser_name: string | null;
  browser_version: string | null;
  screen_width: number | null;
  screen_height: number | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export function useSecurityMetrics() {
  return useQuery({
    queryKey: ["security-metrics"],
    queryFn: async (): Promise<SecurityMetrics> => {
      const { data: pwaDevices } = await supabase
        .from("pwa_devices")
        .select("is_verified, is_blocked");
      
      const totalDevices = pwaDevices?.length || 0;
      const verifiedDevices = pwaDevices?.filter(d => d.is_verified).length || 0;
      const blockedDevices = pwaDevices?.filter(d => d.is_blocked).length || 0;
      const pendingVerification = pwaDevices?.filter(d => !d.is_verified && !d.is_blocked).length || 0;
      
      const { data: bannedDevices } = await supabase
        .from("banned_devices")
        .select("is_active")
        .eq("is_active", true);
      
      const activeBans = bannedDevices?.length || 0;
      
      const { data: whitelist } = await supabase
        .from("security_whitelist")
        .select("id, ip_address, device_fingerprint")
        .eq("is_active", true);
      
      const whitelistedCount = whitelist?.length || 0;
      const whitelistedIPs = whitelist?.filter(w => w.ip_address).length || 0;
      const whitelistedFingerprints = whitelist?.filter(w => w.device_fingerprint).length || 0;
      
      const { data: auditLogs } = await supabase
        .from("security_audit_log")
        .select("id")
        .gte("occurred_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const totalViolations = auditLogs?.length || 0;
      
      const { data: latestScan } = await supabase
        .from("security_scan_results")
        .select("*")
        .order("scan_timestamp", { ascending: false })
        .limit(1)
        .single();
      
      const lastScanStatus = (latestScan?.overall_status as 'healthy' | 'warning' | 'critical') || 'unknown';
      const lastScanDate = latestScan?.scan_timestamp || null;
      
      const findingsSummary = latestScan?.findings_summary as { critical?: number; warning?: number; passed?: number } | null;
      const criticalFindings = findingsSummary?.critical || 0;
      const warningFindings = findingsSummary?.warning || 0;
      const passedFindings = findingsSummary?.passed || 0;
      
      let overallScore = 100;
      overallScore -= criticalFindings * 20;
      overallScore -= warningFindings * 5;
      overallScore -= activeBans * 2;
      overallScore -= Math.min(totalViolations, 10) * 1;
      overallScore = Math.max(0, Math.min(100, overallScore));
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (overallScore >= 80) riskLevel = 'low';
      else if (overallScore >= 60) riskLevel = 'medium';
      else if (overallScore >= 40) riskLevel = 'high';
      else riskLevel = 'critical';
      
      return {
        totalDevices, verifiedDevices, blockedDevices, pendingVerification,
        totalViolations, activeBans, whitelistedCount, whitelistedIPs, whitelistedFingerprints,
        lastScanStatus, lastScanDate, criticalFindings, warningFindings, passedFindings,
        overallScore: Math.round(overallScore), riskLevel,
      };
    },
    refetchInterval: 60000,
  });
}

export function usePWADevices() {
  return useQuery({
    queryKey: ["pwa-devices"],
    queryFn: async (): Promise<PWADevice[]> => {
      const { data, error } = await supabase
        .from("pwa_devices")
        .select("id, device_fingerprint, user_name, user_email, phone_number, is_verified, is_blocked, pwa_slugs, os_name, os_version, browser_name, browser_version, screen_width, screen_height, verified_at, created_at, updated_at, last_active_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as PWADevice[];
    },
  });
}

export function useSecurityScans() {
  return useQuery({
    queryKey: ["security-scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_scan_results")
        .select("*")
        .order("scan_timestamp", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });
}
