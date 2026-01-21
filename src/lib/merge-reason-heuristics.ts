/**
 * Heurísticas para auto-sugestão de motivos de unificação de tags
 * Baseado em técnicas de Data Science para detecção de duplicatas
 */

import { levenshteinDistance } from "./string-similarity";

export type ReasonType = 'similarity' | 'case' | 'typo' | 'plural' | 'acronym' | 'language' | 'synonym' | 'generalization';

export interface MergeReasons {
  synonymy: boolean;
  grammaticalVariation: boolean;
  spellingVariation: boolean;
  acronym: boolean;
  typo: boolean;
  languageEquivalence: boolean;
  generalization: boolean;
}

export interface SuggestedReasons {
  reasons: MergeReasons;
  confidence: number;
  explanations: string[];
}

export interface ReasonBadge {
  text: string;
  type: ReasonType;
}

/**
 * Returns a human-readable reason badge explaining why two tags are considered similar
 */
export function getReasonBadge(tag1: string, tag2: string, similarity: number): ReasonBadge {
  const n1 = tag1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const n2 = tag2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  
  // Check for case sensitivity mismatch (same when lowercased, different original)
  if (n1 === n2 && tag1 !== tag2) {
    return { text: 'Diferença de Maiúsculas', type: 'case' };
  }
  
  // Check for plural pattern
  if (n1 + 's' === n2 || n2 + 's' === n1 ||
      n1 + 'es' === n2 || n2 + 'es' === n1 ||
      n1.replace(/oes$/, 'ao') === n2 || n2.replace(/oes$/, 'ao') === n1 ||
      n1.replace(/ais$/, 'al') === n2 || n2.replace(/ais$/, 'al') === n1) {
    return { text: 'Plural/Singular', type: 'plural' };
  }
  
  // Check for acronym relationship
  const isAcr1 = tag1.length <= 6 && tag1 === tag1.toUpperCase() && /^[A-Z]+$/.test(tag1.replace(/[^a-zA-Z]/g, ''));
  const isAcr2 = tag2.length <= 6 && tag2 === tag2.toUpperCase() && /^[A-Z]+$/.test(tag2.replace(/[^a-zA-Z]/g, ''));
  if (isAcr1 !== isAcr2) {
    const acronym = isAcr1 ? tag1 : tag2;
    const full = isAcr1 ? tag2 : tag1;
    const initials = full.split(/[\s-]+/).filter(w => w.length > 0).map(w => w[0].toUpperCase()).join('');
    if (initials === acronym.toUpperCase()) {
      return { text: 'Sigla ↔ Extensão', type: 'acronym' };
    }
  }
  
  // Check for typo (Levenshtein distance 1-2)
  const distance = levenshteinDistance(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  if ((maxLen >= 5 && distance <= 2 && distance > 0) || 
      (maxLen >= 3 && maxLen < 5 && distance === 1)) {
    return { text: 'Possível Typo', type: 'typo' };
  }
  
  // Default to similarity percentage
  const pct = Math.round(similarity * 100);
  return { text: `${pct}% Similaridade`, type: 'similarity' };
}

// Using centralized levenshteinDistance from string-similarity.ts (imported at top)

// Normalizar texto para comparações
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[-_\s]+/g, '')         // Remove hífens, underscores, espaços
    .trim();
}

// Detectar se é sigla (uppercase)
function isAcronym(text: string): boolean {
  const cleaned = text.replace(/[^a-zA-Z]/g, '');
  return cleaned.length >= 2 && cleaned.length <= 6 && cleaned === cleaned.toUpperCase();
}

// Detectar padrão de plural em português
function detectPluralPattern(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Padrões comuns de plural em português
  const pluralPatterns = [
    // -s simples: carro/carros
    { singular: (s: string) => s, plural: (s: string) => s + 's' },
    // -es: flor/flores
    { singular: (s: string) => s, plural: (s: string) => s + 'es' },
    // -ão/-ões: coração/corações
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/oes$/, 'ao') },
    // -ão/-ães: pão/pães
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/aes$/, 'ao') },
    // -ão/-ãos: irmão/irmãos
    { singular: (s: string) => s.endsWith('ao') ? s : null, plural: (s: string) => s.replace(/aos$/, 'ao') },
    // -al/-ais: animal/animais
    { singular: (s: string) => s.endsWith('al') ? s : null, plural: (s: string) => s.replace(/ais$/, 'al') },
    // -el/-eis: papel/papéis
    { singular: (s: string) => s.endsWith('el') ? s : null, plural: (s: string) => s.replace(/eis$/, 'el') },
    // -il/-is: funil/funis (tônico)
    { singular: (s: string) => s.endsWith('il') ? s : null, plural: (s: string) => s.replace(/is$/, 'il') },
    // -ol/-óis: lençol/lençóis
    { singular: (s: string) => s.endsWith('ol') ? s : null, plural: (s: string) => s.replace(/ois$/, 'ol') },
    // -ul/-uis: paul/pauis
    { singular: (s: string) => s.endsWith('ul') ? s : null, plural: (s: string) => s.replace(/uis$/, 'ul') },
    // -m/-ns: homem/homens
    { singular: (s: string) => s.endsWith('m') ? s : null, plural: (s: string) => s.replace(/ns$/, 'm') },
    // -r/-res: flor/flores
    { singular: (s: string) => s.endsWith('r') ? s : null, plural: (s: string) => s.replace(/res$/, 'r') },
    // -z/-zes: luz/luzes
    { singular: (s: string) => s.endsWith('z') ? s : null, plural: (s: string) => s.replace(/zes$/, 'z') },
  ];

  // Verifica se um é plural do outro
  for (const pattern of pluralPatterns) {
    if (n1 + 's' === n2 || n2 + 's' === n1) return true;
    if (n1 + 'es' === n2 || n2 + 'es' === n1) return true;
  }

  // Verifica terminações específicas
  if ((n1.endsWith('s') && n1.slice(0, -1) === n2) ||
      (n2.endsWith('s') && n2.slice(0, -1) === n1)) {
    return true;
  }

  // -ões/-ão
  if ((n1.replace(/oes$/, 'ao') === n2) || (n2.replace(/oes$/, 'ao') === n1)) return true;
  // -ais/-al
  if ((n1.replace(/ais$/, 'al') === n2) || (n2.replace(/ais$/, 'al') === n1)) return true;
  // -eis/-el
  if ((n1.replace(/eis$/, 'el') === n2) || (n2.replace(/eis$/, 'el') === n1)) return true;
  // -ns/-m
  if ((n1.replace(/ns$/, 'm') === n2) || (n2.replace(/ns$/, 'm') === n1)) return true;

  return false;
}

// Detectar variação de grafia (acentos, hífens, etc.)
function detectSpellingVariation(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Se normalizados são iguais, mas originais diferentes = variação de grafia
  if (n1 === n2 && tag1.toLowerCase() !== tag2.toLowerCase()) {
    return true;
  }
  
  // Detectar variações com hífen: e-mail vs email
  const removeHyphens = (s: string) => s.replace(/-/g, '').toLowerCase();
  if (removeHyphens(tag1) === removeHyphens(tag2) && tag1 !== tag2) {
    return true;
  }
  
  return false;
}

// Detectar sigla vs extensão
function detectAcronymRelation(tag1: string, tag2: string): boolean {
  const t1 = tag1.trim();
  const t2 = tag2.trim();
  
  // Um é sigla, outro é texto longo
  const isT1Acronym = isAcronym(t1);
  const isT2Acronym = isAcronym(t2);
  
  if (isT1Acronym === isT2Acronym) return false; // Ambos são siglas ou nenhum é
  
  const acronym = isT1Acronym ? t1 : t2;
  const fullText = isT1Acronym ? t2 : t1;
  
  // Verificar se as iniciais do texto completo formam a sigla
  const words = fullText.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    const initials = words.map(w => w[0].toUpperCase()).join('');
    if (initials === acronym.toUpperCase()) {
      return true;
    }
  }
  
  return false;
}

// Detectar typo via Levenshtein
function detectTypo(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Se são muito diferentes em tamanho, provavelmente não é typo
  if (Math.abs(n1.length - n2.length) > 2) return false;
  
  // Calcular distância
  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  
  // Typo: distância baixa relativa ao tamanho
  // 1-2 caracteres de diferença em palavras de 5+ caracteres
  if (maxLength >= 5 && distance <= 2 && distance > 0) {
    return true;
  }
  
  // Para palavras curtas, apenas 1 caractere de diferença
  if (maxLength >= 3 && maxLength < 5 && distance === 1) {
    return true;
  }
  
  return false;
}

// Dicionário de sinônimos em português (baseado em estrutura WordNet-like)
const portugueseSynonyms: Record<string, string[]> = {
  // Healthcare - Termos médicos
  'doenca': ['enfermidade', 'patologia', 'molestia', 'mal', 'afeccao'],
  'tratamento': ['terapia', 'cura', 'intervencao', 'procedimento'],
  'medico': ['doutor', 'clinico', 'facultativo', 'profissional de saude'],
  'hospital': ['clinica', 'unidade de saude', 'centro medico', 'nosocômio'],
  'paciente': ['doente', 'enfermo', 'cliente', 'usuario'],
  'remedio': ['medicamento', 'farmaco', 'droga', 'medicina'],
  'sintoma': ['sinal', 'manifestacao', 'indicador'],
  'dor': ['algias', 'sofrimento', 'incomodo', 'desconforto'],
  'exame': ['teste', 'avaliacao', 'analise', 'investigacao'],
  'consulta': ['atendimento', 'visita', 'encontro'],
  'cirurgia': ['operacao', 'intervencao cirurgica', 'procedimento cirurgico'],
  'diagnostico': ['avaliacao', 'parecer', 'laudo'],
  'prognostico': ['previsao', 'expectativa', 'perspectiva'],
  'receita': ['prescricao', 'formula'],
  'vacina': ['imunizante', 'inoculacao'],
  'febre': ['hipertermia', 'pirexia', 'temperatura elevada'],
  'infeccao': ['contaminacao', 'sepse'],
  'alergia': ['hipersensibilidade', 'reacao alergica'],
  'inflamacao': ['flogose', 'processo inflamatorio'],
  'hemorragia': ['sangramento', 'perda sanguinea'],
  'ferida': ['lesao', 'machucado', 'corte', 'ferimento'],
  'fratura': ['quebra', 'ruptura ossea'],
  'gravidez': ['gestacao', 'prenhez'],
  'parto': ['nascimento', 'delivery', 'parturicao'],
  'obito': ['morte', 'falecimento', 'oximo letalis'],
  
  // Healthcare - Anatomia
  'coracao': ['miocardio', 'orgao cardiaco'],
  'cerebro': ['encefalo', 'massa encefalica'],
  'pulmao': ['orgao pulmonar', 'aparelho respiratorio'],
  'estomago': ['ventriculo', 'orgao gastrico'],
  'intestino': ['tubo digestivo', 'alca intestinal'],
  'figado': ['hepatico', 'orgao hepatico'],
  'rim': ['renal', 'orgao renal'],
  'osso': ['estrutura ossea', 'tecido osseo'],
  'musculo': ['tecido muscular', 'fibra muscular'],
  'sangue': ['fluido sanguineo', 'tecido hematico'],
  'pele': ['cútis', 'derme', 'tegumento', 'epiderme'],
  'cabeca': ['cranio', 'calota craniana'],
  'olho': ['globo ocular', 'orgao visual'],
  'orelha': ['ouvido', 'pavilhao auricular'],
  'boca': ['cavidade oral', 'cavidade bucal'],
  'dente': ['elemento dental', 'odonto'],
  
  // Termos gerais de negócio
  'relatorio': ['informe', 'parecer', 'documento'],
  'analise': ['avaliacao', 'estudo', 'exame', 'investigacao'],
  'processo': ['procedimento', 'tramite', 'fluxo'],
  'gestao': ['administracao', 'gerenciamento', 'gerencia'],
  'equipe': ['time', 'grupo', 'pessoal', 'staff'],
  'cliente': ['consumidor', 'usuario', 'comprador'],
  'fornecedor': ['provedor', 'abastecedor', 'distribuidor'],
  'custo': ['despesa', 'gasto', 'dispendio'],
  'faturamento': ['receita', 'entrada', 'ganho'],
  'lucro': ['ganho', 'rendimento', 'beneficio'],
  'prejuizo': ['perda', 'deficit', 'dano'],
  'contrato': ['acordo', 'pacto', 'convenio'],
  'pagamento': ['quitacao', 'liquidacao', 'remessa'],
  'compra': ['aquisicao', 'obtencao'],
  'venda': ['comercializacao', 'alienacao'],
  'estoque': ['inventario', 'deposito', 'armazenamento'],
  'produto': ['mercadoria', 'item', 'artigo'],
  'servico': ['prestacao', 'atendimento'],
  'qualidade': ['excelencia', 'padrao'],
  'problema': ['questao', 'dificuldade', 'obstáculo', 'entrave'],
  'solucao': ['resolucao', 'resposta', 'alternativa'],
  'objetivo': ['meta', 'alvo', 'finalidade', 'proposito'],
  'resultado': ['desfecho', 'efeito', 'consequencia'],
  'reuniao': ['encontro', 'assembleia', 'junta'],
  'projeto': ['empreendimento', 'iniciativa', 'plano'],
  'tarefa': ['atividade', 'incumbencia', 'atribuicao'],
  'prazo': ['deadline', 'termo', 'limite'],
  
  // Tecnologia
  'sistema': ['plataforma', 'solucao', 'aplicacao'],
  'dados': ['informacoes', 'registros'],
  'usuario': ['utilizador', 'operador'],
  'erro': ['falha', 'bug', 'defeito', 'problema'],
  'atualizacao': ['update', 'upgrade', 'revisao'],
  'configuracao': ['setup', 'parametrizacao', 'ajuste'],
  'seguranca': ['protecao', 'salvaguarda'],
  'acesso': ['entrada', 'permissao', 'autorizacao'],
  'arquivo': ['ficheiro', 'documento', 'file'],
  'pasta': ['diretorio', 'folder'],
  'backup': ['copia de seguranca', 'salvaguarda'],
  'rede': ['network', 'malha'],
  
  // Adjetivos comuns
  'importante': ['relevante', 'significativo', 'essencial', 'crucial'],
  'urgente': ['emergencial', 'prioritario', 'imediato'],
  'cronico': ['persistente', 'prolongado', 'continuo'],
  'agudo': ['intenso', 'severo', 'grave'],
  'normal': ['regular', 'comum', 'habitual', 'padrao'],
  'anormal': ['atipico', 'irregular', 'anomalo'],
  'alto': ['elevado', 'aumentado'],
  'baixo': ['reduzido', 'diminuido'],
  'grande': ['extenso', 'amplo', 'vasto'],
  'pequeno': ['reduzido', 'diminuto', 'menor'],
};

// Detectar sinonímia baseada em dicionário de sinônimos PT
function detectSynonymy(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  // Verificar se são sinônimos diretos
  for (const [term, synonyms] of Object.entries(portugueseSynonyms)) {
    const normalizedTerm = normalize(term);
    const normalizedSynonyms = synonyms.map(s => normalize(s));
    
    // Caso 1: tag1 é o termo principal e tag2 está nos sinônimos
    if (n1 === normalizedTerm && normalizedSynonyms.includes(n2)) {
      return true;
    }
    // Caso 2: tag2 é o termo principal e tag1 está nos sinônimos
    if (n2 === normalizedTerm && normalizedSynonyms.includes(n1)) {
      return true;
    }
    // Caso 3: Ambos estão na lista de sinônimos (são sinônimos entre si)
    if (normalizedSynonyms.includes(n1) && normalizedSynonyms.includes(n2)) {
      return true;
    }
  }
  
  return false;
}

// Dicionário expandido de equivalências PT-EN para healthcare e termos gerais
const languageEquivalents: Record<string, string[]> = {
  // Healthcare - Core Terms
  'saude': ['health', 'healthcare'],
  'paciente': ['patient'],
  'hospital': ['hospital'],
  'medico': ['doctor', 'physician', 'medical'],
  'enfermeiro': ['nurse', 'nursing'],
  'tratamento': ['treatment', 'therapy'],
  'diagnostico': ['diagnosis', 'diagnostic'],
  'doenca': ['disease', 'illness', 'sickness'],
  'remedio': ['medicine', 'medication', 'drug', 'remedy'],
  'cirurgia': ['surgery', 'surgical'],
  'exame': ['exam', 'test', 'examination'],
  'consulta': ['appointment', 'consultation', 'visit'],
  'sintoma': ['symptom'],
  'vacina': ['vaccine', 'vaccination'],
  'terapia': ['therapy', 'therapeutic'],
  'farmacia': ['pharmacy', 'pharmaceutical'],
  'emergencia': ['emergency'],
  'clinica': ['clinic', 'clinical'],
  'prontuario': ['medical record', 'chart', 'record'],
  'receita': ['prescription', 'recipe'],
  'atendimento': ['care', 'service', 'attendance'],
  'internacao': ['hospitalization', 'admission', 'inpatient'],
  'alta': ['discharge', 'release'],
  'uti': ['icu', 'intensive care'],
  'pronto socorro': ['emergency room', 'er', 'emergency department'],
  
  // Healthcare - Anatomy
  'coracao': ['heart', 'cardiac'],
  'pulmao': ['lung', 'pulmonary'],
  'cerebro': ['brain', 'cerebral'],
  'figado': ['liver', 'hepatic'],
  'rim': ['kidney', 'renal'],
  'estomago': ['stomach', 'gastric'],
  'intestino': ['intestine', 'bowel', 'intestinal'],
  'osso': ['bone', 'skeletal'],
  'musculo': ['muscle', 'muscular'],
  'pele': ['skin', 'dermal', 'cutaneous'],
  'sangue': ['blood', 'hematologic'],
  'nervos': ['nerves', 'neural'],
  'articulacao': ['joint', 'articular'],
  'coluna': ['spine', 'spinal', 'vertebral'],
  
  // Healthcare - Specialties
  'cardiologia': ['cardiology'],
  'neurologia': ['neurology'],
  'oncologia': ['oncology'],
  'pediatria': ['pediatrics', 'paediatrics'],
  'ginecologia': ['gynecology', 'gynaecology'],
  'urologia': ['urology'],
  'dermatologia': ['dermatology'],
  'oftalmologia': ['ophthalmology'],
  'ortopedia': ['orthopedics', 'orthopaedics'],
  'psiquiatria': ['psychiatry'],
  'radiologia': ['radiology'],
  'anestesia': ['anesthesia', 'anaesthesia'],
  'fisioterapia': ['physiotherapy', 'physical therapy'],
  
  // Healthcare - Procedures
  'biopsia': ['biopsy'],
  'tomografia': ['tomography', 'ct scan', 'cat scan'],
  'ressonancia': ['mri', 'magnetic resonance'],
  'ultrassom': ['ultrasound', 'sonography'],
  'raio x': ['x-ray', 'radiograph'],
  'endoscopia': ['endoscopy'],
  'colonoscopia': ['colonoscopy'],
  'mamografia': ['mammography', 'mammogram'],
  'eletrocardiograma': ['electrocardiogram', 'ecg', 'ekg'],
  'transfusao': ['transfusion'],
  
  // Healthcare - Conditions
  'cancer': ['cancer', 'carcinoma', 'tumor'],
  'diabetes': ['diabetes', 'diabetic'],
  'hipertensao': ['hypertension', 'high blood pressure'],
  'infeccao': ['infection', 'infectious'],
  'alergia': ['allergy', 'allergic'],
  'inflamacao': ['inflammation', 'inflammatory'],
  'febre': ['fever', 'pyrexia'],
  'dor': ['pain', 'ache'],
  'gripe': ['flu', 'influenza'],
  'pneumonia': ['pneumonia'],
  'asma': ['asthma'],
  'artrite': ['arthritis'],
  'obesidade': ['obesity'],
  'anemia': ['anemia', 'anaemia'],
  
  // General Business/Tech Terms
  'relatorio': ['report'],
  'documento': ['document'],
  'projeto': ['project'],
  'analise': ['analysis', 'analytics'],
  'qualidade': ['quality'],
  'seguranca': ['security', 'safety'],
  'gestao': ['management'],
  'processo': ['process'],
  'sistema': ['system'],
  'dados': ['data'],
  'informacao': ['information'],
  'usuario': ['user'],
  'cliente': ['client', 'customer'],
  'equipe': ['team', 'staff'],
  'custo': ['cost'],
  'orcamento': ['budget'],
  'vendas': ['sales'],
  'compras': ['purchase', 'procurement'],
  'estoque': ['stock', 'inventory'],
  'fornecedor': ['supplier', 'vendor'],
  'contrato': ['contract'],
  'pagamento': ['payment'],
  'fatura': ['invoice'],
  'nota fiscal': ['invoice', 'tax invoice'],
  
  // Technology Terms
  'tecnologia': ['technology'],
  'software': ['software'],
  'hardware': ['hardware'],
  'rede': ['network'],
  'banco de dados': ['database'],
  'servidor': ['server'],
  'aplicativo': ['application', 'app'],
  'interface': ['interface'],
  'inteligencia artificial': ['artificial intelligence', 'ai'],
  'aprendizado de maquina': ['machine learning', 'ml'],
};

function detectLanguageEquivalence(tag1: string, tag2: string): boolean {
  const n1 = normalize(tag1);
  const n2 = normalize(tag2);
  
  for (const [pt, enList] of Object.entries(languageEquivalents)) {
    const normalizedPt = normalize(pt);
    const normalizedEn = enList.map(e => normalize(e));
    
    if ((n1 === normalizedPt && normalizedEn.includes(n2)) ||
        (n2 === normalizedPt && normalizedEn.includes(n1))) {
      return true;
    }
  }
  
  return false;
}

// Detectar padrão de generalização (datas, números, etc.)
function detectGeneralizationPattern(tag1: string, tag2: string): boolean {
  // Padrões que indicam especificidade temporal
  const temporalPatterns = [
    /janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i,
    /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i,
    /\d{4}/, // Anos
    /q[1-4]/i, // Quarters
    /\d{1,2}\/\d{1,2}/, // Datas
    /semana\s*\d+/i,
    /mes\s*\d+/i,
  ];
  
  const hasT1Temporal = temporalPatterns.some(p => p.test(tag1));
  const hasT2Temporal = temporalPatterns.some(p => p.test(tag2));
  
  // Se ambos têm padrões temporais diferentes, pode ser generalização
  if (hasT1Temporal && hasT2Temporal) {
    // Extrair a base comum (sem a parte temporal)
    const base1 = tag1.replace(/\d+/g, '').replace(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/gi, '').trim();
    const base2 = tag2.replace(/\d+/g, '').replace(/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/gi, '').trim();
    
    if (normalize(base1) === normalize(base2) && base1.length > 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Função principal: analisa dois tags e sugere motivos de unificação
 */
export function suggestMergeReasons(tag1: string, tag2: string): SuggestedReasons {
  const reasons: MergeReasons = {
    synonymy: false,
    grammaticalVariation: false,
    spellingVariation: false,
    acronym: false,
    typo: false,
    languageEquivalence: false,
    generalization: false,
  };
  
  const explanations: string[] = [];
  let confidence = 0;
  
  // 0. Verificar sinonímia (dicionário de sinônimos PT)
  if (detectSynonymy(tag1, tag2)) {
    reasons.synonymy = true;
    explanations.push(`Detectada sinonímia: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.88;
  }
  
  // 1. Verificar variação gramatical (plural/singular)
  if (detectPluralPattern(tag1, tag2)) {
    reasons.grammaticalVariation = true;
    explanations.push(`Detectado padrão singular/plural: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.9;
  }
  
  // 2. Verificar variação de grafia
  if (detectSpellingVariation(tag1, tag2)) {
    reasons.spellingVariation = true;
    explanations.push(`Detectada variação de grafia/formatação: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.85;
  }
  
  // 3. Verificar sigla/acrônimo
  if (detectAcronymRelation(tag1, tag2)) {
    reasons.acronym = true;
    explanations.push(`Detectada relação sigla/extensão: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.95;
  }
  
  // 4. Verificar typo (apenas se não detectou outros padrões)
  if (!reasons.grammaticalVariation && !reasons.spellingVariation && !reasons.acronym) {
    if (detectTypo(tag1, tag2)) {
      reasons.typo = true;
      const distance = levenshteinDistance(normalize(tag1), normalize(tag2));
      explanations.push(`Possível erro de digitação (distância Levenshtein: ${distance}): "${tag1}" ↔ "${tag2}"`);
      confidence += 0.7;
    }
  }
  
  // 5. Verificar equivalência de idioma
  if (detectLanguageEquivalence(tag1, tag2)) {
    reasons.languageEquivalence = true;
    explanations.push(`Detectada equivalência PT-EN: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.9;
  }
  
  // 6. Verificar generalização
  if (detectGeneralizationPattern(tag1, tag2)) {
    reasons.generalization = true;
    explanations.push(`Detectado padrão de generalização temporal: "${tag1}" ↔ "${tag2}"`);
    confidence += 0.75;
  }
  
  // Normalizar confidence para máximo 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    reasons,
    confidence,
    explanations
  };
}

/**
 * Analisa múltiplos tags e retorna sugestões agregadas
 */
export function suggestMergeReasonsForTags(tags: string[]): SuggestedReasons {
  if (tags.length < 2) {
    return {
      reasons: {
        synonymy: false,
        grammaticalVariation: false,
        spellingVariation: false,
        acronym: false,
        typo: false,
        languageEquivalence: false,
        generalization: false,
      },
      confidence: 0,
      explanations: []
    };
  }
  
  const aggregatedReasons: MergeReasons = {
    synonymy: false,
    grammaticalVariation: false,
    spellingVariation: false,
    acronym: false,
    typo: false,
    languageEquivalence: false,
    generalization: false,
  };
  
  const allExplanations: string[] = [];
  let maxConfidence = 0;
  
  // Comparar cada par de tags
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const result = suggestMergeReasons(tags[i], tags[j]);
      
      // Agregar razões
      Object.keys(result.reasons).forEach(key => {
        if (result.reasons[key as keyof MergeReasons]) {
          aggregatedReasons[key as keyof MergeReasons] = true;
        }
      });
      
      allExplanations.push(...result.explanations);
      maxConfidence = Math.max(maxConfidence, result.confidence);
    }
  }
  
  return {
    reasons: aggregatedReasons,
    confidence: maxConfidence,
    explanations: allExplanations
  };
}
