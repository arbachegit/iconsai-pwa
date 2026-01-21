import { 
  Database, 
  Users, 
  Heart, 
  GraduationCap, 
  Landmark, 
  Globe, 
  Cloud, 
  FileText,
  BarChart3,
  Building2,
  Stethoscope,
  BookOpen,
  Wallet,
  Radio,
  Thermometer,
  TrendingUp,
  AlertTriangle,
  Target,
  Map,
  DollarSign,
  LayoutDashboard,
  Vote,
  type LucideIcon
} from "lucide-react";

// Domain types based on Brazilian government data categories
export type DomainType = 
  | "transparency" 
  | "social" 
  | "health" 
  | "education" 
  | "finance" 
  | "infrastructure" 
  | "climate" 
  | "population";

export type ZoneType = "sources" | "content" | "indicators" | "knowledge" | "delivery";

export interface DataSource {
  id: string;
  name: string;
  domain: DomainType;
  icon: LucideIcon;
}

export interface ApiContent {
  id: string;
  sourceId: string;
  content: string;
}

export interface MunicipalIndicator {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface KnowledgeItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface DeliveryPanel {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  icon: LucideIcon;
}

export interface DiagramZone {
  id: ZoneType;
  label: string;
  color: string;
  glowColor: string;
}

// Colors by domain
export const domainColors: Record<DomainType, { bg: string; text: string; border: string }> = {
  transparency: { bg: "#1e40af", text: "#93c5fd", border: "#3b82f6" },
  social: { bg: "#7c3aed", text: "#c4b5fd", border: "#8b5cf6" },
  health: { bg: "#dc2626", text: "#fca5a5", border: "#ef4444" },
  education: { bg: "#ea580c", text: "#fdba74", border: "#f97316" },
  finance: { bg: "#16a34a", text: "#86efac", border: "#22c55e" },
  infrastructure: { bg: "#0891b2", text: "#67e8f9", border: "#06b6d4" },
  climate: { bg: "#0d9488", text: "#5eead4", border: "#14b8a6" },
  population: { bg: "#4f46e5", text: "#a5b4fc", border: "#6366f1" },
};

// Flow zones
export const zones: DiagramZone[] = [
  { id: "sources", label: "Government Sources", color: "#1e3a5f", glowColor: "#3b82f6" },
  { id: "content", label: "API Content", color: "#2d4a6f", glowColor: "#60a5fa" },
  { id: "indicators", label: "City Indicators", color: "#0891b2", glowColor: "#22d3ee" },
  { id: "knowledge", label: "Generated Knowledge", color: "#7c3aed", glowColor: "#a78bfa" },
  { id: "delivery", label: "Management Panels", color: "#059669", glowColor: "#34d399" },
];

// GOVERNMENT DATA SOURCES (organized by domain)
export const dataSources: DataSource[] = [
  // Transparency
  { id: "portal-transparencia", name: "Transparency Portal", domain: "transparency", icon: FileText },
  { id: "cgu", name: "CGU", domain: "transparency", icon: FileText },
  
  // Social
  { id: "mds-cadunico", name: "MDS Single Registry", domain: "social", icon: Users },
  { id: "suas", name: "SUAS", domain: "social", icon: Users },
  { id: "bolsa-familia", name: "Bolsa Família", domain: "social", icon: Wallet },
  
  // Health
  { id: "datasus", name: "DATASUS", domain: "health", icon: Stethoscope },
  { id: "cnes", name: "CNES", domain: "health", icon: Building2 },
  { id: "sinan", name: "SINAN", domain: "health", icon: Heart },
  
  // Education
  { id: "inep", name: "INEP", domain: "education", icon: GraduationCap },
  { id: "censo-escolar", name: "School Census", domain: "education", icon: BookOpen },
  
  // Public Finance
  { id: "tesouro", name: "National Treasury", domain: "finance", icon: Landmark },
  { id: "siafi", name: "SIAFI", domain: "finance", icon: Landmark },
  { id: "siope", name: "SIOPE", domain: "finance", icon: DollarSign },
  
  // Infrastructure
  { id: "anatel", name: "ANATEL", domain: "infrastructure", icon: Radio },
  { id: "comercio-exterior", name: "Foreign Trade", domain: "infrastructure", icon: Globe },
  
  // Climate
  { id: "inmet", name: "INMET", domain: "climate", icon: Thermometer },
  { id: "dados-climaticos", name: "Climate Data", domain: "climate", icon: Cloud },
  
  // Population
  { id: "ibge", name: "IBGE", domain: "population", icon: Database },
  { id: "censo-demografico", name: "Demographic Census", domain: "population", icon: Users },
];

// SPECIFIC CONTENT FROM EACH API
export const apiContents: ApiContent[] = [
  { id: "api-1", sourceId: "datasus", content: "Health Facility Registry" },
  { id: "api-2", sourceId: "datasus", content: "Morbidity by Region" },
  { id: "api-3", sourceId: "datasus", content: "Hospitalization System (SIH)" },
  { id: "api-4", sourceId: "datasus", content: "Mortality System (SIM)" },
  { id: "api-5", sourceId: "ibge", content: "Municipal Indicators" },
  { id: "api-6", sourceId: "ibge", content: "Municipal GDP" },
  { id: "api-7", sourceId: "ibge", content: "Population by Age Group" },
  { id: "api-8", sourceId: "inep", content: "Enrollment by Grade/Year" },
  { id: "api-9", sourceId: "inep", content: "School Infrastructure" },
  { id: "api-10", sourceId: "inep", content: "IDEB by School" },
  { id: "api-11", sourceId: "mds-cadunico", content: "Registered Families" },
  { id: "api-12", sourceId: "mds-cadunico", content: "Vulnerability Profile" },
  { id: "api-13", sourceId: "tesouro", content: "Municipal Revenues" },
  { id: "api-14", sourceId: "tesouro", content: "Expenses by Function" },
  { id: "api-15", sourceId: "portal-transparencia", content: "Contracts and Agreements" },
  { id: "api-16", sourceId: "portal-transparencia", content: "Public Servants" },
  { id: "api-17", sourceId: "cnes", content: "Available Beds" },
  { id: "api-18", sourceId: "cnes", content: "Health Professionals" },
  { id: "api-19", sourceId: "suas", content: "Active CRAS/CREAS" },
  { id: "api-20", sourceId: "suas", content: "Social Services" },
];

// GENERATED MUNICIPAL INDICATORS
export const municipalIndicators: MunicipalIndicator[] = [
  { id: "ind-saude", name: "Municipal Health Index", description: "Combination of mortality, morbidity, and access to health services", icon: Heart },
  { id: "ind-educacao", name: "Educational Quality Index", description: "IDEB, school infrastructure, and completion rate", icon: GraduationCap },
  { id: "ind-pobreza", name: "Social Vulnerability Index", description: "Families in poverty and access to social programs", icon: Users },
  { id: "ind-saneamento", name: "Sanitation Index", description: "Water, sewage, and waste collection coverage", icon: Building2 },
  { id: "ind-emprego", name: "Formal Employment Index", description: "Employment rate and average per capita income", icon: Wallet },
  { id: "ind-fiscal", name: "Municipal Fiscal Health", description: "Investment capacity and indebtedness", icon: Landmark },
  { id: "ind-infraestrutura", name: "Infrastructure Index", description: "Connectivity, transportation, and public services", icon: Radio },
  { id: "ind-ambiental", name: "Environmental Index", description: "Climate risks and preservation areas", icon: Cloud },
];

// KNOWLEDGE GENERATED FROM INDICATORS
export const knowledgeItems: KnowledgeItem[] = [
  { id: "know-correlacoes", name: "Identified Correlations", description: "Relationships between indicators that reveal causes and effects", icon: TrendingUp },
  { id: "know-causas", name: "Root Causes of Problems", description: "Why problems exist and what feeds them", icon: AlertTriangle },
  { id: "know-prioridades", name: "Priorities by Territory", description: "What to solve first in each neighborhood/region", icon: Target },
  { id: "know-benchmarking", name: "Regional Comparison", description: "How your municipality compares to neighbors", icon: BarChart3 },
  { id: "know-tendencias", name: "Trends and Projections", description: "Where indicators are heading", icon: TrendingUp },
  { id: "know-territorializacao", name: "Neighborhood Mapping", description: "Where problems are concentrated", icon: Map },
];

// DELIVERY PANELS FOR MANAGERS
export const deliveryPanels: DeliveryPanel[] = [
  { 
    id: "painel-prefeito", 
    name: "Mayor's Panel", 
    description: "Executive view for real-time decision making",
    benefits: [
      "Data-driven decisions",
      "Efficient resource allocation",
      "Goal monitoring",
      "Comparison with previous administrations"
    ],
    icon: LayoutDashboard 
  },
  { 
    id: "painel-vereador", 
    name: "Council Member Panel", 
    description: "Tools for oversight and bill proposals",
    benefits: [
      "Budget tracking",
      "Indicators by neighborhood/region",
      "Foundation for bills",
      "Transparency for voters"
    ],
    icon: Building2 
  },
  { 
    id: "painel-candidato", 
    name: "Candidate Panel", 
    description: "Complete diagnosis for building proposals",
    benefits: [
      "Understand real city problems",
      "Evidence-based proposals",
      "Demand territorialization",
      "Campaign differentiation"
    ],
    icon: Vote 
  },
  { 
    id: "painel-partido", 
    name: "Party Panel", 
    description: "Intelligence for electoral strategy and governance",
    benefits: [
      "Opportunity mapping",
      "Monitoring own administrations",
      "Benchmarking between municipalities",
      "Candidate training"
    ],
    icon: Users 
  },
];

// Connections between sources and content
export const sourceToContentConnections = apiContents.map(content => ({
  from: content.sourceId,
  to: content.id
}));

// Simplified connections for visualization
export const mainConnections = [
  // Sources → Indicators (grouped by theme)
  { from: "datasus", to: "ind-saude" },
  { from: "cnes", to: "ind-saude" },
  { from: "sinan", to: "ind-saude" },
  { from: "inep", to: "ind-educacao" },
  { from: "censo-escolar", to: "ind-educacao" },
  { from: "mds-cadunico", to: "ind-pobreza" },
  { from: "suas", to: "ind-pobreza" },
  { from: "bolsa-familia", to: "ind-pobreza" },
  { from: "ibge", to: "ind-saneamento" },
  { from: "tesouro", to: "ind-fiscal" },
  { from: "siafi", to: "ind-fiscal" },
  { from: "siope", to: "ind-fiscal" },
  { from: "anatel", to: "ind-infraestrutura" },
  { from: "inmet", to: "ind-ambiental" },
  { from: "dados-climaticos", to: "ind-ambiental" },
  
  // Indicators → Knowledge
  { from: "ind-saude", to: "know-correlacoes" },
  { from: "ind-educacao", to: "know-correlacoes" },
  { from: "ind-pobreza", to: "know-causas" },
  { from: "ind-saneamento", to: "know-prioridades" },
  { from: "ind-emprego", to: "know-tendencias" },
  { from: "ind-fiscal", to: "know-benchmarking" },
  { from: "ind-infraestrutura", to: "know-territorializacao" },
  { from: "ind-ambiental", to: "know-prioridades" },
  
  // Knowledge → Panels
  { from: "know-correlacoes", to: "painel-prefeito" },
  { from: "know-causas", to: "painel-prefeito" },
  { from: "know-prioridades", to: "painel-prefeito" },
  { from: "know-prioridades", to: "painel-vereador" },
  { from: "know-territorializacao", to: "painel-vereador" },
  { from: "know-benchmarking", to: "painel-candidato" },
  { from: "know-causas", to: "painel-candidato" },
  { from: "know-tendencias", to: "painel-partido" },
  { from: "know-benchmarking", to: "painel-partido" },
];
