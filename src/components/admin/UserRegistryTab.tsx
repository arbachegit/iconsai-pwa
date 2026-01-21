import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { UserModalityIcons } from "./UserModalityIcons";
import { UserAddressCollapsible } from "./UserAddressCollapsible";
import { formatDateTime } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { InvitesTab } from "./InvitesTab";
import { InviteConversionStats } from "./InviteConversionStats";
import { UserDeviceInfo } from "./UserDeviceInfo";
import { 
  Search, 
  Download, 
  Upload,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  Clock,
  FileSpreadsheet,
  Loader2,
  UserPlus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Globe,
  AlertTriangle,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Send,
  Ban,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  MessageSquare
} from "lucide-react";
import { InviteUserModalV2 as InviteUserModal } from "./InviteUserModalV2";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";

type RegistrationStatus = "pending" | "approved" | "rejected";
type AppRole = "user" | "admin" | "superadmin";

interface UserRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dns_origin: string | null;
  institution_work: string | null;
  institution_study: string | null;
  role: AppRole;
  status: RegistrationStatus;
  requested_at: string;
  approved_at: string | null;
  mass_import_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  // Access type fields
  has_platform_access?: boolean;
  has_app_access?: boolean;
  platform_registered_at?: string | null;
  pwa_registered_at?: string | null;
  // Address fields
  street?: string | null;
  street_number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  // Security fields
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  ban_type?: string | null;
  unbanned_at?: string | null;
}

interface CSVRow {
  [key: string]: string | undefined;
}

interface FieldMapping {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  institution_work: string;
  institution_study: string;
  role: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  emailStatus: 'valid' | 'invalid_format' | 'duplicate_db' | 'duplicate_csv';
  roleStatus: 'valid' | 'invalid';
  normalizedRole: AppRole;
}

interface ExistingEmail {
  email: string;
  source: 'auth' | 'registration' | 'both';
}

const REQUIRED_FIELDS = ["first_name", "last_name", "email"] as const;
const OPTIONAL_FIELDS = ["phone", "institution_work", "institution_study", "role"] as const;
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;
const VALID_ROLES: AppRole[] = ["user", "admin", "superadmin"];

const FIELD_LABELS: Record<string, string> = {
  first_name: "Nome",
  last_name: "Sobrenome",
  email: "Email",
  phone: "Telefone",
  institution_work: "Instituição Trabalho",
  institution_study: "Instituição Estudo",
  role: "Role",
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const STATUS_CONFIG: Record<RegistrationStatus, { color: string; label: string }> = {
  pending: { color: "bg-amber-500", label: "Pendente" },
  approved: { color: "bg-emerald-500", label: "Aprovado" },
  rejected: { color: "bg-red-500", label: "Reprovado" },
};

const ROLE_CONFIG: Record<AppRole, { color: string; label: string }> = {
  user: { color: "bg-blue-500", label: "Usuário" },
  admin: { color: "bg-purple-500", label: "Admin" },
  superadmin: { color: "bg-rose-500", label: "Super Admin" },
};

// CSV Template content
const CSV_TEMPLATE = `first_name,last_name,email,phone,institution_work,institution_study,role
João,Silva,joao.silva@email.com,+5511999999999,Hospital ABC,USP,user
Maria,Santos,maria.santos@email.com,+5521888888888,Clínica XYZ,UFRJ,admin
Carlos,Oliveira,carlos.oliveira@email.com,+5531777777777,Centro Médico,UFMG,superadmin`;

export const UserRegistryTab = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dnsFilter, setDnsFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [editModal, setEditModal] = useState<{ open: boolean; user: UserRegistration | null }>({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: UserRegistration | null }>({ open: false, user: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; user: UserRegistration | null; reason: string }>({ open: false, user: null, reason: "" });
  const [roleChangeModal, setRoleChangeModal] = useState<{ open: boolean; user: UserRegistration | null; newRole: AppRole }>({ open: false, user: null, newRole: "user" });
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [banModal, setBanModal] = useState<{ open: boolean; user: UserRegistration | null; reason: string }>({ open: false, user: null, reason: "" });
  const [resetPasswordModal, setResetPasswordModal] = useState<{ open: boolean; user: UserRegistration | null }>({ open: false, user: null });
  const [resendWelcomeModal, setResendWelcomeModal] = useState<{ open: boolean; user: UserRegistration | null; channel: 'email' | 'whatsapp' | 'both' }>({ open: false, user: null, channel: 'email' });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // CSV Import states
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    institution_work: "",
    institution_study: "",
    role: "",
  });
  const [csvImportStatus, setCsvImportStatus] = useState<"approved" | "pending">("pending");
  const [isImporting, setIsImporting] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [existingEmails, setExistingEmails] = useState<ExistingEmail[]>([]);
  const [isCheckingEmails, setIsCheckingEmails] = useState(false);

  // Fetch all registrations
  const { data: registrations, isLoading, refetch } = useQuery({
    queryKey: ["user-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_registrations")
        .select("*")
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as UserRegistration[];
    },
  });

  // Get unique DNS origins for filter
  const dnsOrigins = useMemo(() => {
    if (!registrations) return [];
    const origins = new Set(registrations.map(r => r.dns_origin).filter(Boolean));
    return Array.from(origins) as string[];
  }, [registrations]);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Handle sort toggle
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  // Filter registrations based on tab, search, role, and DNS
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    let filtered = registrations.filter(reg => {
      // Tab filter
      if (activeTab === "active" && reg.status !== "approved") return false;
      if (activeTab === "pending" && reg.status !== "pending") return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${reg.first_name} ${reg.last_name}`.toLowerCase();
        if (!fullName.includes(query) && !reg.email.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Role filter
      if (roleFilter !== "all" && reg.role !== roleFilter) return false;
      
      // DNS filter
      if (dnsFilter !== "all" && reg.dns_origin !== dnsFilter) return false;
      
      return true;
    });

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | Date;
        let bValue: string | Date;
        
        switch (sortConfig.key) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'date':
            aValue = new Date(a.requested_at);
            bValue = new Date(b.requested_at);
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [registrations, activeTab, searchQuery, roleFilter, dnsFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedRegistrations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(start, start + itemsPerPage);
  }, [filteredRegistrations, currentPage, itemsPerPage]);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_usuarios.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template CSV baixado!");
  };

  // Check existing emails when CSV is loaded
  const checkExistingEmails = useCallback(async (emails: string[]) => {
    if (emails.length === 0) return;
    
    setIsCheckingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-existing-emails', {
        body: { emails }
      });
      
      if (error) throw error;
      setExistingEmails(data.existingEmails || []);
    } catch (err) {
      logger.error('Error checking existing emails:', err);
      toast.error('Erro ao verificar emails existentes');
    } finally {
      setIsCheckingEmails(false);
    }
  }, []);

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (registration: UserRegistration) => {
      const { error } = await supabase.functions.invoke("approve-user-registration", {
        body: { registrationId: registration.id }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário aprovado com sucesso! Email de boas-vindas enviado.");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar usuário: ${error.message}`);
    }
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ registration, reason }: { registration: UserRegistration; reason: string }) => {
      const { error } = await supabase.functions.invoke("reject-user-registration", {
        body: { registrationId: registration.id, rejectionReason: reason }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário reprovado. Notificação enviada.");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setRejectModal({ open: false, user: null, reason: "" });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reprovar usuário: ${error.message}`);
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (user: Partial<UserRegistration> & { id: string }) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          street: user.street,
          street_number: user.street_number,
          complement: user.complement,
          neighborhood: user.neighborhood,
          city: user.city,
          state: user.state,
          zip_code: user.zip_code,
          has_platform_access: user.has_platform_access,
          has_app_access: user.has_app_access,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setEditModal({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_registrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setDeleteModal({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir registro: ${error.message}`);
    }
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({ role: newRole })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role alterada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setRoleChangeModal({ open: false, user: null, newRole: "user" });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar role: ${error.message}`);
    }
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason,
          ban_type: "manual",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário banido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setBanModal({ open: false, user: null, reason: "" });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao banir usuário: ${error.message}`);
    }
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({
          is_banned: false,
          unbanned_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário desbanido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desbanir usuário: ${error.message}`);
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (user: UserRegistration) => {
      const { error } = await supabase.functions.invoke("reset-password-admin", {
        body: { 
          userId: user.id, 
          userEmail: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          reason: "Reset solicitado pelo Super Administrador"
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email de reset de senha enviado!");
      setResetPasswordModal({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar senha: ${error.message}`);
    }
  });

  // Resend welcome mutation with channel support
  const resendWelcomeMutation = useMutation({
    mutationFn: async ({ user, channel }: { user: UserRegistration; channel: 'email' | 'whatsapp' | 'both' }) => {
      const { error, data } = await supabase.functions.invoke("resend-welcome-email", {
        body: { registrationId: user.id, channel }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const channels = data?.channels?.join(' e ') || 'email';
      toast.success(`Boas-vindas reenviado via ${channels}!`);
      setResendWelcomeModal({ open: false, user: null, channel: 'email' });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reenviar: ${error.message}`);
    }
  });

  // Toggle user expansion
  const toggleUserExpansion = (id: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Auto-detect field mapping from CSV headers
  const autoDetectMapping = useCallback((headers: string[]) => {
    const mapping: FieldMapping = {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      institution_work: "",
      institution_study: "",
      role: "",
    };

    const patterns: Record<keyof FieldMapping, RegExp[]> = {
      first_name: [/^(first_?name|nome|primeiro_?nome)$/i],
      last_name: [/^(last_?name|sobrenome|último_?nome|surname)$/i],
      email: [/^(email|e-?mail|mail)$/i],
      phone: [/^(phone|telefone|tel|celular|mobile)$/i],
      institution_work: [/^(institution_?work|instituição_?trabalho|empresa|company|work)$/i],
      institution_study: [/^(institution_?study|instituição_?estudo|universidade|university|study)$/i],
      role: [/^(role|papel|função)$/i],
    };

    headers.forEach(header => {
      (Object.keys(patterns) as (keyof FieldMapping)[]).forEach(field => {
        if (!mapping[field] && patterns[field].some(pattern => pattern.test(header))) {
          mapping[field] = header;
        }
      });
    });

    return mapping;
  }, []);

  // Get mapped value from row
  const getMappedValue = useCallback((row: CSVRow, field: keyof FieldMapping): string => {
    const column = fieldMapping[field];
    return column ? (row[column] || "").trim() : "";
  }, [fieldMapping]);

  // Find CSV internal duplicates
  const csvEmailDuplicates = useMemo(() => {
    const emailCounts: Record<string, number> = {};
    csvData.forEach(row => {
      const email = getMappedValue(row, "email").toLowerCase();
      if (email) {
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    });
    return Object.entries(emailCounts)
      .filter(([_, count]) => count > 1)
      .map(([email]) => email);
  }, [csvData, getMappedValue]);

  // Validate row based on mapping
  const validateRow = useCallback((row: CSVRow): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let emailStatus: ValidationResult['emailStatus'] = 'valid';
    let roleStatus: ValidationResult['roleStatus'] = 'valid';
    let normalizedRole: AppRole = 'user';

    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      const csvColumn = fieldMapping[field];
      if (!csvColumn || !row[csvColumn]?.trim()) {
        errors.push(`${FIELD_LABELS[field]} é obrigatório`);
      }
    });

    // Validate email format
    const email = getMappedValue(row, "email").toLowerCase();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push("Formato de email inválido");
        emailStatus = 'invalid_format';
      } else {
        // Check for duplicate in database
        const dbDuplicate = existingEmails.find(e => e.email === email);
        if (dbDuplicate) {
          errors.push("Email já cadastrado no sistema");
          emailStatus = 'duplicate_db';
        } else if (csvEmailDuplicates.includes(email)) {
          errors.push("Email duplicado no CSV");
          emailStatus = 'duplicate_csv';
        }
      }
    }

    // Validate role
    const roleValue = getMappedValue(row, "role").toLowerCase();
    if (roleValue) {
      if (VALID_ROLES.includes(roleValue as AppRole)) {
        normalizedRole = roleValue as AppRole;
      } else {
        warnings.push(`Role "${roleValue}" inválida, usando "user"`);
        roleStatus = 'invalid';
      }
    }

    // Check for empty optional fields (warnings only)
    OPTIONAL_FIELDS.forEach(field => {
      if (field !== "role") {
        const csvColumn = fieldMapping[field];
        if (!csvColumn || !row[csvColumn]?.trim()) {
          warnings.push(`${FIELD_LABELS[field]} não mapeado`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      emailStatus,
      roleStatus,
      normalizedRole,
    };
  }, [fieldMapping, getMappedValue, existingEmails, csvEmailDuplicates]);

  // CSV Drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setCsvData(results.data);
        
        const detectedMapping = autoDetectMapping(headers);
        setFieldMapping(detectedMapping);
        setShowFieldMapping(true);
        
        // Extract emails for duplicate checking
        const emailColumn = detectedMapping.email;
        if (emailColumn) {
          const emails = results.data
            .map(row => row[emailColumn]?.trim().toLowerCase())
            .filter(Boolean) as string[];
          await checkExistingEmails(emails);
        }
        
        toast.success(`${results.data.length} registros encontrados no CSV`);
      },
      error: (error) => {
        toast.error(`Erro ao ler CSV: ${error.message}`);
      }
    });
  }, [autoDetectMapping, checkExistingEmails]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  // Re-check emails when mapping changes
  useEffect(() => {
    if (csvData.length > 0 && fieldMapping.email) {
      const emails = csvData
        .map(row => getMappedValue(row, "email").toLowerCase())
        .filter(Boolean);
      if (emails.length > 0) {
        checkExistingEmails(emails);
      }
    }
  }, [fieldMapping.email, csvData, getMappedValue, checkExistingEmails]);

  // Validation summary
  const validationSummary = useMemo(() => {
    if (csvData.length === 0) return { valid: 0, invalid: 0, invalidFormat: 0, duplicateDb: 0, duplicateCsv: 0, invalidRole: 0, total: 0 };
    
    let valid = 0;
    let invalid = 0;
    let invalidFormat = 0;
    let duplicateDb = 0;
    let duplicateCsv = 0;
    let invalidRole = 0;
    
    csvData.forEach(row => {
      const result = validateRow(row);
      if (result.isValid) valid++;
      else {
        invalid++;
        if (result.emailStatus === 'invalid_format') invalidFormat++;
        if (result.emailStatus === 'duplicate_db') duplicateDb++;
        if (result.emailStatus === 'duplicate_csv') duplicateCsv++;
      }
      if (result.roleStatus === 'invalid') invalidRole++;
    });
    
    return { valid, invalid, invalidFormat, duplicateDb, duplicateCsv, invalidRole, total: csvData.length };
  }, [csvData, validateRow]);

  // Import CSV mutation
  const importCsvMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);
      
      const validRows = csvData.filter(row => validateRow(row).isValid);
      
      const registrationsToInsert = validRows.map(row => {
        const validation = validateRow(row);
        return {
          first_name: getMappedValue(row, "first_name"),
          last_name: getMappedValue(row, "last_name"),
          email: getMappedValue(row, "email").toLowerCase(),
          phone: getMappedValue(row, "phone") || null,
          institution_work: getMappedValue(row, "institution_work") || null,
          institution_study: getMappedValue(row, "institution_study") || null,
          role: validation.normalizedRole,
          status: csvImportStatus,
          mass_import_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from("user_registrations")
        .insert(registrationsToInsert);
      
      if (error) throw error;
      return registrationsToInsert.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} usuários importados com sucesso!`);
      setCsvData([]);
      setCsvHeaders([]);
      setShowFieldMapping(false);
      setExistingEmails([]);
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      


    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
    onSettled: () => {
      setIsImporting(false);
    }
  });

  const renderStatusBadge = (status: RegistrationStatus) => {
    const config = STATUS_CONFIG[status];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const renderRoleBadge = (role: AppRole) => {
    const config = ROLE_CONFIG[role];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  // Render email cell with validation highlighting
  const renderEmailCell = (row: CSVRow) => {
    const email = getMappedValue(row, "email");
    const validation = validateRow(row);
    
    if (!email) {
      return <span className="text-red-400 text-xs">Vazio</span>;
    }

    let bgClass = "";
    let textClass = "";
    let badge = null;

    switch (validation.emailStatus) {
      case 'invalid_format':
        bgClass = "bg-red-500/20";
        textClass = "text-red-400";
        badge = (
          <Badge variant="outline" className="ml-2 text-[10px] border-red-500/50 text-red-400">
            <AlertCircle className="w-2.5 h-2.5 mr-1" />
            Inválido
          </Badge>
        );
        break;
      case 'duplicate_db':
        bgClass = "bg-amber-500/20";
        textClass = "text-amber-400";
        badge = (
          <Badge variant="outline" className="ml-2 text-[10px] border-amber-500/50 text-amber-400">
            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
            Já cadastrado
          </Badge>
        );
        break;
      case 'duplicate_csv':
        bgClass = "bg-purple-500/20";
        textClass = "text-purple-400";
        badge = (
          <Badge variant="outline" className="ml-2 text-[10px] border-purple-500/50 text-purple-400">
            <Copy className="w-2.5 h-2.5 mr-1" />
            Duplicado
          </Badge>
        );
        break;
    }

    return (
      <div className={`flex items-center px-1 py-0.5 rounded ${bgClass}`}>
        <span className={`text-sm ${textClass}`}>{email}</span>
        {badge}
      </div>
    );
  };

  // Render role cell with validation highlighting
  const renderCsvRoleCell = (row: CSVRow) => {
    const validation = validateRow(row);
    const rawRole = getMappedValue(row, "role");
    
    const roleConfig = ROLE_CONFIG[validation.normalizedRole];
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Badge className={`${roleConfig.color} text-white text-xs`}>
                {roleConfig.label}
              </Badge>
              {validation.roleStatus === 'invalid' && (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              )}
            </div>
          </TooltipTrigger>
          {validation.roleStatus === 'invalid' && (
            <TooltipContent>
              <p className="text-xs">Role "{rawRole}" inválida, convertida para "user"</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const pendingCount = registrations?.filter(r => r.status === "pending").length || 0;
  const activeCount = registrations?.filter(r => r.status === "approved").length || 0;

  const clearCsvData = () => {
    setCsvData([]);
    setCsvHeaders([]);
    setShowFieldMapping(false);
    setExistingEmails([]);
    setFieldMapping({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      institution_work: "",
      institution_study: "",
      role: "",
    });
  };

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Cadastro de Usuários"
        level="h1"
        tooltipText="Gerenciamento completo de usuários do sistema"
        infoContent={
          <div className="space-y-3">
            <p className="text-sm">Sistema de gestão de usuários com aprovação e importação em massa.</p>
            <ul className="space-y-1 text-sm">
              <li><span className="text-emerald-400 font-semibold">Usuários Ativos:</span> CRUD completo de usuários aprovados</li>
              <li><span className="text-amber-400 font-semibold">Lista de Aprovação:</span> Aprovar ou reprovar solicitações</li>
              <li><span className="text-blue-400 font-semibold">Importação CSV:</span> Upload em massa de usuários</li>
            </ul>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Roles disponíveis: <span className="text-blue-400">user</span>, <span className="text-purple-400">admin</span>, <span className="text-rose-400">superadmin</span>
              </p>
            </div>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <TabsList className="grid grid-cols-4 flex-1">
            <TabsTrigger value="active" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários Ativos
              <Badge className="ml-1 bg-fuchsia-300 text-fuchsia-900">{activeCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Lista de Aprovação
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white ml-1">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2 relative">
              <Send className="w-4 h-4" />
              Convites
              {/* Inline conversion indicator */}
              <InviteConversionStats />
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Importação
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Invites */}
        <TabsContent value="invites" className="space-y-4">
          <InvitesTab />
        </TabsContent>

        {/* Tab: Active Users / Pending Approvals */}
        {(activeTab === "active" || activeTab === "pending") && (
          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Role Filter */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Roles</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* DNS Filter */}
                  <Select value={dnsFilter} onValueChange={setDnsFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="DNS Origin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Domínios</SelectItem>
                      {dnsOrigins.map(dns => (
                        <SelectItem key={dns} value={dns}>@{dns}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Items per page */}
                  <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Refresh */}
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  
                  {/* Invite User */}
                  <Button onClick={() => setInviteModalOpen(true)} className="gap-2">
                    <Send className="w-4 h-4" />
                    Convidar Usuário
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : paginatedRegistrations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:text-foreground transition-colors text-center"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Nome
                              {sortConfig?.key === 'name' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:text-foreground transition-colors text-center"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Email
                              {sortConfig?.key === 'email' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead className="text-center">Telefone</TableHead>
                          <TableHead className="text-center">Acesso</TableHead>
                          <TableHead className="text-center">DNS</TableHead>
                          <TableHead className="text-center">Role</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Banimento</TableHead>
                          <TableHead 
                            className="cursor-pointer hover:text-foreground transition-colors text-center"
                            onClick={() => handleSort('date')}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Data
                              {sortConfig?.key === 'date' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                            </div>
                          </TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRegistrations.map((reg) => {
                          const isExpanded = expandedUsers.has(reg.id);
                          const hasAddress = reg.street || reg.city || reg.zip_code;
                          return (
                            <>
                              <TableRow key={reg.id} className="group">
                                <TableCell className="font-medium text-center">
                                  <div className="flex items-center gap-2 justify-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => toggleUserExpansion(reg.id)}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </Button>
                                    <span>{reg.first_name} {reg.last_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{reg.email}</TableCell>
                                <TableCell className="text-center">{reg.phone || "-"}</TableCell>
                                <TableCell className="text-center">
                                  <UserModalityIcons
                                    userId={reg.id}
                                    userName={`${reg.first_name} ${reg.last_name}`}
                                    userEmail={reg.email}
                                    userPhone={reg.phone || undefined}
                                    hasPlatformAccess={reg.has_platform_access ?? true}
                                    hasAppAccess={reg.has_app_access ?? false}
                                    platformRegistered={!!reg.approved_at}
                                    appRegistered={!!reg.pwa_registered_at}
                                    onInviteSent={() => refetch()}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {reg.dns_origin && (
                                    <Badge variant="outline" className="gap-1">
                                      <Globe className="w-3 h-3" />
                                      @{reg.dns_origin}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">{renderRoleBadge(reg.role)}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={reg.status === "approved"}
                                      className={reg.status === "approved"
                                        ? "data-[state=checked]:bg-emerald-500" 
                                        : "data-[state=unchecked]:bg-red-500"
                                      }
                                      disabled
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex justify-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <Switch
                                              checked={reg.is_banned || false}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  setBanModal({ open: true, user: reg, reason: "" });
                                                } else {
                                                  unbanUserMutation.mutate(reg.id);
                                                }
                                              }}
                                              disabled={banUserMutation.isPending || unbanUserMutation.isPending}
                                              className={reg.is_banned 
                                                ? "data-[state=checked]:bg-red-500" 
                                                : "data-[state=unchecked]:bg-emerald-500"
                                              }
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{reg.is_banned ? (reg.ban_reason || "Usuário banido") : "Usuário ativo"}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                  {formatDateTime(reg.requested_at)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {activeTab === "pending" ? (
                                      <>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                                onClick={() => approveMutation.mutate(reg)}
                                                disabled={approveMutation.isPending}
                                              >
                                                <Check className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Aprovar cadastro</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                onClick={() => setRejectModal({ open: true, user: reg, reason: "" })}
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Rejeitar cadastro</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </>
                                    ) : (
                                      <>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditModal({ open: true, user: reg })}
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Editar usuário</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        {/* Resend welcome email button - only for approved, non-banned users */}
                                        {!reg.is_banned && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                  onClick={() => setResendWelcomeModal({ open: true, user: reg, channel: reg.phone ? 'both' : 'email' })}
                                                  disabled={resendWelcomeMutation.isPending}
                                                >
                                                  <Send className="w-4 h-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>Reenviar email de boas-vindas</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setRoleChangeModal({ open: true, user: reg, newRole: reg.role })}
                                              >
                                                <Users className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Alterar permissões</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                onClick={() => setDeleteModal({ open: true, user: reg })}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Excluir registro</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {/* Expanded Address Row */}
                              {isExpanded && (
                                <TableRow key={`${reg.id}-address`} className="bg-muted/30">
                                  <TableCell colSpan={10} className="py-3">
                                    <div className="flex items-start gap-6 px-4">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Building2 className="w-4 h-4" />
                                        <span className="font-medium">Endereço:</span>
                                      </div>
                                      {hasAddress ? (
                                        <div className="text-sm space-y-1">
                                          {(reg.street || reg.street_number) && (
                                            <p>
                                              {reg.street}{reg.street_number && `, ${reg.street_number}`}
                                              {reg.complement && ` - ${reg.complement}`}
                                            </p>
                                          )}
                                          {(reg.neighborhood || reg.city || reg.state) && (
                                            <p className="text-muted-foreground">
                                              {[reg.neighborhood, reg.city, reg.state].filter(Boolean).join(' - ')}
                                            </p>
                                          )}
                                          {reg.zip_code && (
                                            <p className="text-muted-foreground text-xs">CEP: {reg.zip_code}</p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-muted-foreground italic">
                                            Endereço não cadastrado
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} de {filteredRegistrations.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          Página {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: CSV Import */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Importação em Massa via CSV
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadCsvTemplate} className="gap-2">
                  <Download className="w-4 h-4" />
                  Baixar Template CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-primary font-medium">Solte o arquivo aqui...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Arraste e solte um arquivo CSV aqui, ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Colunas esperadas: first_name, last_name, email, phone, institution_work, institution_study, role
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Roles válidas: <span className="text-blue-400">user</span>, <span className="text-purple-400">admin</span>, <span className="text-rose-400">superadmin</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Field Mapping Section */}
              {showFieldMapping && csvHeaders.length > 0 && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                      Mapeamento de Colunas
                      {isCheckingEmails && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Associe cada coluna do CSV aos campos do sistema. Campos obrigatórios marcados com *
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {ALL_FIELDS.map((field) => {
                        const isRequired = REQUIRED_FIELDS.includes(field as typeof REQUIRED_FIELDS[number]);
                        const isMapped = !!fieldMapping[field];
                        
                        return (
                          <div key={field} className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-sm">
                              {FIELD_LABELS[field]}
                              {isRequired && <span className="text-red-400">*</span>}
                              {isMapped && <Check className="w-3 h-3 text-emerald-400" />}
                            </Label>
                            <Select
                              value={fieldMapping[field] || ""}
                              onValueChange={(value) => setFieldMapping(prev => ({
                                ...prev,
                                [field]: value === "_none_" ? "" : value
                              }))}
                            >
                              <SelectTrigger className={`text-xs ${!isMapped && isRequired ? "border-red-500/50" : ""}`}>
                                <SelectValue placeholder="Selecionar coluna..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none_">-- Não mapear --</SelectItem>
                                {csvHeaders.map(header => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Detected Columns Info */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">Colunas detectadas:</span>
                      {csvHeaders.map(header => (
                        <Badge key={header} variant="outline" className="text-xs">
                          {header}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validation Summary & Import Options */}
              {csvData.length > 0 && (
                <div className="space-y-4">
                  {/* Validation Summary */}
                  <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${validationSummary.valid > 0 ? "bg-emerald-500" : "bg-muted"}`} />
                      <span className="text-sm">
                        <span className="font-semibold text-emerald-400">{validationSummary.valid}</span> válidos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${validationSummary.invalid > 0 ? "bg-red-500" : "bg-muted"}`} />
                      <span className="text-sm">
                        <span className="font-semibold text-red-400">{validationSummary.invalid}</span> inválidos
                      </span>
                    </div>
                    {validationSummary.invalidFormat > 0 && (
                      <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {validationSummary.invalidFormat} email inválido
                      </Badge>
                    )}
                    {validationSummary.duplicateDb > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {validationSummary.duplicateDb} já cadastrado
                      </Badge>
                    )}
                    {validationSummary.duplicateCsv > 0 && (
                      <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                        <Copy className="w-3 h-3 mr-1" />
                        {validationSummary.duplicateCsv} duplicado no CSV
                      </Badge>
                    )}
                    {validationSummary.invalidRole > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {validationSummary.invalidRole} role inválida
                      </Badge>
                    )}
                    <div className="flex-1" />
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Importar como:</Label>
                      <Select value={csvImportStatus} onValueChange={(v) => setCsvImportStatus(v as "pending" | "approved")}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pendente
                            </div>
                          </SelectItem>
                          <SelectItem value="approved">
                            <div className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-emerald-400" />
                              Aprovado
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      Preview dos Dados
                      <Badge variant="secondary">{csvData.length} registros</Badge>
                    </h3>
                    <div className="max-h-[350px] overflow-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Status</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Trabalho</TableHead>
                            <TableHead>Estudo</TableHead>
                            <TableHead>Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.slice(0, 20).map((row, idx) => {
                            const validation = validateRow(row);
                            return (
                              <TableRow 
                                key={idx} 
                                className={validation.isValid ? "" : "bg-red-500/5"}
                              >
                                <TableCell>
                                  {validation.isValid ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <AlertCircle className="w-4 h-4 text-red-500 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-[250px]">
                                          {validation.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-400">{err}</p>
                                          ))}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {getMappedValue(row, "first_name")} {getMappedValue(row, "last_name")}
                                </TableCell>
                                <TableCell>
                                  {renderEmailCell(row)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {getMappedValue(row, "phone") || "-"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {getMappedValue(row, "institution_work") || "-"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {getMappedValue(row, "institution_study") || "-"}
                                </TableCell>
                                <TableCell>
                                  {renderCsvRoleCell(row)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {csvData.length > 20 && (
                        <p className="text-center py-2 text-sm text-muted-foreground border-t">
                          ... e mais {csvData.length - 20} registros
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      onClick={() => importCsvMutation.mutate()}
                      disabled={isImporting || validationSummary.valid === 0}
                      className="gap-2"
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      Importar {validationSummary.valid} Registros Válidos
                    </Button>
                    <Button variant="outline" onClick={clearCsvData}>
                      Limpar
                    </Button>
                    {validationSummary.invalid > 0 && (
                      <p className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {validationSummary.invalid} registro(s) inválido(s) serão ignorados
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => !open && setEditModal({ open: false, user: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editModal.user && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editModal.user.first_name}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, first_name: e.target.value } : null
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input
                    value={editModal.user.last_name}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, last_name: e.target.value } : null
                    }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editModal.user.email}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, email: e.target.value } : null
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editModal.user.phone || ""}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, phone: e.target.value } : null
                    }))}
                  />
                </div>
              </div>

              {/* Access Flags */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-medium">Acesso</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={editModal.user.has_platform_access ?? true}
                      onCheckedChange={(checked) => setEditModal(prev => ({
                        ...prev,
                        user: prev.user ? { ...prev.user, has_platform_access: checked } : null
                      }))}
                    />
                    <span className="text-sm">Plataforma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={editModal.user.has_app_access ?? false}
                      onCheckedChange={(checked) => setEditModal(prev => ({
                        ...prev,
                        user: prev.user ? { ...prev.user, has_app_access: checked } : null
                      }))}
                    />
                    <span className="text-sm">APP</span>
                  </label>
                </div>
              </div>

              {/* Address Section */}
              <Collapsible className="pt-2 border-t">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full justify-between py-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Endereço
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs">Rua</Label>
                      <Input
                        value={editModal.user.street || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, street: e.target.value } : null
                        }))}
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Número</Label>
                      <Input
                        value={editModal.user.street_number || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, street_number: e.target.value } : null
                        }))}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Complemento</Label>
                      <Input
                        value={editModal.user.complement || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, complement: e.target.value } : null
                        }))}
                        placeholder="Apto 101"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Bairro</Label>
                      <Input
                        value={editModal.user.neighborhood || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, neighborhood: e.target.value } : null
                        }))}
                        placeholder="Centro"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-2">
                      <Label className="text-xs">CEP</Label>
                      <Input
                        value={editModal.user.zip_code || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, zip_code: e.target.value } : null
                        }))}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Cidade</Label>
                      <Input
                        value={editModal.user.city || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, city: e.target.value } : null
                        }))}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Estado</Label>
                      <Input
                        value={editModal.user.state || ""}
                        onChange={(e) => setEditModal(prev => ({
                          ...prev,
                          user: prev.user ? { ...prev.user, state: e.target.value } : null
                        }))}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button
              onClick={() => editModal.user && updateMutation.mutate(editModal.user)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o registro de {deleteModal.user?.first_name} {deleteModal.user?.last_name}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteModal.user && deleteMutation.mutate(deleteModal.user.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, user: null, reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <X className="w-5 h-5" />
              Reprovar Cadastro
            </DialogTitle>
            <DialogDescription>
              Reprovar o cadastro de {rejectModal.user?.first_name} {rejectModal.user?.last_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Reprovação (opcional)</Label>
              <Textarea
                placeholder="Informe o motivo da reprovação..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, user: null, reason: "" })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectModal.user && rejectMutation.mutate({ 
                registration: rejectModal.user, 
                reason: rejectModal.reason 
              })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={roleChangeModal.open} onOpenChange={(open) => !open && setRoleChangeModal({ open: false, user: null, newRole: "user" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
            <DialogDescription>
              Alterar a role de {roleChangeModal.user?.first_name} {roleChangeModal.user?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Role</Label>
              <Select
                value={roleChangeModal.newRole}
                onValueChange={(v) => setRoleChangeModal(prev => ({ ...prev, newRole: v as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeModal({ open: false, user: null, newRole: "user" })}>
              Cancelar
            </Button>
            <Button
              onClick={() => roleChangeModal.user && changeRoleMutation.mutate({
                id: roleChangeModal.user.id,
                newRole: roleChangeModal.newRole
              })}
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Modal */}
      <InviteUserModal 
        open={inviteModalOpen} 
        onOpenChange={setInviteModalOpen}
        onSuccess={() => refetch()}
      />

      {/* Ban User Modal */}
      <Dialog open={banModal.open} onOpenChange={(open) => !open && setBanModal({ open: false, user: null, reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Ban className="w-5 h-5" />
              Banir Usuário
            </DialogTitle>
            <DialogDescription>
              Banir <span className="font-semibold">{banModal.user?.email}</span>. Esta ação pode ser revertida por um Super Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo do Banimento *</Label>
              <Textarea
                value={banModal.reason}
                onChange={(e) => setBanModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Descreva o motivo do banimento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanModal({ open: false, user: null, reason: "" })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => banModal.user && banUserMutation.mutate({
                id: banModal.user.id,
                reason: banModal.reason || "Banimento manual pelo administrador"
              })}
              disabled={banUserMutation.isPending}
            >
              {banUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Banir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={resetPasswordModal.open} onOpenChange={(open) => !open && setResetPasswordModal({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <KeyRound className="w-5 h-5" />
              Resetar Senha
            </DialogTitle>
            <DialogDescription>
              Enviar código de reset de senha para <span className="font-semibold">{resetPasswordModal.user?.email}</span>?
              O usuário receberá um email informando que a senha foi resetada pelo Super Administrador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button
              onClick={() => resetPasswordModal.user && resetPasswordMutation.mutate(resetPasswordModal.user)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Welcome Modal with Channel Selection */}
      <Dialog open={resendWelcomeModal.open} onOpenChange={(open) => !open && setResendWelcomeModal({ open: false, user: null, channel: 'email' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-500">
              <Send className="w-5 h-5" />
              Reenviar Boas-Vindas
            </DialogTitle>
            <DialogDescription>
              Reenviar mensagem de boas-vindas para <span className="font-semibold">{resendWelcomeModal.user?.first_name} {resendWelcomeModal.user?.last_name}</span>?
              <br />
              O usuário receberá um novo link para definir sua senha.
            </DialogDescription>
          </DialogHeader>
          
          {/* Channel Selection */}
          <div className="space-y-3">
            <Label>Enviar via:</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={resendWelcomeModal.channel === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setResendWelcomeModal(prev => ({ ...prev, channel: 'email' }))}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Email
              </Button>
              {resendWelcomeModal.user?.phone && (
                <>
                  <Button
                    variant={resendWelcomeModal.channel === 'whatsapp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResendWelcomeModal(prev => ({ ...prev, channel: 'whatsapp' }))}
                    className="gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant={resendWelcomeModal.channel === 'both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setResendWelcomeModal(prev => ({ ...prev, channel: 'both' }))}
                    className="gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    +
                    <MessageSquare className="w-4 h-4" />
                    Ambos
                  </Button>
                </>
              )}
            </div>
            {!resendWelcomeModal.user?.phone && (
              <p className="text-xs text-muted-foreground">
                Este usuário não possui telefone cadastrado. Será enviado apenas por email.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResendWelcomeModal({ open: false, user: null, channel: 'email' })}>
              Cancelar
            </Button>
            <Button
              onClick={() => resendWelcomeModal.user && resendWelcomeMutation.mutate({ user: resendWelcomeModal.user, channel: resendWelcomeModal.channel })}
              disabled={resendWelcomeMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {resendWelcomeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reenviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRegistryTab;
