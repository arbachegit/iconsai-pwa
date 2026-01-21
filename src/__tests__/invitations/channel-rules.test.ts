import { describe, it, expect } from 'vitest';
import {
  getAllowedChannels,
  getForcedChannels,
  getValidationErrors,
  isPwaOnly,
  getMandatorySendPlan,
  getChannelDescription,
} from '@/lib/invitations/channel-rules';

describe('Invitation Channel Rules', () => {
  describe('getAllowedChannels (deprecated but maintained)', () => {
    it('should only allow WhatsApp for PWA-only invitations', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(result.email).toBe(false);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(false);
    });

    it('should disable all channels for PWA-only without phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
      });
      
      expect(result.email).toBe(false);
      expect(result.whatsapp).toBe(false);
      expect(result.both).toBe(false);
    });

    it('should allow all channels for Platform-only with phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(true);
    });

    it('should allow only email for Platform-only without phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(false);
      expect(result.both).toBe(false);
    });

    it('should allow all channels for Both access with phone', () => {
      const result = getAllowedChannels({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.email).toBe(true);
      expect(result.whatsapp).toBe(true);
      expect(result.both).toBe(true);
    });
  });

  describe('getForcedChannels (deprecated but maintained)', () => {
    it('should force WhatsApp for PWA-only', () => {
      const result = getForcedChannels({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBe('whatsapp');
      expect(result.reason).toContain('WhatsApp');
    });

    it('should not force any channel for Platform-only', () => {
      const result = getForcedChannels({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBeNull();
      expect(result.reason).toBeNull();
    });

    it('should not force any channel for Both access', () => {
      const result = getForcedChannels({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(result.forcedChannel).toBeNull();
      expect(result.reason).toBeNull();
    });
  });

  describe('getValidationErrors', () => {
    it('should return phone error when PWA-only without phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'phone')).toBe(true);
    });

    it('should return no errors for valid PWA-only with phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(errors.length).toBe(0);
    });

    it('should return no errors for Platform-only without phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(errors.length).toBe(0);
    });

    it('should return phone error when Both access without phone', () => {
      const errors = getValidationErrors({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'phone')).toBe(true);
    });
  });

  describe('getMandatorySendPlan', () => {
    it('should require only WhatsApp for PWA-only', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(plan.canProceed).toBe(true);
      expect(plan.email.required).toBe(false);
      expect(plan.whatsapp.required).toBe(true);
      expect(plan.whatsapp.products).toContain('app');
    });

    it('should block PWA-only without phone', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
      });
      
      expect(plan.canProceed).toBe(false);
      expect(plan.blockingReason).toContain('Telefone');
    });

    it('should require Email for Platform-only', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(plan.canProceed).toBe(true);
      expect(plan.email.required).toBe(true);
      expect(plan.email.product).toBe('platform');
      expect(plan.whatsapp.products.length).toBe(0);
    });

    it('should add informative WhatsApp for Platform-only with phone', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(plan.canProceed).toBe(true);
      expect(plan.email.required).toBe(true);
      expect(plan.whatsapp.products).toContain('platform_info');
    });

    it('should require Email + WhatsApp for Both access', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(plan.canProceed).toBe(true);
      expect(plan.email.required).toBe(true);
      expect(plan.whatsapp.required).toBe(true);
      expect(plan.whatsapp.products).toContain('app');
      expect(plan.whatsapp.products).toContain('platform_info');
    });

    it('should block Both access without phone', () => {
      const plan = getMandatorySendPlan({
        hasAppAccess: true,
        hasPlatformAccess: true,
        hasPhone: false,
      });
      
      expect(plan.canProceed).toBe(false);
      expect(plan.blockingReason).toContain('Telefone');
    });
  });

  describe('getChannelDescription', () => {
    it('should describe PWA-only channels', () => {
      const desc = getChannelDescription({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: true,
      });
      
      expect(desc).toContain('WhatsApp');
      expect(desc).toContain('APP');
    });

    it('should describe Platform-only channels', () => {
      const desc = getChannelDescription({
        hasAppAccess: false,
        hasPlatformAccess: true,
        hasPhone: true,
      });
      
      expect(desc).toContain('Email');
      expect(desc).toContain('Plataforma');
    });

    it('should show warning when blocked', () => {
      const desc = getChannelDescription({
        hasAppAccess: true,
        hasPlatformAccess: false,
        hasPhone: false,
      });
      
      expect(desc).toContain('⚠️');
    });
  });

  describe('isPwaOnly', () => {
    it('should return true for "app" product', () => {
      expect(isPwaOnly('app')).toBe(true);
    });

    it('should return false for "platform" product', () => {
      expect(isPwaOnly('platform')).toBe(false);
    });

    it('should return false for "both" product', () => {
      expect(isPwaOnly('both')).toBe(false);
    });
  });
});
