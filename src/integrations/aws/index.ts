// AWS Integration Module
// Drop-in replacement for Supabase

export { supabase } from './client';
export type { User, Session } from './cognito-auth';
export { awsConfig, rdsConfig } from './config';
