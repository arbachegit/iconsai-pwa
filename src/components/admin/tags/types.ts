import type { Tag } from "@/types/tag";

// Delete confirmation modal state interface
export interface DeleteConfirmModalState {
  open: boolean;
  ids: string[];
  tagName: string;
  tagType: 'parent' | 'child';
  totalInstances: number;
  isLoadingCount: boolean;
  deleteScope: 'single' | 'all';
  documentId?: string;
  documentFilename?: string;
  reasons: DeletionReasons;
}

// Bulk delete modal state interface
export interface BulkDeleteModalState {
  open: boolean;
  selectedTagIds: string[];
  tagNames: string[];
  totalDocumentsAffected: number;
  isLoadingCount: boolean;
  isDeleting: boolean;
  reasons: DeletionReasons;
}

// Deletion reasons (9 Data Science justification options)
export interface DeletionReasons {
  generic: boolean;        // Stopwords
  outOfDomain: boolean;    // Irrelevância de domínio
  properName: boolean;     // Alta cardinalidade
  isYear: boolean;         // Dados temporais
  isPhrase: boolean;       // Length excessivo
  typo: boolean;           // Erro de grafia
  variation: boolean;      // Plural/Singular/Sinônimo
  isolatedVerb: boolean;   // Verbo isolado
  pii: boolean;            // Dado sensível
}

// Default deletion reasons
export const DEFAULT_DELETION_REASONS: DeletionReasons = {
  generic: false,
  outOfDomain: false,
  properName: false,
  isYear: false,
  isPhrase: false,
  typo: false,
  variation: false,
  isolatedVerb: false,
  pii: false,
};

// Default delete confirm modal state
export const DEFAULT_DELETE_CONFIRM_MODAL: DeleteConfirmModalState = {
  open: false,
  ids: [],
  tagName: '',
  tagType: 'parent',
  totalInstances: 0,
  isLoadingCount: false,
  deleteScope: 'all',
  documentId: undefined,
  documentFilename: undefined,
  reasons: { ...DEFAULT_DELETION_REASONS },
};

// Default bulk delete modal state
export const DEFAULT_BULK_DELETE_MODAL: BulkDeleteModalState = {
  open: false,
  selectedTagIds: [],
  tagNames: [],
  totalDocumentsAffected: 0,
  isLoadingCount: false,
  isDeleting: false,
  reasons: { ...DEFAULT_DELETION_REASONS },
};

// Form data interface for tag editing
export interface TagFormData {
  tag_name: string;
  tag_type: string;
  confidence: number;
  source: string;
  parent_tag_id: string | null;
}

// Default form data
export const DEFAULT_TAG_FORM_DATA: TagFormData = {
  tag_name: "",
  tag_type: "",
  confidence: 0.85,
  source: "admin",
  parent_tag_id: null,
};

// Reason labels for audit logging
export const getReasonLabels = (reasons: DeletionReasons): string[] => {
  const labels: string[] = [];
  if (reasons.generic) labels.push('Termo genérico (Stopwords)');
  if (reasons.outOfDomain) labels.push('Irrelevância de domínio');
  if (reasons.properName) labels.push('Nome próprio (High Cardinality)');
  if (reasons.isYear) labels.push('Dado temporal (Ano)');
  if (reasons.isPhrase) labels.push('Frase (Length excessivo)');
  if (reasons.typo) labels.push('Erro de grafia');
  if (reasons.variation) labels.push('Variação (Plural/Sinônimo)');
  if (reasons.isolatedVerb) labels.push('Verbo isolado');
  if (reasons.pii) labels.push('Dado sensível (PII)');
  return labels;
};
