// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { emails } = await req.json();

    if (!emails || !Array.isArray(emails)) {
      console.error('[check-existing-emails] Invalid input: emails must be an array');
      return new Response(
        JSON.stringify({ error: 'emails must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-existing-emails] Checking ${emails.length} emails`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check emails in auth.users table
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('[check-existing-emails] Error fetching auth users:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to check auth users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing emails from auth.users
    const authEmails = authUsers.users
      .map(u => u.email?.toLowerCase())
      .filter(Boolean) as string[];

    // Check emails in user_registrations table
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('user_registrations')
      .select('email')
      .in('email', emails.map(e => e.toLowerCase()));

    if (regError) {
      console.error('[check-existing-emails] Error fetching registrations:', regError);
      return new Response(
        JSON.stringify({ error: 'Failed to check registrations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const registrationEmails = registrations?.map(r => r.email.toLowerCase()) || [];

    // Find which input emails exist in either table
    const existingEmails: { email: string; source: 'auth' | 'registration' | 'both' }[] = [];
    
    for (const email of emails) {
      const lowerEmail = email.toLowerCase();
      const inAuth = authEmails.includes(lowerEmail);
      const inReg = registrationEmails.includes(lowerEmail);
      
      if (inAuth && inReg) {
        existingEmails.push({ email: lowerEmail, source: 'both' });
      } else if (inAuth) {
        existingEmails.push({ email: lowerEmail, source: 'auth' });
      } else if (inReg) {
        existingEmails.push({ email: lowerEmail, source: 'registration' });
      }
    }

    console.log(`[check-existing-emails] Found ${existingEmails.length} existing emails`);

    return new Response(
      JSON.stringify({ existingEmails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-existing-emails] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
