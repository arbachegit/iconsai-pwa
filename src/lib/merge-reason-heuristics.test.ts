/**
 * Unit tests for merge reason heuristics
 * Run with: npx vitest run src/lib/merge-reason-heuristics.test.ts
 */

import { describe, it, expect } from 'vitest';
import { 
  suggestMergeReasons, 
  suggestMergeReasonsForTags 
} from './merge-reason-heuristics';

describe('Merge Reason Heuristics', () => {

  describe('Synonymy Detection (synonymy)', () => {
    it('should detect medical synonyms - doenca/enfermidade', () => {
      const result = suggestMergeReasons('Doença', 'Enfermidade');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect medical synonyms - medico/doutor', () => {
      const result = suggestMergeReasons('Médico', 'Doutor');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect medical synonyms - remedio/medicamento', () => {
      const result = suggestMergeReasons('Remédio', 'Medicamento');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect business synonyms - gestao/administracao', () => {
      const result = suggestMergeReasons('Gestão', 'Administração');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect business synonyms - cliente/consumidor', () => {
      const result = suggestMergeReasons('Cliente', 'Consumidor');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect tech synonyms - erro/falha', () => {
      const result = suggestMergeReasons('Erro', 'Falha');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should detect synonyms within the same group', () => {
      const result = suggestMergeReasons('Enfermidade', 'Patologia');
      expect(result.reasons.synonymy).toBe(true);
    });

    it('should have high confidence for synonym detection', () => {
      const result = suggestMergeReasons('Doença', 'Enfermidade');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  
  describe('Plural/Singular Detection (grammaticalVariation)', () => {
    it('should detect simple -s plural', () => {
      const result = suggestMergeReasons('Paciente', 'Pacientes');
      expect(result.reasons.grammaticalVariation).toBe(true);
    });

    it('should detect -ões/-ão plural', () => {
      const result = suggestMergeReasons('Coração', 'Corações');
      expect(result.reasons.grammaticalVariation).toBe(true);
    });

    it('should detect -ais/-al plural', () => {
      const result = suggestMergeReasons('Hospital', 'Hospitais');
      expect(result.reasons.grammaticalVariation).toBe(true);
    });

    it('should detect -eis/-el plural', () => {
      const result = suggestMergeReasons('Papel', 'Papéis');
      expect(result.reasons.grammaticalVariation).toBe(true);
    });

    it('should detect -ns/-m plural', () => {
      const result = suggestMergeReasons('Exame', 'Exames');
      expect(result.reasons.grammaticalVariation).toBe(true);
    });
  });

  describe('Spelling Variation Detection (spellingVariation)', () => {
    it('should detect accent variation', () => {
      const result = suggestMergeReasons('Relatorio', 'Relatório');
      expect(result.reasons.spellingVariation).toBe(true);
    });

    it('should detect hyphen variation', () => {
      const result = suggestMergeReasons('e-mail', 'email');
      expect(result.reasons.spellingVariation).toBe(true);
    });

    it('should detect E-mail vs Email', () => {
      const result = suggestMergeReasons('E-mail', 'Email');
      expect(result.reasons.spellingVariation).toBe(true);
    });
  });

  describe('Acronym Detection (acronym)', () => {
    it('should detect RH -> Recursos Humanos', () => {
      const result = suggestMergeReasons('RH', 'Recursos Humanos');
      expect(result.reasons.acronym).toBe(true);
    });

    it('should detect TI -> Tecnologia da Informação', () => {
      const result = suggestMergeReasons('TI', 'Tecnologia da Informação');
      expect(result.reasons.acronym).toBe(true);
    });

    it('should detect UTI -> Unidade de Terapia Intensiva', () => {
      const result = suggestMergeReasons('UTI', 'Unidade de Terapia Intensiva');
      expect(result.reasons.acronym).toBe(true);
    });

    it('should detect IA -> Inteligência Artificial', () => {
      const result = suggestMergeReasons('IA', 'Inteligência Artificial');
      expect(result.reasons.acronym).toBe(true);
    });
  });

  describe('Typo Detection (typo)', () => {
    it('should detect single character typo', () => {
      const result = suggestMergeReasons('Finaceiro', 'Financeiro');
      expect(result.reasons.typo).toBe(true);
    });

    it('should detect transposition typo', () => {
      const result = suggestMergeReasons('Hosptial', 'Hospital');
      expect(result.reasons.typo).toBe(true);
    });

    it('should detect missing letter typo', () => {
      const result = suggestMergeReasons('Tratamento', 'Tratameno');
      expect(result.reasons.typo).toBe(true);
    });
  });

  describe('Language Equivalence Detection (languageEquivalence)', () => {
    it('should detect saude/health', () => {
      const result = suggestMergeReasons('Saúde', 'Health');
      expect(result.reasons.languageEquivalence).toBe(true);
    });

    it('should detect paciente/patient', () => {
      const result = suggestMergeReasons('Paciente', 'Patient');
      expect(result.reasons.languageEquivalence).toBe(true);
    });

    it('should detect medico/doctor', () => {
      const result = suggestMergeReasons('Médico', 'Doctor');
      expect(result.reasons.languageEquivalence).toBe(true);
    });

    it('should detect tratamento/treatment', () => {
      const result = suggestMergeReasons('Tratamento', 'Treatment');
      expect(result.reasons.languageEquivalence).toBe(true);
    });

    it('should detect emergencia/emergency', () => {
      const result = suggestMergeReasons('Emergência', 'Emergency');
      expect(result.reasons.languageEquivalence).toBe(true);
    });
  });

  describe('Generalization Detection (generalization)', () => {
    it('should detect temporal patterns', () => {
      const result = suggestMergeReasons('NF Janeiro', 'NF Fevereiro');
      expect(result.reasons.generalization).toBe(true);
    });

    it('should detect year patterns', () => {
      const result = suggestMergeReasons('Relatório 2023', 'Relatório 2024');
      expect(result.reasons.generalization).toBe(true);
    });
  });

  describe('Multiple Tags Analysis', () => {
    it('should aggregate reasons from multiple tags', () => {
      const result = suggestMergeReasonsForTags(['Paciente', 'Pacientes', 'Patient']);
      expect(result.reasons.grammaticalVariation).toBe(true);
      expect(result.reasons.languageEquivalence).toBe(true);
    });

    it('should return empty for single tag', () => {
      const result = suggestMergeReasonsForTags(['Paciente']);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for acronym detection', () => {
      const result = suggestMergeReasons('RH', 'Recursos Humanos');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have lower confidence for typo detection', () => {
      const result = suggestMergeReasons('Finaceiro', 'Financeiro');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = suggestMergeReasons('', '');
      expect(result.confidence).toBe(0);
    });

    it('should handle identical strings', () => {
      const result = suggestMergeReasons('Paciente', 'Paciente');
      expect(Object.values(result.reasons).some(v => v)).toBe(false);
    });

    it('should handle completely different strings', () => {
      const result = suggestMergeReasons('Banana', 'Computador');
      expect(Object.values(result.reasons).some(v => v)).toBe(false);
    });
  });
});
