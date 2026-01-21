/**
 * Typed Supabase Client Helpers
 *
 * Este arquivo fornece um cliente tipado para contornar o problema de inferência
 * do TypeScript com schemas muito grandes (130+ tabelas).
 *
 * O erro "Type instantiation is excessively deep and possibly infinite" ocorre
 * porque o TypeScript não consegue inferir os tipos corretamente com tantas tabelas.
 *
 * Solução: Criar um cliente separado sem tipagem estrita.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente Supabase sem tipagem estrita.
 * Usar em componentes com muitas operações de tabela para evitar erros de inferência.
 *
 * IMPORTANTE: Use este cliente apenas quando o cliente tipado causar erros TS2589.
 */
export const supabaseUntyped = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
