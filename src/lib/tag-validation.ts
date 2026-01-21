/**
 * Contextual Taxonomy Validation Protocol
 * 
 * Validates parent tags for adoption according to:
 * - General AI Rules (stopwords, generic terms, PII, cardinality)
 * - Domain-Specific Rules (Health terminology when applicable)
 */

import { supabase } from "@/integrations/supabase/client";

export interface TagViolation {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  category: 'stopword' | 'generic' | 'pii' | 'cardinality' | 'domain' | 'length';
}

export interface TagValidationResult {
  isValid: boolean;
  violations: TagViolation[];
  score: number; // 0-100
  domain: 'general' | 'health' | 'study' | 'economia';
}

// Portuguese and English stopwords that should never be parent tags
const STOPWORDS = new Set([
  // Portuguese
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'uns', 'umas',
  'o', 'a', 'os', 'as', 'e', 'ou', 'que', 'para', 'por', 'com', 'sem', 'sobre', 'entre',
  'ao', 'aos', 'às', 'pelo', 'pela', 'pelos', 'pelas', 'este', 'esta', 'estes', 'estas',
  'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas',
  'isso', 'isto', 'aquilo', 'qual', 'quais', 'quanto', 'quanta', 'quantos', 'quantas',
  'se', 'quando', 'onde', 'como', 'porque', 'porquê', 'mais', 'menos', 'muito', 'muita',
  'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas', 'todo', 'toda', 'todos', 'todas',
  'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
  'já', 'ainda', 'também', 'só', 'apenas', 'até', 'após', 'desde', 'durante',
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your',
  'i', 'me', 'my', 'he', 'him', 'his', 'she', 'her', 'who', 'what', 'when', 'where', 'why', 'how'
]);

// Generic terms that are too broad for classification
const GENERIC_TERMS = new Set([
  // Portuguese
  'documento', 'documentos', 'arquivo', 'arquivos', 'dados', 'dado', 'informação', 'informações',
  'sistema', 'sistemas', 'processo', 'processos', 'projeto', 'projetos', 'item', 'itens',
  'coisa', 'coisas', 'tipo', 'tipos', 'forma', 'formas', 'modo', 'modos', 'parte', 'partes',
  'área', 'áreas', 'setor', 'setores', 'caso', 'casos', 'exemplo', 'exemplos',
  'geral', 'gerais', 'comum', 'comuns', 'normal', 'normais', 'padrão', 'padrões',
  'principal', 'principais', 'básico', 'básicos', 'simples', 'outros', 'outras', 'vários', 'várias',
  'assunto', 'assuntos', 'tema', 'temas', 'tópico', 'tópicos', 'conteúdo', 'conteúdos',
  'texto', 'textos', 'página', 'páginas', 'nota', 'notas', 'registro', 'registros',
  // English
  'document', 'documents', 'file', 'files', 'data', 'information', 'system', 'systems',
  'process', 'processes', 'project', 'projects', 'item', 'items', 'thing', 'things',
  'type', 'types', 'form', 'forms', 'mode', 'modes', 'part', 'parts', 'area', 'areas',
  'sector', 'sectors', 'case', 'cases', 'example', 'examples', 'general', 'common',
  'normal', 'standard', 'main', 'basic', 'simple', 'other', 'others', 'various',
  'subject', 'subjects', 'topic', 'topics', 'content', 'contents', 'text', 'texts',
  'page', 'pages', 'note', 'notes', 'record', 'records', 'misc', 'miscellaneous'
]);

// Health-specific ambiguous terms that need clinical context
const AMBIGUOUS_HEALTH_TERMS = new Set([
  'positivo', 'negativo', 'normal', 'anormal', 'alterado', 'inalterado',
  'presente', 'ausente', 'sim', 'não', 'leve', 'moderado', 'grave', 'severo',
  'agudo', 'crônico', 'bom', 'ruim', 'alto', 'baixo', 'elevado', 'reduzido'
]);

// PII patterns
const PII_PATTERNS = [
  /\d{3}\.\d{3}\.\d{3}-\d{2}/,  // CPF
  /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, // CNPJ
  /\(\d{2}\)\s?\d{4,5}-?\d{4}/, // Phone
  /[\w.-]+@[\w.-]+\.\w+/,       // Email
  /\d{5}-?\d{3}/                // CEP
];

// Year pattern (temporal data should be continuous, not categorical)
const YEAR_PATTERN = /^(19|20)\d{2}$/;

/**
 * Check if text is a stopword
 */
export function isStopword(text: string): boolean {
  return STOPWORDS.has(text.toLowerCase().trim());
}

/**
 * Check if text is a generic/overly broad term
 */
export function isGenericTerm(text: string): boolean {
  return GENERIC_TERMS.has(text.toLowerCase().trim());
}

/**
 * Check if text contains PII
 */
export function containsPII(text: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check if text is just a year (temporal data)
 */
export function isYearOnly(text: string): boolean {
  return YEAR_PATTERN.test(text.trim());
}

/**
 * Check if text is too short to be meaningful
 */
export function isTooShort(text: string): boolean {
  return text.trim().length < 2;
}

/**
 * Check if text is too long (likely a phrase, not a keyword)
 */
export function isTooLong(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length > 5;
}

/**
 * Check if text is an ambiguous health term
 */
export function isAmbiguousHealthTerm(text: string): boolean {
  return AMBIGUOUS_HEALTH_TERMS.has(text.toLowerCase().trim());
}

/**
 * Fetch health scope topics from chat_config
 */
async function fetchHealthScopeTopics(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('chat_config')
      .select('scope_topics')
      .eq('chat_type', 'health')
      .single();
    
    return data?.scope_topics || [];
  } catch {
    return [];
  }
}

/**
 * Check if term is valid health terminology
 */
export function isValidHealthTerminology(text: string, scopeTopics: string[]): boolean {
  if (scopeTopics.length === 0) return true; // No restrictions if no scope defined
  
  const normalizedText = text.toLowerCase().trim();
  return scopeTopics.some(topic => 
    normalizedText.includes(topic.toLowerCase()) || 
    topic.toLowerCase().includes(normalizedText)
  );
}

/**
 * Validate a parent tag for taxonomy adoption
 */
export async function validateParentTag(
  tagName: string, 
  domain: 'general' | 'health' | 'study' | 'economia' = 'general'
): Promise<TagValidationResult> {
  const violations: TagViolation[] = [];
  
  // ========== GENERAL AI RULES ==========
  
  // Rule 1: Stopword check
  if (isStopword(tagName)) {
    violations.push({
      rule: 'stopword',
      severity: 'error',
      message: `"${tagName}" é uma stopword e não pode ser usada como tag`,
      category: 'stopword'
    });
  }
  
  // Rule 2: Generic term check
  if (isGenericTerm(tagName)) {
    violations.push({
      rule: 'generic_term',
      severity: 'warning',
      message: `"${tagName}" é um termo muito genérico e pode prejudicar a classificação`,
      category: 'generic'
    });
  }
  
  // Rule 3: PII check
  if (containsPII(tagName)) {
    violations.push({
      rule: 'pii_detected',
      severity: 'error',
      message: `"${tagName}" contém dados pessoais sensíveis (PII)`,
      category: 'pii'
    });
  }
  
  // Rule 4: Year-only check (high cardinality)
  if (isYearOnly(tagName)) {
    violations.push({
      rule: 'high_cardinality',
      severity: 'warning',
      message: `"${tagName}" é um ano - dados temporais devem ser variáveis contínuas`,
      category: 'cardinality'
    });
  }
  
  // Rule 5: Minimum length check
  if (isTooShort(tagName)) {
    violations.push({
      rule: 'min_length',
      severity: 'error',
      message: `"${tagName}" é muito curto para ser uma tag significativa`,
      category: 'length'
    });
  }
  
  // Rule 6: Maximum length check (phrase detection)
  if (isTooLong(tagName)) {
    violations.push({
      rule: 'max_length',
      severity: 'warning',
      message: `"${tagName}" parece ser uma frase, não uma palavra-chave`,
      category: 'length'
    });
  }
  
  // ========== HEALTH DOMAIN RULES ==========
  
  if (domain === 'health') {
    // Rule H1: Ambiguous medical term check
    if (isAmbiguousHealthTerm(tagName)) {
      violations.push({
        rule: 'ambiguous_medical',
        severity: 'warning',
        message: `"${tagName}" é ambíguo sem contexto clínico específico`,
        category: 'domain'
      });
    }
    
    // Rule H2: Health terminology validation
    const healthTopics = await fetchHealthScopeTopics();
    if (healthTopics.length > 0 && !isValidHealthTerminology(tagName, healthTopics)) {
      violations.push({
        rule: 'invalid_health_term',
        severity: 'warning',
        message: `"${tagName}" não está nos tópicos de saúde configurados`,
        category: 'domain'
      });
    }
  }
  
  // ========== CALCULATE SCORE ==========
  
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  
  // Score calculation: errors subtract 50 points, warnings subtract 15 points
  const score = Math.max(0, 100 - (errorCount * 50) - (warningCount * 15));
  
  return {
    isValid: errorCount === 0,
    violations,
    score,
    domain
  };
}

/**
 * Batch validate multiple parent tags
 */
export async function validateParentTags(
  tagNames: string[], 
  domain: 'general' | 'health' | 'study' = 'general'
): Promise<Map<string, TagValidationResult>> {
  const results = new Map<string, TagValidationResult>();
  
  for (const tagName of tagNames) {
    const result = await validateParentTag(tagName, domain);
    results.set(tagName, result);
  }
  
  return results;
}

/**
 * Get validation score color class
 */
export function getValidationScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Get validation badge variant
 */
export function getValidationBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 50) return 'secondary';
  return 'destructive';
}
