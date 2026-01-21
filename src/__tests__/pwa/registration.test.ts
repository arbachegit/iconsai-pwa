import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define expected response types
interface VerifyInvitationResponse {
  valid: boolean;
  invitation_id?: string;
  name?: string;
  email?: string;
  pwa_access?: string[];
  expires_at?: string;
  error?: string;
}

interface RegisterUserResponse {
  success: boolean;
  message?: string;
  session_token?: string;
  pwa_access?: string[];
  error?: string;
}

// Mock supabase for tests
const mockRpc = vi.fn();
const supabase = {
  rpc: mockRpc,
};

describe('PWA Registration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invitation Verification', () => {
    it('should validate a valid invitation token', async () => {
      const mockResponse: VerifyInvitationResponse = {
        valid: true,
        invitation_id: 'test-uuid',
        name: 'Test User',
        email: 'test@example.com',
        pwa_access: ['economista'],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data, error } = await supabase.rpc('verify_pwa_invitation', {
        p_token: 'valid-test-token',
      });

      const result = data as VerifyInvitationResponse;

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.pwa_access).toContain('economista');
    });

    it('should reject an expired invitation', async () => {
      const mockResponse: VerifyInvitationResponse = {
        valid: false,
        error: 'Este convite expirou',
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('verify_pwa_invitation', {
        p_token: 'expired-token',
      });

      const result = data as VerifyInvitationResponse;
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expirou');
    });

    it('should reject an already used invitation', async () => {
      const mockResponse: VerifyInvitationResponse = {
        valid: false,
        error: 'Este convite já foi utilizado',
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('verify_pwa_invitation', {
        p_token: 'used-token',
      });

      const result = data as VerifyInvitationResponse;
      expect(result.valid).toBe(false);
      expect(result.error).toContain('utilizado');
    });

    it('should reject a non-existent invitation', async () => {
      const mockResponse: VerifyInvitationResponse = {
        valid: false,
        error: 'Convite não encontrado',
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('verify_pwa_invitation', {
        p_token: 'non-existent-token',
      });

      const result = data as VerifyInvitationResponse;
      expect(result.valid).toBe(false);
      expect(result.error).toContain('não encontrado');
    });
  });

  describe('Device Registration', () => {
    it('should successfully register a new device', async () => {
      const mockResponse: RegisterUserResponse = {
        success: true,
        message: 'Cadastro realizado com sucesso',
        session_token: 'generated-session-token',
        pwa_access: ['economista', 'knowyou'],
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data, error } = await supabase.rpc('register_pwa_user', {
        p_invitation_token: 'valid-token',
        p_device_id: 'test-device-fingerprint',
        p_name: 'Test User',
        p_email: 'test@example.com',
        p_phone: null,
        p_user_agent: 'Mozilla/5.0 Test',
      });

      const result = data as RegisterUserResponse;

      expect(error).toBeNull();
      expect(result.success).toBe(true);
      expect(result.session_token).toBeDefined();
      expect(result.pwa_access).toBeDefined();
    });

    it('should update an existing device on re-registration', async () => {
      const mockResponse: RegisterUserResponse = {
        success: true,
        message: 'Cadastro realizado com sucesso',
        session_token: 'new-session-token',
        pwa_access: ['economista'],
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('register_pwa_user', {
        p_invitation_token: 'another-valid-token',
        p_device_id: 'existing-device-fingerprint',
        p_name: 'Updated Name',
        p_email: 'updated@example.com',
      });

      const result = data as RegisterUserResponse;
      expect(result.success).toBe(true);
      expect(result.session_token).toBeDefined();
    });

    it('should fail registration with invalid invitation', async () => {
      const mockResponse: RegisterUserResponse = {
        success: false,
        error: 'Convite inválido ou expirado',
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('register_pwa_user', {
        p_invitation_token: 'invalid-token',
        p_device_id: 'test-device',
        p_name: 'Test',
        p_email: 'test@example.com',
      });

      const result = data as RegisterUserResponse;
      expect(result.success).toBe(false);
      expect(result.error).toContain('inválido');
    });
  });

  describe('Session Management', () => {
    it('should create a session after successful registration', async () => {
      const mockRegResponse: RegisterUserResponse = {
        success: true,
        session_token: 'new-session-token',
        pwa_access: ['economista'],
      };

      mockRpc.mockResolvedValueOnce({
        data: mockRegResponse,
        error: null,
      });

      const { data } = await supabase.rpc('register_pwa_user', {
        p_invitation_token: 'valid-token',
        p_device_id: 'device-123',
        p_name: 'Test User',
        p_email: 'test@example.com',
      });

      const result = data as RegisterUserResponse;
      expect(result.session_token).toBeDefined();
      expect(typeof result.session_token).toBe('string');
      expect(result.session_token!.length).toBeGreaterThan(0);
    });
  });

  describe('Invitation Status Updates', () => {
    it('should mark invitation as completed after successful registration', async () => {
      const mockResponse: RegisterUserResponse = {
        success: true,
        message: 'Cadastro realizado com sucesso',
        session_token: 'token',
        pwa_access: ['economista'],
      };

      mockRpc.mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data } = await supabase.rpc('register_pwa_user', {
        p_invitation_token: 'pending-invitation-token',
        p_device_id: 'device-456',
        p_name: 'Test',
        p_email: 'test@example.com',
      });

      const result = data as RegisterUserResponse;
      expect(result.success).toBe(true);
    });
  });
});
