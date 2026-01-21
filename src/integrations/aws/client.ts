// AWS Client - Drop-in replacement for Supabase client
// Maintains the same interface to minimize code changes

import { awsConfig } from './config';
import { CognitoAuth, type User, type Session } from './cognito-auth';
import { PostgrestClient } from './postgrest-client';
import { S3Storage } from './s3-storage';

class AWSClient {
  auth: CognitoAuth;
  storage: S3Storage;
  private postgrest: PostgrestClient;

  constructor() {
    this.auth = new CognitoAuth(awsConfig.cognito);
    this.postgrest = new PostgrestClient(awsConfig.database.endpoint);
    this.storage = new S3Storage(awsConfig.storage);
  }

  // Database query methods - mimics Supabase interface
  from(table: string) {
    return this.postgrest.from(table);
  }

  // RPC calls for stored procedures
  rpc(fn: string, params?: Record<string, unknown>) {
    return this.postgrest.rpc(fn, params);
  }

  // Channel subscriptions (realtime) - stub for now
  channel(name: string) {
    console.warn('Realtime channels not yet implemented for AWS');
    return {
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} }),
    };
  }

  removeChannel(channel: unknown) {
    // No-op for now
  }
}

// Export singleton instance
export const supabase = new AWSClient();

// Re-export types for compatibility
export type { User, Session };
