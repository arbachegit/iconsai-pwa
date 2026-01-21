// Build: 2026-01-11-v1.1.0 - Force redeploy regional phonetics fix
import { supabase } from "@/integrations/supabase/client";
import type { CSVImportConfig } from "./CSVImportButton";

// HELPERS
const toArray = (value: string): string[] | null => {
  if (!value) return null;
  return value.split(";").map((s) => s.trim()).filter(Boolean);
};

const toNumber = (value: string): number | null => {
  if (!value) return null;
  const num = parseFloat(value.replace(",", "."));
  return isNaN(num) ? null : num;
};

const normalize = (text: string): string => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const asString = (value: unknown): string => {
  return value == null ? "" : String(value);
};

const asStringOrNull = (value: unknown): string | null => {
  return value == null || value === "" ? null : String(value);
};

const asNumberOrDefault = (value: unknown, defaultVal: number): number => {
  if (value == null) return defaultVal;
  const num = Number(value);
  return isNaN(num) ? defaultVal : num;
};

const asStringArrayOrNull = (value: unknown): string[] | null => {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  return null;
};

// 1. TAXONOMIA GLOBAL
export const taxonomyImportConfig: CSVImportConfig = {
  tableName: "global_taxonomy",
  displayName: "Taxonomia Global",
  
  columns: [
    { key: "code", label: "Código", required: true },
    { key: "name", label: "Nome", required: true },
    { key: "description", label: "Descrição", required: false },
    { key: "parent_code", label: "Código Pai", required: false },
    { key: "level", label: "Nível", required: true, transform: (v) => parseInt(v) || 1 },
    { key: "icon", label: "Ícone", required: false },
    { key: "color", label: "Cor", required: false },
    { key: "status", label: "Status", required: false },
    { key: "synonyms", label: "Sinônimos", required: false, transform: toArray },
    { key: "keywords", label: "Palavras-chave", required: false, transform: toArray },
  ],

  templateData: [
    { code: "pwa", name: "PWA", description: "Categoria raiz", parent_code: "", level: "1", icon: "Smartphone", color: "#3B82F6", status: "approved", synonyms: "", keywords: "app;mobile" },
    { code: "pwa.world", name: "Mundo", description: "Módulo economia", parent_code: "pwa", level: "2", icon: "Globe", color: "#10B981", status: "approved", synonyms: "economia", keywords: "indicadores;noticias" },
  ],

  validateRow: (row) => {
    if (row.level && (Number(row.level) < 1 || Number(row.level) > 5)) return "Nível deve estar entre 1 e 5";
    if (row.status && !["approved", "pending", "deprecated"].includes(String(row.status))) return "Status inválido";
    return null;
  },

  onInsert: async (data) => {
    const errors: string[] = [];
    let success = 0;

    // CORREÇÃO: Agrupar por nível e processar em ordem hierárquica
    const byLevel = new Map<number, typeof data>();
    for (const row of data) {
      const level = asNumberOrDefault(row.level, 1);
      if (!byLevel.has(level)) {
        byLevel.set(level, []);
      }
      byLevel.get(level)!.push(row);
    }

    // Ordenar níveis (1, 2, 3, 4, 5)
    const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);

    // Mapa de códigos → IDs (será atualizado a cada nível)
    const codeToId = new Map<string, string>();

    // Buscar códigos já existentes no banco
    const allCodes = data.map(d => asString(d.code));
    const { data: existing } = await supabase
      .from("global_taxonomy")
      .select("id, code")
      .in("code", allCodes);
    existing?.forEach((e) => codeToId.set(e.code, e.id));

    // Processar cada nível em ordem
    for (const level of levels) {
      const levelData = byLevel.get(level)!;

      // Buscar parent_ids para este nível
      const parentCodes = [...new Set(
        levelData.map(d => asString(d.parent_code)).filter(Boolean)
      )];

      // Se há parent_codes que ainda não estão no mapa, buscar do banco
      const missingParents = parentCodes.filter(pc => !codeToId.has(pc));
      if (missingParents.length > 0) {
        const { data: parents } = await supabase
          .from("global_taxonomy")
          .select("id, code")
          .in("code", missingParents);
        parents?.forEach((p) => codeToId.set(p.code, p.id));
      }

      // Preparar dados para insert
      const insertData = levelData.map((row) => ({
        code: asString(row.code),
        name: asString(row.name),
        description: asStringOrNull(row.description),
        parent_id: row.parent_code 
          ? codeToId.get(asString(row.parent_code)) || null 
          : null,
        level: asNumberOrDefault(row.level, 1),
        icon: asStringOrNull(row.icon),
        color: asStringOrNull(row.color),
        status: asStringOrNull(row.status) || "approved",
        synonyms: asStringArrayOrNull(row.synonyms),
        keywords: asStringArrayOrNull(row.keywords),
      }));

      // Verificar se há parent_code sem parent_id resolvido
      for (let i = 0; i < levelData.length; i++) {
        const row = levelData[i];
        const parentCode = asString(row.parent_code);
        if (parentCode && !insertData[i].parent_id) {
          errors.push(
            `Nível ${level}: Pai "${parentCode}" não encontrado para "${row.code}"`
          );
        }
      }

      // Inserir batch deste nível
      const batchSize = 50;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        const { data: inserted, error } = await supabase
          .from("global_taxonomy")
          .upsert(batch, { onConflict: "code" })
          .select("id, code");

        if (error) {
          errors.push(
            `Nível ${level}, Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`
          );
        } else {
          success += batch.length;
          // CRUCIAL: Atualizar mapa com IDs dos recém-inseridos
          inserted?.forEach((item) => codeToId.set(item.code, item.id));
        }
      }
    }

    return { success, errors };
  },
};

// 2. LÉXICO
export const lexiconImportConfig: CSVImportConfig = {
  tableName: "lexicon_terms",
  displayName: "Léxico (Dicionário)",

  columns: [
    { key: "term", label: "Termo", required: true },
    { key: "definition", label: "Definição", required: true },
    { key: "definition_simple", label: "Definição Simples", required: false },
    { key: "pronunciation_ipa", label: "Fonética IPA", required: false },
    { key: "pronunciation_phonetic", label: "Pronúncia", required: false },
    { key: "domain", label: "Domínio", required: false, transform: toArray },
    { key: "synonyms", label: "Sinônimos", required: false, transform: toArray },
  ],

  templateData: [
    { term: "SELIC", definition: "Taxa básica de juros", definition_simple: "A taxa de juros principal do Brasil", pronunciation_ipa: "/ˈsɛlik/", pronunciation_phonetic: "SÉ-liqui", domain: "economia", synonyms: "taxa básica" },
    { term: "IPCA", definition: "Índice de inflação", definition_simple: "Mede quanto os preços aumentaram", pronunciation_ipa: "/ipeka/", pronunciation_phonetic: "í-pe-cá", domain: "economia", synonyms: "inflação" },
  ],

  onInsert: async (data) => {
    const errors: string[] = [];
    let success = 0;

    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const insertData = batch.map((row) => ({
        term: asString(row.term),
        term_normalized: normalize(asString(row.term)),
        definition: asString(row.definition),
        definition_simple: asStringOrNull(row.definition_simple),
        pronunciation_ipa: asStringOrNull(row.pronunciation_ipa),
        pronunciation_phonetic: asStringOrNull(row.pronunciation_phonetic),
        domain: asStringArrayOrNull(row.domain),
        synonyms: asStringArrayOrNull(row.synonyms),
        is_approved: true,
      }));

      const { error } = await supabase.from("lexicon_terms").upsert(insertData, { onConflict: "term" });
      if (error) errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      else success += batch.length;
    }

    return { success, errors };
  },
};

// 3. FONÉTICA REGIONAL (PRONÚNCIAS)
// Insere no campo preferred_terms (JSON) da tabela regional_tone_rules
export const regionalPhoneticsImportConfig: CSVImportConfig = {
  tableName: "regional_tone_rules",
  displayName: "Pronúncias Regionais (TTS)",

  columns: [
    { key: "region_code", label: "Código Região", required: true },
    { key: "term", label: "Termo", required: true },
    { key: "pronunciation", label: "Pronúncia", required: true },
  ],

  templateData: [
    { region_code: "SUL", term: "IPCA", pronunciation: "í-pe-cá" },
    { region_code: "NORDESTE", term: "real", pronunciation: "réal" },
    { region_code: "SUDESTE_SP", term: "você", pronunciation: "cê" },
    { region_code: "SUDESTE_RJ", term: "ônibus", pronunciation: "busão" },
    { region_code: "CENTRO_OESTE", term: "trem", pronunciation: "uai" },
    { region_code: "NORTE", term: "açaí", pronunciation: "açaí" },
    { region_code: "SUDESTE_MG", term: "trem", pronunciation: "trem-bão" },
  ],

  validateRow: (row) => {
    const validRegions = [
      "SUL", "NORDESTE", "NORTE", "CENTRO_OESTE",
      "SUDESTE_SP", "SUDESTE_RJ", "SUDESTE_MG",
    ];
    const regionCode = String(row.region_code || "").toUpperCase().trim();
    if (!validRegions.includes(regionCode)) {
      return `Região inválida: ${regionCode}. Use: ${validRegions.join(", ")}`;
    }
    return null;
  },

  onInsert: async (data) => {
    const errors: string[] = [];
    let success = 0;

    // Mapeamento CSV → banco de dados
    const csvToDb: Record<string, string> = {
      SUL: "sul",
      NORDESTE: "nordeste",
      NORTE: "norte",
      CENTRO_OESTE: "centro-oeste",
      SUDESTE_SP: "sudeste-sp",
      SUDESTE_RJ: "sudeste-rj",
      SUDESTE_MG: "sudeste-mg",
    };

    // 1. Buscar todas as regiões existentes
    const { data: regions, error: fetchError } = await supabase
      .from("regional_tone_rules")
      .select("id, region_code, preferred_terms");

    if (fetchError) {
      errors.push(`Erro ao buscar regiões: ${fetchError.message}`);
      return { success: 0, errors };
    }

    // 2. Criar mapa de region_code → região
    const regionMap = new Map<
      string,
      { id: string; preferred_terms: Record<string, string> }
    >();
    regions?.forEach((r) => {
      regionMap.set(r.region_code, {
        id: r.id,
        preferred_terms: (r.preferred_terms as Record<string, string>) || {},
      });
    });

    // 3. Agrupar dados por região
    const byRegion = new Map<string, Array<{ term: string; pronunciation: string }>>();
    for (const row of data) {
      const csvCode = String(row.region_code).toUpperCase().trim();
      const dbCode = csvToDb[csvCode] || csvCode.toLowerCase();
      const term = String(row.term).trim();
      const pronunciation = String(row.pronunciation).trim();

      if (!byRegion.has(dbCode)) {
        byRegion.set(dbCode, []);
      }
      byRegion.get(dbCode)!.push({ term, pronunciation });
    }

    // 4. Atualizar cada região (merge no preferred_terms)
    for (const [regionCode, terms] of byRegion) {
      const region = regionMap.get(regionCode);

      if (!region) {
        errors.push(`Região não encontrada: ${regionCode}`);
        continue;
      }

      // Merge dos termos existentes + novos
      const updatedTerms = { ...region.preferred_terms };
      terms.forEach((t) => {
        updatedTerms[t.term] = t.pronunciation;
      });

      const { error: updateError } = await supabase
        .from("regional_tone_rules")
        .update({ preferred_terms: updatedTerms })
        .eq("id", region.id);

      if (updateError) {
        errors.push(`Erro ao atualizar ${regionCode}: ${updateError.message}`);
      } else {
        success += terms.length;
      }
    }

    return { success, errors };
  },
};

// 4. ONTOLOGIA CONCEITOS
export const ontologyImportConfig: CSVImportConfig = {
  tableName: "ontology_concepts",
  displayName: "Ontologia (Conceitos)",

  columns: [
    { key: "name", label: "Nome", required: true },
    { key: "description", label: "Descrição", required: false },
    { key: "taxonomy_code", label: "Código Taxonomia", required: false },
    { key: "properties", label: "Propriedades (JSON)", required: false },
  ],

  templateData: [
    { name: "Inflação", description: "Aumento dos preços", taxonomy_code: "pwa.world.indicadores", properties: '{"type":"indicador"}' },
    { name: "Taxa de Juros", description: "Custo do dinheiro", taxonomy_code: "", properties: '{}' },
  ],

  validateRow: (row) => {
    if (row.properties) {
      try { JSON.parse(String(row.properties)); } 
      catch { return "Propriedades devem ser JSON válido"; }
    }
    return null;
  },

  onInsert: async (data) => {
    const errors: string[] = [];
    let success = 0;

    const taxCodes = [...new Set(data.map((d) => d.taxonomy_code).filter(Boolean))];
    const taxMap = new Map<string, string>();

    if (taxCodes.length > 0) {
      const { data: taxonomies } = await supabase.from("global_taxonomy").select("id, code").in("code", taxCodes as string[]);
      taxonomies?.forEach((t) => taxMap.set(t.code, t.id));
    }

    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const insertData = batch.map((row) => {
        let props = null;
        try { props = row.properties ? JSON.parse(String(row.properties)) : null; } catch { props = null; }
        return {
          name: asString(row.name),
          name_normalized: normalize(asString(row.name)),
          description: asStringOrNull(row.description),
          taxonomy_id: row.taxonomy_code ? taxMap.get(String(row.taxonomy_code)) || null : null,
          properties: props,
        };
      });

      const { error } = await supabase.from("ontology_concepts").upsert(insertData, { onConflict: "name" });
      if (error) errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      else success += batch.length;
    }

    return { success, errors };
  },
};

// 5. ONTOLOGIA RELAÇÕES
export const ontologyRelationsImportConfig: CSVImportConfig = {
  tableName: "ontology_relations",
  displayName: "Relações Ontológicas",

  columns: [
    { key: "subject_name", label: "Conceito Origem", required: true },
    { key: "predicate", label: "Tipo Relação", required: true },
    { key: "object_name", label: "Conceito Destino", required: true },
    { key: "weight", label: "Peso (0-1)", required: false, transform: toNumber },
  ],

  templateData: [
    { subject_name: "SELIC", predicate: "influences", object_name: "Inflação", weight: "0.8" },
    { subject_name: "Inflação", predicate: "measures", object_name: "IPCA", weight: "1.0" },
  ],

  validateRow: (row) => {
    const validPredicates = ["is_a", "part_of", "causes", "measures", "influences", "related_to"];
    if (!validPredicates.includes(String(row.predicate))) return `Tipo inválido: ${row.predicate}`;
    return null;
  },

  onInsert: async (data) => {
    const errors: string[] = [];
    let success = 0;

    const conceptNames = [...new Set([...data.map((d) => d.subject_name), ...data.map((d) => d.object_name)].filter(Boolean))];
    const conceptMap = new Map<string, string>();

    if (conceptNames.length > 0) {
      const { data: concepts } = await supabase.from("ontology_concepts").select("id, name").in("name", conceptNames as string[]);
      concepts?.forEach((c) => conceptMap.set(c.name, c.id));
    }

    for (const row of data) {
      const subjectId = conceptMap.get(asString(row.subject_name));
      const objectId = conceptMap.get(asString(row.object_name));

      if (!subjectId) { errors.push(`Conceito não encontrado: "${row.subject_name}"`); continue; }
      if (!objectId) { errors.push(`Conceito não encontrado: "${row.object_name}"`); continue; }

      const { error } = await supabase.from("ontology_relations").insert({
        subject_id: subjectId,
        predicate: asString(row.predicate),
        object_id: objectId,
        weight: asNumberOrDefault(row.weight, 1.0),
      });

      if (error && error.code !== "23505") errors.push(`${row.subject_name} → ${row.object_name}: ${error.message}`);
      else if (!error) success++;
    }

    return { success, errors };
  },
};
