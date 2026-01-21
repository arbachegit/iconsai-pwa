/**
 * ============================================================
 * utils/safari-storage.ts
 * ============================================================
 * Versão: 1.0.0 - 2026-01-10
 * Storage com fallback para Safari modo privado
 * ============================================================
 */

// Fallback em memória
const memoryStorage: Map<string, string> = new Map();

export function safeGetItem(key: string): string | null {
  // Tentar localStorage primeiro
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // localStorage bloqueado
  }
  
  // Tentar sessionStorage
  try {
    const value = sessionStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // sessionStorage bloqueado
  }
  
  // Fallback: memória
  return memoryStorage.get(key) || null;
}

export function safeSetItem(key: string, value: string): boolean {
  let saved = false;
  
  // Tentar localStorage
  try {
    localStorage.setItem(key, value);
    saved = true;
  } catch {
    // localStorage bloqueado
  }
  
  // Tentar sessionStorage como backup
  try {
    sessionStorage.setItem(key, value);
    saved = true;
  } catch {
    // sessionStorage bloqueado
  }
  
  // Sempre salvar em memória como último recurso
  memoryStorage.set(key, value);
  
  return saved;
}

export function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch {}
  try { sessionStorage.removeItem(key); } catch {}
  memoryStorage.delete(key);
}

export function safeClear(): void {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  memoryStorage.clear();
}

// Verificar qual storage está disponível
export function getAvailableStorage(): 'localStorage' | 'sessionStorage' | 'memory' {
  try {
    localStorage.setItem('__storage_test__', '1');
    localStorage.removeItem('__storage_test__');
    return 'localStorage';
  } catch {
    try {
      sessionStorage.setItem('__storage_test__', '1');
      sessionStorage.removeItem('__storage_test__');
      return 'sessionStorage';
    } catch {
      return 'memory';
    }
  }
}
