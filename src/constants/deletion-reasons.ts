/**
 * Centralized deletion reasons configuration
 * Used across tag management deletion modals
 */

export interface DeletionReasons {
  duplicate: boolean;
  outOfScope: boolean;
  typo: boolean;
  deprecated: boolean;
  merged: boolean;
  testData: boolean;
  irrelevant: boolean;
  reorganization: boolean;
  other: boolean;
}

export const DEFAULT_DELETION_REASONS: DeletionReasons = {
  duplicate: false,
  outOfScope: false,
  typo: false,
  deprecated: false,
  merged: false,
  testData: false,
  irrelevant: false,
  reorganization: false,
  other: false
};

export const DELETION_REASON_LABELS: Record<keyof DeletionReasons, string> = {
  duplicate: 'Tag duplicada',
  outOfScope: 'Fora do escopo',
  typo: 'Erro de digitação',
  deprecated: 'Tag obsoleta',
  merged: 'Fundida com outra',
  testData: 'Dado de teste',
  irrelevant: 'Conteúdo irrelevante',
  reorganization: 'Reorganização taxonômica',
  other: 'Outro motivo'
};

export const DELETION_REASON_DESCRIPTIONS: Record<keyof DeletionReasons, string> = {
  duplicate: 'Esta tag já existe com outro nome',
  outOfScope: 'Não pertence ao domínio do sistema',
  typo: 'Foi criada com erro ortográfico',
  deprecated: 'Não é mais utilizada no contexto atual',
  merged: 'Seus documentos foram movidos para outra tag',
  testData: 'Criada apenas para testes',
  irrelevant: 'Não agrega valor à taxonomia',
  reorganization: 'Faz parte de uma reestruturação maior',
  other: 'Especificar motivo nas observações'
};

/**
 * Get selected reasons as formatted string for logging
 */
export function formatSelectedReasons(reasons: DeletionReasons): string {
  return Object.entries(reasons)
    .filter(([_, selected]) => selected)
    .map(([key]) => DELETION_REASON_LABELS[key as keyof DeletionReasons])
    .join(', ') || 'Nenhum motivo selecionado';
}

/**
 * Check if at least one reason is selected
 */
export function hasSelectedReason(reasons: DeletionReasons): boolean {
  return Object.values(reasons).some(Boolean);
}
