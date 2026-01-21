import { beforeAll, afterAll, vi } from 'vitest';

// Mock Supabase client for tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  },
}));

beforeAll(() => {
  console.log('[Test Setup] Initializing test environment...');
});

afterAll(() => {
  console.log('[Test Setup] Cleaning up test environment...');
});
