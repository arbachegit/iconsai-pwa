/**
 * Brasil Data Hub - TypeScript Types
 * 
 * Tipos para as tabelas do banco de dados de dados públicos brasileiros
 */

// ============================================
// GEOGRAFIA (IBGE)
// ============================================

export interface GeoRegiao {
    id: string;
    codigo_ibge: string;
    nome: string;
    sigla: string;
    created_at?: string;
}

export interface GeoEstado {
    id: string;
    codigo_ibge: string;
    nome: string;
    sigla: string;
    regiao_id: string;
    capital?: string;
    area_km2?: number;
    populacao?: number;
    created_at?: string;
}

export interface GeoMunicipio {
    id: string;
    codigo_ibge: string;
    nome: string;
    estado_id: string;
    latitude?: number;
    longitude?: number;
    area_km2?: number;
    populacao?: number;
    pib?: number;
    idh?: number;
    created_at?: string;
}

// ============================================
// SANEAMENTO (SNIS)
// ============================================

export interface SaneamentoIndicadoresMunicipio {
    id: string;
    municipio_id: string;
    ano_referencia: number;
    indice_atendimento_agua?: number;
    indice_atendimento_esgoto?: number;
    indice_tratamento_esgoto?: number;
    indice_perdas_distribuicao?: number;
    taxa_cobertura_coleta_residuos?: number;
    indice_saneamento_basico?: number;
    fonte?: string;
    created_at?: string;
}

export interface SaneamentoAgua {
    id: string;
    municipio_id: string;
    prestador_id?: string;
    ano_referencia: number;
    populacao_atendida?: number;
    volume_produzido?: number;
    volume_consumido?: number;
    extensao_rede?: number;
    ligacoes_ativas?: number;
    created_at?: string;
}

export interface SaneamentoEsgoto {
    id: string;
    municipio_id: string;
    prestador_id?: string;
    ano_referencia: number;
    populacao_atendida?: number;
    volume_coletado?: number;
    volume_tratado?: number;
    extensao_rede?: number;
    ligacoes_ativas?: number;
    created_at?: string;
}

// ============================================
// DATABASE TYPE (Supabase)
// ============================================

export interface BrasilDataHubDatabase {
    public: {
          Tables: {
                  geo_regioes: {
                            Row: GeoRegiao;
                            Insert: Omit<GeoRegiao, 'id' | 'created_at'>;
                            Update: Partial<Omit<GeoRegiao, 'id'>>;
                  };
                  geo_estados: {
                    Row: GeoEstado;
                    Insert: Omit<GeoEstado, 'id' | 'created_at'>;
                    Update: Partial<Omit<GeoEstado, 'id'>>;
                  };
                  geo_municipios: {
                    Row: GeoMunicipio;
                    Insert: Omit<GeoMunicipio, 'id' | 'created_at'>;
                    Update: Partial<Omit<GeoMunicipio, 'id'>>;
                  };
                  saneamento_indicadores_municipio: {
                    Row: SaneamentoIndicadoresMunicipio;
                    Insert: Omit<SaneamentoIndicadoresMunicipio, 'id' | 'created_at'>;
                    Update: Partial<Omit<SaneamentoIndicadoresMunicipio, 'id'>>;
                  };
                  saneamento_agua: {
                    Row: SaneamentoAgua;
                    Insert: Omit<SaneamentoAgua, 'id' | 'created_at'>;
                    Update: Partial<Omit<SaneamentoAgua, 'id'>>;
                  };
                  saneamento_esgoto: {
                    Row: SaneamentoEsgoto;
                    Insert: Omit<SaneamentoEsgoto, 'id' | 'created_at'>;
                    Update: Partial<Omit<SaneamentoEsgoto, 'id'>>;
                  };
          };
    };
}
