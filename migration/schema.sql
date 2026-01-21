--
-- PostgreSQL database dump
--

\restrict HkEec4DcNSeOoDcv76gcMbn5aXgHKwsN3MaJRxGEdL0l8c4b2KOAqewk9XF11qP

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: check_pwa_access(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_pwa_access(p_phone text) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM pwa_sessions 
      WHERE phone = (
        CASE 
          WHEN length(regexp_replace(p_phone, '[^0-9]', '', 'g')) = 11 
          THEN '55' || regexp_replace(p_phone, '[^0-9]', '', 'g')
          ELSE regexp_replace(p_phone, '[^0-9]', '', 'g')
        END
      )
      AND is_verified = true 
      AND session_expires_at > NOW()
    )
    THEN jsonb_build_object(
      'has_access', true,
      'user_name', (SELECT user_name FROM pwa_sessions WHERE phone = (
        CASE 
          WHEN length(regexp_replace(p_phone, '[^0-9]', '', 'g')) = 11 
          THEN '55' || regexp_replace(p_phone, '[^0-9]', '', 'g')
          ELSE regexp_replace(p_phone, '[^0-9]', '', 'g')
        END
      ) LIMIT 1),
      'expires_at', (SELECT session_expires_at FROM pwa_sessions WHERE phone = (
        CASE 
          WHEN length(regexp_replace(p_phone, '[^0-9]', '', 'g')) = 11 
          THEN '55' || regexp_replace(p_phone, '[^0-9]', '', 'g')
          ELSE regexp_replace(p_phone, '[^0-9]', '', 'g')
        END
      ) LIMIT 1)
    )
    ELSE jsonb_build_object('has_access', false)
  END;
$$;


--
-- Name: login_pwa(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.login_pwa(p_phone text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invite RECORD;
  v_code TEXT;
  v_phone TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Normalizar telefone (remover formatação)
  v_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Adicionar código do país se necessário
  IF length(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- ÚNICA VERIFICAÇÃO: número existe em pwa_invites com status accepted?
  SELECT * INTO v_invite
  FROM pwa_invites
  WHERE phone = v_phone AND status = 'accepted'
  LIMIT 1;

  -- Se não tem convite aceito, não pode acessar
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Você precisa de um convite para acessar',
      'phone', v_phone
    );
  END IF;

  -- TEM CONVITE! Gerar código de verificação
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- Limpar sessões antigas deste telefone (todas)
  DELETE FROM pwa_sessions WHERE phone = v_phone;
  
  -- Criar nova sessão com código
  INSERT INTO pwa_sessions (
    phone, 
    user_name, 
    verification_code, 
    is_verified,
    verification_code_expires_at, 
    verification_attempts, 
    created_at, 
    updated_at
  ) VALUES (
    v_phone, 
    v_invite.name, 
    v_code, 
    false,
    v_now + INTERVAL '10 minutes', 
    0, 
    v_now, 
    v_now
  );

  -- Retornar sucesso com código
  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_invite.name,
    'phone', v_phone,
    'expires_in', 600
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'phone', v_phone
  );
END;
$$;


--
-- Name: search_documents(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_documents(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_vimeo_videos_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vimeo_videos_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_pwa_code(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_pwa_code(p_phone text, p_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_session RECORD;
  v_phone TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Normalizar telefone
  v_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- Buscar sessão
  SELECT * INTO v_session FROM pwa_sessions WHERE phone = v_phone LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- Verificar expiração
  IF v_session.verification_code_expires_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_expired');
  END IF;

  -- Verificar tentativas
  IF v_session.verification_attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts');
  END IF;

  -- Verificar código
  IF v_session.verification_code != p_code THEN
    UPDATE pwa_sessions SET verification_attempts = verification_attempts + 1 WHERE phone = v_phone;
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- Sucesso! Atualizar sessão e convite
  UPDATE pwa_sessions SET
    is_verified = true,
    verified_at = v_now,
    session_expires_at = v_now + INTERVAL '90 days',
    verification_code = NULL,
    updated_at = v_now
  WHERE phone = v_phone;

  UPDATE pwa_invites SET status = 'accepted', accepted_at = v_now WHERE phone = v_phone;

  RETURN jsonb_build_object(
    'success', true,
    'user_name', v_session.user_name,
    'expires_at', v_now + INTERVAL '90 days'
  );
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource text,
    resource_id uuid,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    message text,
    type text DEFAULT 'info'::text,
    is_read boolean DEFAULT false,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_audio_enabled boolean DEFAULT true,
    auto_play_audio boolean DEFAULT true,
    gmail_api_configured boolean DEFAULT false,
    gmail_notification_email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    alert_email text,
    alert_enabled boolean DEFAULT true,
    alert_threshold numeric DEFAULT 0.30,
    vimeo_history_url text,
    daily_report_enabled boolean DEFAULT false,
    weekly_report_enabled boolean DEFAULT false,
    monthly_report_enabled boolean DEFAULT false,
    ml_accuracy_threshold numeric DEFAULT 0.7,
    ml_accuracy_alert_enabled boolean DEFAULT true,
    ml_accuracy_alert_email text,
    ml_accuracy_last_alert timestamp with time zone,
    doc_sync_time text,
    doc_sync_alert_email text,
    security_scan_enabled boolean DEFAULT true,
    security_alert_email text,
    security_alert_threshold text,
    last_security_scan timestamp with time zone,
    whatsapp_target_phone text,
    whatsapp_global_enabled boolean DEFAULT true,
    email_global_enabled boolean DEFAULT true,
    last_scheduled_scan timestamp with time zone,
    last_scheduler_error text,
    api_sync_enabled boolean DEFAULT true,
    api_sync_cron_hour text,
    api_sync_cron_minute text,
    api_sync_default_frequency text,
    sms_enabled boolean DEFAULT true,
    sms_as_fallback boolean DEFAULT true,
    twilio_sms_number text
);


--
-- Name: agent_phrases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_phrases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid,
    phrase text,
    category text,
    context text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_pronunciations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_pronunciations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid,
    word text,
    pronunciation text,
    language text DEFAULT 'pt-BR'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_tag_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_tag_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid,
    taxonomy_id uuid,
    access_type text DEFAULT 'include'::text,
    include_children boolean DEFAULT true,
    weight integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint text,
    method text,
    user_id uuid,
    request_body jsonb,
    response_status integer,
    response_time_ms integer,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_cache (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    source text NOT NULL,
    endpoint text NOT NULL,
    params jsonb,
    data jsonb NOT NULL,
    municipality_code text,
    state_code text,
    fetched_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_valid boolean DEFAULT true
);


--
-- Name: api_test_staging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_test_staging (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    provider text,
    base_url text,
    description text,
    status text,
    is_functional boolean DEFAULT false,
    http_status integer,
    error_message text,
    discovered_period_start timestamp with time zone,
    discovered_period_end timestamp with time zone,
    last_raw_response jsonb,
    selected_variables jsonb,
    all_variables jsonb,
    implementation_params jsonb,
    test_timestamp timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    key text NOT NULL,
    value text,
    description text,
    category text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: audio_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    audio_url text,
    storage_path text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: auto_preload_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_preload_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type text,
    resource_url text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: banned_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banned_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_fingerprint text,
    reason text,
    banned_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    user_id uuid,
    user_email text,
    ban_reason text,
    violation_type text,
    is_permanent boolean DEFAULT true,
    banned_at timestamp with time zone DEFAULT now(),
    unbanned_at timestamp with time zone,
    unbanned_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: brazilian_ufs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brazilian_ufs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo integer,
    sigla text,
    nome text,
    regiao text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    system_prompt text,
    model text DEFAULT 'gpt-4'::text,
    temperature numeric DEFAULT 0.7,
    max_tokens integer DEFAULT 2000,
    is_active boolean DEFAULT true,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    event_type text,
    event_data jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text,
    config_value jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    audio_url text,
    tokens_used integer,
    model_used text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_routing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_routing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text,
    condition jsonb,
    target_agent_id uuid,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    device_fingerprint text,
    agent_slug text DEFAULT 'economia'::text,
    channel text DEFAULT 'pwa'::text,
    municipality_code text,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    metadata jsonb
);


--
-- Name: communication_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_styles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    style_code text NOT NULL,
    style_name text NOT NULL,
    description text,
    tone_parameters jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_name text,
    sender_email text,
    sender_phone text,
    subject text,
    message text,
    status text DEFAULT 'new'::text,
    replied_at timestamp with time zone,
    replied_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: context_detection_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_detection_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    context_id uuid,
    rule_type text NOT NULL,
    rule_value text NOT NULL,
    weight numeric DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: context_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    prompt_template text,
    prompt_additions text,
    antiprompt text,
    taxonomy_codes jsonb DEFAULT '[]'::jsonb,
    detection_keywords jsonb DEFAULT '[]'::jsonb,
    detection_priority integer DEFAULT 0,
    tone text DEFAULT 'professional'::text,
    match_threshold numeric DEFAULT 0.7,
    match_count integer DEFAULT 0,
    maieutic_enabled boolean DEFAULT false,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    color text,
    adaptation_speed text DEFAULT 'medium'::text,
    initial_cognitive_level integer DEFAULT 3,
    min_cognitive_level integer DEFAULT 1,
    max_cognitive_level integer DEFAULT 5,
    auto_detect_region boolean DEFAULT true,
    default_region_code text
);


--
-- Name: conversation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    user_id uuid,
    role text,
    content text,
    tokens integer,
    model text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    device_id uuid,
    session_id uuid,
    title text,
    model text DEFAULT 'claude-3-5-sonnet'::text,
    total_tokens integer DEFAULT 0,
    message_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: credits_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    operation text,
    credits_used numeric,
    model text,
    tokens_input integer,
    tokens_output integer,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crm_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text,
    page_url text,
    referrer text,
    user_agent text,
    ip_address text,
    session_id text,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: debug_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debug_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_type text,
    component text,
    message text,
    stack_trace text,
    metadata jsonb,
    severity text DEFAULT 'info'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deep_search_knowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deep_search_knowledge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text,
    result jsonb,
    source text,
    relevance_score numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: deterministic_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deterministic_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    input_text text,
    analysis_type text,
    result jsonb,
    confidence numeric,
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_chunks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    document_id uuid NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    chunk_index integer,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_onboarding_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_onboarding_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    step text,
    status text,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_routing_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_routing_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    source_agent text,
    target_agent text,
    reason text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    tag_name text,
    tag_type text,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    version_number integer,
    content text,
    changes_summary text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documentation_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentation_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text,
    target text,
    sync_status text,
    items_synced integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documentation_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentation_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_key text,
    version text,
    content text,
    changelog text,
    published_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    source text,
    category text,
    tags text[],
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: economic_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.economic_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    api_id uuid,
    frequency text,
    unit text,
    cron_schedule text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    category text,
    is_regional boolean DEFAULT false
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    content text NOT NULL,
    category text,
    variables jsonb,
    variables_used text[],
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: entity_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text,
    entity_id uuid,
    tag_name text,
    tag_value text,
    source text,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados (
    codigo_uf integer NOT NULL,
    uf text NOT NULL,
    nome text NOT NULL,
    regiao text,
    lat numeric,
    lng numeric
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    flag_name text NOT NULL,
    enabled boolean DEFAULT true,
    description text,
    environment text DEFAULT 'all'::text
);


--
-- Name: generated_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt text,
    image_url text,
    model text,
    style text,
    size text,
    user_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: global_taxonomy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_taxonomy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    parent_id uuid,
    level integer DEFAULT 1,
    synonyms jsonb DEFAULT '[]'::jsonb,
    keywords jsonb DEFAULT '[]'::jsonb,
    icon text,
    color text,
    status text DEFAULT 'approved'::text,
    auto_created boolean DEFAULT false,
    created_by uuid,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: image_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.image_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_id uuid,
    analysis_type text,
    result jsonb,
    confidence numeric,
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: indicator_regional_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicator_regional_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicator_id uuid,
    uf_code integer NOT NULL,
    reference_date date NOT NULL,
    value numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: indicator_stats_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicator_stats_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicator_id uuid,
    indicator_name text,
    total_records integer DEFAULT 0,
    last_value numeric,
    last_date text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: indicator_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicator_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    indicator_id uuid,
    reference_date date NOT NULL,
    value numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: indices_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indices_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    municipality_code text NOT NULL,
    indices jsonb NOT NULL,
    overall_score numeric,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: integrity_check_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrity_check_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text,
    check_type text,
    status text,
    issues_found integer,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lexicon_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lexicon_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term text,
    definition text,
    category text,
    synonyms jsonb,
    related_terms jsonb,
    source text,
    created_at timestamp with time zone DEFAULT now(),
    term_normalized text,
    taxonomy_id uuid,
    part_of_speech text,
    definition_simple text,
    example_usage text,
    domain text[],
    register text,
    antonyms text[],
    pronunciation_ipa text,
    pronunciation_phonetic text,
    audio_url text,
    is_approved boolean DEFAULT false
);


--
-- Name: maieutic_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maieutic_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    metric_type text,
    metric_value numeric,
    context jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: maieutic_training_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maieutic_training_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    description text,
    examples jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: market_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    content text,
    source text,
    url text,
    published_at timestamp with time zone,
    category text,
    sentiment text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    tokens_used integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: ml_correlations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_correlations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_a text,
    entity_b text,
    correlation_score numeric,
    correlation_type text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ml_restrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_restrictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name text,
    restriction_type text,
    restriction_value jsonb,
    reason text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ml_tag_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_tag_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id uuid,
    feedback_type text,
    user_id uuid,
    comment text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ml_tag_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ml_tag_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text,
    entity_id uuid,
    suggested_tag text,
    confidence numeric,
    model_version text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: municipal_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipal_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_municipio character varying(7) NOT NULL,
    indicator_code character varying(100) NOT NULL,
    ano integer NOT NULL,
    valor numeric(20,4),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: municipal_indices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipal_indices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    municipality_code text NOT NULL,
    health_index numeric,
    education_index numeric,
    social_vulnerability_index numeric,
    sanitation_index numeric,
    employment_index numeric,
    fiscal_health_index numeric,
    infrastructure_index numeric,
    environmental_index numeric,
    overall_score numeric,
    data_period text,
    calculated_at timestamp with time zone DEFAULT now(),
    sources_used jsonb
);


--
-- Name: municipalities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipalities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    state_code text NOT NULL,
    state_name text NOT NULL,
    region text NOT NULL,
    population integer,
    area_km2 numeric,
    latitude numeric,
    longitude numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: municipios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipios (
    codigo_ibge integer NOT NULL,
    nome text NOT NULL,
    uf text NOT NULL,
    capital boolean DEFAULT false,
    codigo_uf integer,
    regiao text,
    populacao_2022 integer,
    pib_2021_milhoes numeric,
    lat numeric,
    lng numeric,
    ddd integer,
    fuso_horario text
);


--
-- Name: notification_fallback_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_fallback_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enabled boolean DEFAULT true,
    threshold_percent integer DEFAULT 80,
    sms_provider text,
    alert_on_fallback boolean DEFAULT true,
    alert_email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_fallback_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_fallback_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_channel text,
    fallback_channel text,
    reason text,
    recipient text,
    notification_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_logic_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logic_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    phone_number text NOT NULL,
    provider text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    channel text,
    event_type text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    platform_name text,
    email_subject text,
    email_body text,
    whatsapp_message text,
    variables_available jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    phone text,
    email text,
    type text NOT NULL,
    channel text NOT NULL,
    title text,
    message text NOT NULL,
    status text DEFAULT 'pending'::text,
    external_id text,
    error_message text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ontology_concepts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_concepts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    description text,
    parent_id uuid,
    properties jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ontology_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ontology_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_concept_id uuid,
    target_concept_id uuid,
    relation_type text,
    weight numeric DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pac_pmc_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pac_pmc_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pac_code text,
    pmc_code text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pac_valores_estimados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pac_valores_estimados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pac_code text,
    reference_date date,
    estimated_value numeric,
    confidence_interval jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: password_recovery_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_recovery_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    code text,
    expires_at timestamp with time zone,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_verifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    phone_number text NOT NULL,
    device_id uuid,
    verified_at timestamp with time zone DEFAULT now(),
    verification_method text DEFAULT 'sms'::text
);


--
-- Name: phonetic_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phonetic_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    pattern text NOT NULL,
    replacement text NOT NULL,
    language text DEFAULT 'pt-BR'::text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pmc_valores_reais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pmc_valores_reais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pmc_code text,
    reference_date date,
    value numeric,
    source text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: podcast_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.podcast_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    description text,
    audio_url text,
    duration_seconds integer,
    transcript text,
    tags jsonb,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: presentation_scripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presentation_scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    content text,
    slides jsonb,
    duration_minutes integer,
    speaker_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profile_taxonomies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profile_taxonomies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    taxonomy_id uuid,
    weight numeric DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    institution_work text,
    institution_study text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    phone text,
    address_cep text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    last_ip_address text,
    last_browser text,
    last_os text,
    last_device_fingerprint text,
    last_screen_resolution text,
    last_timezone text,
    last_language text,
    last_login_at timestamp with time zone,
    registration_ip_address text,
    registration_browser text,
    registration_os text,
    registration_device_fingerprint text,
    registration_location text
);


--
-- Name: pwa_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value text,
    config_type text DEFAULT 'text'::text,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pwa_conversation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_conversation_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    role text,
    content text,
    audio_url text,
    audio_duration integer,
    transcription text,
    "timestamp" timestamp with time zone,
    taxonomy_tags text[] DEFAULT '{}'::text[],
    key_topics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    conversation_id uuid,
    device_id text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: pwa_conversation_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_conversation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text,
    user_name text,
    user_email text,
    company text,
    company_source text,
    module_type text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    city text,
    country text,
    latitude numeric,
    longitude numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone,
    message_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: pwa_conversation_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_conversation_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text,
    module_type text,
    summary text,
    message_count integer DEFAULT 0,
    last_user_message text,
    last_assistant_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pwa_device_fingerprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_device_fingerprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    fingerprint text NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    platform text,
    screen_size text,
    timezone text,
    touch_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE pwa_device_fingerprints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pwa_device_fingerprints IS 'Stores device fingerprints for PWA behavioral analysis';


--
-- Name: pwa_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text,
    invited_by uuid,
    status text DEFAULT 'pending'::text,
    invite_code text,
    expires_at timestamp with time zone,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    name text,
    email text,
    pwa_access text[] DEFAULT ARRAY['economia'::text, 'health'::text, 'ideias'::text],
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pwa_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pwa_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id text,
    user_name text,
    created_at timestamp with time zone DEFAULT now(),
    last_interaction timestamp with time zone,
    total_messages integer DEFAULT 0,
    user_id uuid,
    token text,
    pwa_access text[] DEFAULT '{}'::text[],
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    has_app_access boolean DEFAULT true,
    phone text,
    verification_code text,
    verification_code_expires_at timestamp with time zone,
    verification_attempts integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    session_expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: rag_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query text,
    documents_retrieved integer,
    relevance_scores jsonb,
    response_time_ms integer,
    user_feedback text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reclassification_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reclassification_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type text,
    status text DEFAULT 'pending'::text,
    total_items integer,
    processed_items integer,
    error_count integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: regional_pronunciations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regional_pronunciations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    word text,
    region text,
    pronunciation text,
    audio_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: regional_tone_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regional_tone_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_code text NOT NULL,
    rule_name text NOT NULL,
    rule_pattern text,
    replacement text,
    context text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    formality_level integer DEFAULT 3,
    warmth_level integer DEFAULT 3,
    greetings jsonb DEFAULT '[]'::jsonb,
    affirmations jsonb DEFAULT '[]'::jsonb,
    expressions jsonb DEFAULT '[]'::jsonb,
    preferred_terms jsonb DEFAULT '{}'::jsonb,
    avoided_terms jsonb DEFAULT '[]'::jsonb,
    voice_style text DEFAULT 'neutral'::text,
    speech_rate numeric DEFAULT 1,
    region_name text
);


--
-- Name: reply_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reply_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    content text,
    category text,
    variables jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text,
    operation text,
    old_schema jsonb,
    new_schema jsonb,
    changed_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: section_audio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_audio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid,
    audio_url text,
    duration_seconds integer,
    voice_id text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: section_content_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_content_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid,
    version integer,
    content text,
    changed_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: section_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_key text,
    title text,
    content text,
    order_index integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_alert_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_alert_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text,
    threshold numeric,
    recipients jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text,
    user_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    severity text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_scan_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_scan_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scan_type text,
    target text,
    status text,
    vulnerabilities jsonb,
    recommendations jsonb,
    scanned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_severity_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_severity_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    severity_level text,
    threat_count integer,
    resolved_count integer,
    snapshot_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_shield_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_shield_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: security_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    violation_type text,
    severity text,
    user_id uuid,
    ip_address text,
    violation_details jsonb,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    device_fingerprint text,
    user_email text,
    action_taken text
);


--
-- Name: security_whitelist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_whitelist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text,
    user_email text,
    user_name text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    expires_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    device_fingerprint text,
    user_id uuid
);


--
-- Name: sms_verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_verification_codes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    phone_number text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    verified boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: speech_humanization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speech_humanization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    pattern text,
    replacement text,
    context text,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_api_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_api_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    base_url text NOT NULL,
    method text DEFAULT 'GET'::text,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_checked_at timestamp with time zone,
    last_latency_ms integer,
    target_table text,
    last_http_status integer,
    last_sync_metadata jsonb,
    last_raw_response jsonb,
    fetch_start_date text,
    fetch_end_date text,
    auto_fetch_enabled boolean DEFAULT false,
    auto_fetch_interval text,
    discovered_period_start text,
    discovered_period_end text,
    source_data_status text,
    source_data_message text,
    last_response_at timestamp with time zone,
    period_discovery_date timestamp with time zone
);


--
-- Name: system_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    release_date timestamp with time zone,
    changelog text,
    is_current boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tag_merge_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_merge_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_tag text,
    canonical_tag text,
    chat_type text,
    created_at timestamp with time zone DEFAULT now(),
    created_by text,
    merge_count integer DEFAULT 0
);


--
-- Name: tag_modification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag_modification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tag_id uuid,
    old_value jsonb,
    new_value jsonb,
    modified_by text,
    modification_type text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: taxonomy_metrics_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxonomy_metrics_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date,
    total_documents integer,
    documents_with_taxonomy integer,
    documents_without_taxonomy integer,
    coverage_percentage numeric,
    total_taxonomies integer,
    active_taxonomies integer,
    orphan_taxonomies integer,
    new_taxonomies_created integer,
    classifications_auto integer,
    classifications_manual integer,
    classifications_ai_suggested integer,
    avg_confidence numeric,
    suggestions_approved integer,
    suggestions_rejected integer,
    suggestions_pending integer,
    onboarded_documents integer,
    auto_classified integer,
    pending_review integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: taxonomy_phonetics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxonomy_phonetics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    taxonomy_code text,
    term text,
    phonetic text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: taxonomy_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taxonomy_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term text,
    suggested_category text,
    confidence_score numeric,
    status text DEFAULT 'pending'::text,
    reviewed_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tooltip_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tooltip_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tooltip_key text NOT NULL,
    title text,
    content text NOT NULL,
    category text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: typing_latency_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_latency_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    latency_ms integer,
    character_count integer,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: user_chat_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_chat_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    theme text DEFAULT 'light'::text,
    font_size text DEFAULT 'medium'::text,
    notification_sound boolean DEFAULT true,
    auto_scroll boolean DEFAULT true,
    settings jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    contact_name text,
    contact_phone text,
    contact_email text,
    relationship text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    role text DEFAULT 'user'::text NOT NULL,
    send_via_email boolean DEFAULT true,
    send_via_whatsapp boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    has_platform_access boolean DEFAULT true,
    has_app_access boolean DEFAULT false,
    pwa_access text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    preference_key text,
    preference_value jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    theme text DEFAULT 'system'::text,
    language text DEFAULT 'pt'::text,
    email_notifications boolean DEFAULT true,
    whatsapp_notifications boolean DEFAULT true,
    sidebar_favorites jsonb DEFAULT '[]'::jsonb
);


--
-- Name: user_profiles_extended; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles_extended (
    id uuid NOT NULL,
    phone_number text,
    display_name text,
    avatar_url text,
    preferred_language text DEFAULT 'pt-BR'::text,
    timezone text DEFAULT 'America/Sao_Paulo'::text,
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    full_name text,
    phone text,
    status text DEFAULT 'pending'::text,
    dns_origin text,
    institution_work text,
    institution_study text,
    rejection_reason text,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    first_name text,
    last_name text,
    role text DEFAULT 'user'::text,
    requested_at timestamp with time zone DEFAULT now(),
    approved_by uuid,
    mass_import_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    is_banned boolean DEFAULT false,
    banned_at timestamp with time zone,
    banned_by uuid,
    ban_reason text,
    ban_type text,
    unbanned_at timestamp with time zone,
    unbanned_by uuid,
    pwa_access jsonb,
    pwa_registered_at timestamp with time zone,
    registration_source text,
    has_platform_access boolean DEFAULT true,
    has_app_access boolean DEFAULT false,
    street text,
    street_number text,
    complement text,
    neighborhood text,
    city text,
    state text,
    zip_code text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vimeo_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vimeo_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    vimeo_id text NOT NULL,
    thumbnail_url text,
    duration integer,
    category text DEFAULT 'geral'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    phone_number text NOT NULL,
    wa_id text,
    status text DEFAULT 'active'::text,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_daily_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date,
    messages_sent integer,
    messages_received integer,
    conversations_started integer,
    quality_score numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid,
    direction text NOT NULL,
    message_type text DEFAULT 'text'::text,
    content text,
    wa_message_id text,
    status text DEFAULT 'sent'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_quality_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_quality_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text,
    quality_score numeric,
    phone_number text,
    message_id text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_tier_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_tier_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tier text,
    daily_limit integer,
    current_usage integer,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2026_01_16; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_16 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_17; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_17 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_18; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_18 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_19; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_19 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_20; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_20 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_21; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_21 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_01_22; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_01_22 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: messages_2026_01_16; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_16 FOR VALUES FROM ('2026-01-16 00:00:00') TO ('2026-01-17 00:00:00');


--
-- Name: messages_2026_01_17; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_17 FOR VALUES FROM ('2026-01-17 00:00:00') TO ('2026-01-18 00:00:00');


--
-- Name: messages_2026_01_18; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_18 FOR VALUES FROM ('2026-01-18 00:00:00') TO ('2026-01-19 00:00:00');


--
-- Name: messages_2026_01_19; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_19 FOR VALUES FROM ('2026-01-19 00:00:00') TO ('2026-01-20 00:00:00');


--
-- Name: messages_2026_01_20; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_20 FOR VALUES FROM ('2026-01-20 00:00:00') TO ('2026-01-21 00:00:00');


--
-- Name: messages_2026_01_21; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_21 FOR VALUES FROM ('2026-01-21 00:00:00') TO ('2026-01-22 00:00:00');


--
-- Name: messages_2026_01_22; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_01_22 FOR VALUES FROM ('2026-01-22 00:00:00') TO ('2026-01-23 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: agent_phrases agent_phrases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_phrases
    ADD CONSTRAINT agent_phrases_pkey PRIMARY KEY (id);


--
-- Name: agent_pronunciations agent_pronunciations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pronunciations
    ADD CONSTRAINT agent_pronunciations_pkey PRIMARY KEY (id);


--
-- Name: agent_tag_profiles agent_tag_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_tag_profiles
    ADD CONSTRAINT agent_tag_profiles_pkey PRIMARY KEY (id);


--
-- Name: api_audit_logs api_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_audit_logs
    ADD CONSTRAINT api_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: api_cache api_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_cache
    ADD CONSTRAINT api_cache_pkey PRIMARY KEY (id);


--
-- Name: api_cache api_cache_source_endpoint_municipality_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_cache
    ADD CONSTRAINT api_cache_source_endpoint_municipality_code_key UNIQUE (source, endpoint, municipality_code);


--
-- Name: api_test_staging api_test_staging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_test_staging
    ADD CONSTRAINT api_test_staging_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);


--
-- Name: audio_contents audio_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_contents
    ADD CONSTRAINT audio_contents_pkey PRIMARY KEY (id);


--
-- Name: auto_preload_config auto_preload_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_preload_config
    ADD CONSTRAINT auto_preload_config_pkey PRIMARY KEY (id);


--
-- Name: banned_devices banned_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_devices
    ADD CONSTRAINT banned_devices_pkey PRIMARY KEY (id);


--
-- Name: brazilian_ufs brazilian_ufs_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_ufs
    ADD CONSTRAINT brazilian_ufs_codigo_key UNIQUE (codigo);


--
-- Name: brazilian_ufs brazilian_ufs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_ufs
    ADD CONSTRAINT brazilian_ufs_pkey PRIMARY KEY (id);


--
-- Name: brazilian_ufs brazilian_ufs_sigla_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_ufs
    ADD CONSTRAINT brazilian_ufs_sigla_key UNIQUE (sigla);


--
-- Name: chat_agents chat_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_agents
    ADD CONSTRAINT chat_agents_pkey PRIMARY KEY (id);


--
-- Name: chat_analytics chat_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_analytics
    ADD CONSTRAINT chat_analytics_pkey PRIMARY KEY (id);


--
-- Name: chat_config chat_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_config
    ADD CONSTRAINT chat_config_config_key_key UNIQUE (config_key);


--
-- Name: chat_config chat_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_config
    ADD CONSTRAINT chat_config_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_routing_rules chat_routing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_routing_rules
    ADD CONSTRAINT chat_routing_rules_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: communication_styles communication_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_styles
    ADD CONSTRAINT communication_styles_pkey PRIMARY KEY (id);


--
-- Name: communication_styles communication_styles_style_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_styles
    ADD CONSTRAINT communication_styles_style_code_key UNIQUE (style_code);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: context_detection_rules context_detection_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_detection_rules
    ADD CONSTRAINT context_detection_rules_pkey PRIMARY KEY (id);


--
-- Name: context_profiles context_profiles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_profiles
    ADD CONSTRAINT context_profiles_code_key UNIQUE (code);


--
-- Name: context_profiles context_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context_profiles
    ADD CONSTRAINT context_profiles_pkey PRIMARY KEY (id);


--
-- Name: conversation_history conversation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_history
    ADD CONSTRAINT conversation_history_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: credits_usage credits_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits_usage
    ADD CONSTRAINT credits_usage_pkey PRIMARY KEY (id);


--
-- Name: crm_visits crm_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_visits
    ADD CONSTRAINT crm_visits_pkey PRIMARY KEY (id);


--
-- Name: debug_logs debug_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debug_logs
    ADD CONSTRAINT debug_logs_pkey PRIMARY KEY (id);


--
-- Name: deep_search_knowledge deep_search_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deep_search_knowledge
    ADD CONSTRAINT deep_search_knowledge_pkey PRIMARY KEY (id);


--
-- Name: deterministic_analysis deterministic_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deterministic_analysis
    ADD CONSTRAINT deterministic_analysis_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: document_onboarding_log document_onboarding_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_onboarding_log
    ADD CONSTRAINT document_onboarding_log_pkey PRIMARY KEY (id);


--
-- Name: document_routing_log document_routing_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_routing_log
    ADD CONSTRAINT document_routing_log_pkey PRIMARY KEY (id);


--
-- Name: document_tags document_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_tags
    ADD CONSTRAINT document_tags_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documentation_sync_log documentation_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentation_sync_log
    ADD CONSTRAINT documentation_sync_log_pkey PRIMARY KEY (id);


--
-- Name: documentation_versions documentation_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentation_versions
    ADD CONSTRAINT documentation_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: economic_indicators economic_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.economic_indicators
    ADD CONSTRAINT economic_indicators_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: entity_tags entity_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_tags
    ADD CONSTRAINT entity_tags_pkey PRIMARY KEY (id);


--
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (codigo_uf);


--
-- Name: estados estados_uf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_uf_key UNIQUE (uf);


--
-- Name: feature_flags feature_flags_flag_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_flag_name_key UNIQUE (flag_name);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: generated_images generated_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_images
    ADD CONSTRAINT generated_images_pkey PRIMARY KEY (id);


--
-- Name: global_taxonomy global_taxonomy_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_taxonomy
    ADD CONSTRAINT global_taxonomy_code_key UNIQUE (code);


--
-- Name: global_taxonomy global_taxonomy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_taxonomy
    ADD CONSTRAINT global_taxonomy_pkey PRIMARY KEY (id);


--
-- Name: image_analytics image_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.image_analytics
    ADD CONSTRAINT image_analytics_pkey PRIMARY KEY (id);


--
-- Name: indicator_regional_values indicator_regional_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_regional_values
    ADD CONSTRAINT indicator_regional_values_pkey PRIMARY KEY (id);


--
-- Name: indicator_stats_summary indicator_stats_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_stats_summary
    ADD CONSTRAINT indicator_stats_summary_pkey PRIMARY KEY (id);


--
-- Name: indicator_values indicator_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_values
    ADD CONSTRAINT indicator_values_pkey PRIMARY KEY (id);


--
-- Name: indices_history indices_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indices_history
    ADD CONSTRAINT indices_history_pkey PRIMARY KEY (id);


--
-- Name: integrity_check_log integrity_check_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrity_check_log
    ADD CONSTRAINT integrity_check_log_pkey PRIMARY KEY (id);


--
-- Name: lexicon_terms lexicon_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lexicon_terms
    ADD CONSTRAINT lexicon_terms_pkey PRIMARY KEY (id);


--
-- Name: maieutic_metrics maieutic_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maieutic_metrics
    ADD CONSTRAINT maieutic_metrics_pkey PRIMARY KEY (id);


--
-- Name: maieutic_training_categories maieutic_training_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maieutic_training_categories
    ADD CONSTRAINT maieutic_training_categories_pkey PRIMARY KEY (id);


--
-- Name: market_news market_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: ml_correlations ml_correlations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_correlations
    ADD CONSTRAINT ml_correlations_pkey PRIMARY KEY (id);


--
-- Name: ml_restrictions ml_restrictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_restrictions
    ADD CONSTRAINT ml_restrictions_pkey PRIMARY KEY (id);


--
-- Name: ml_tag_feedback ml_tag_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_tag_feedback
    ADD CONSTRAINT ml_tag_feedback_pkey PRIMARY KEY (id);


--
-- Name: ml_tag_suggestions ml_tag_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ml_tag_suggestions
    ADD CONSTRAINT ml_tag_suggestions_pkey PRIMARY KEY (id);


--
-- Name: municipal_indicators municipal_indicators_codigo_municipio_indicator_code_ano_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipal_indicators
    ADD CONSTRAINT municipal_indicators_codigo_municipio_indicator_code_ano_key UNIQUE (codigo_municipio, indicator_code, ano);


--
-- Name: municipal_indicators municipal_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipal_indicators
    ADD CONSTRAINT municipal_indicators_pkey PRIMARY KEY (id);


--
-- Name: municipal_indices municipal_indices_municipality_code_data_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipal_indices
    ADD CONSTRAINT municipal_indices_municipality_code_data_period_key UNIQUE (municipality_code, data_period);


--
-- Name: municipal_indices municipal_indices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipal_indices
    ADD CONSTRAINT municipal_indices_pkey PRIMARY KEY (id);


--
-- Name: municipalities municipalities_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_code_key UNIQUE (code);


--
-- Name: municipalities municipalities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);


--
-- Name: municipios municipios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipios
    ADD CONSTRAINT municipios_pkey PRIMARY KEY (codigo_ibge);


--
-- Name: notification_fallback_config notification_fallback_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_fallback_config
    ADD CONSTRAINT notification_fallback_config_pkey PRIMARY KEY (id);


--
-- Name: notification_fallback_logs notification_fallback_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_fallback_logs
    ADD CONSTRAINT notification_fallback_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_logic_config notification_logic_config_event_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logic_config
    ADD CONSTRAINT notification_logic_config_event_type_key UNIQUE (event_type);


--
-- Name: notification_logic_config notification_logic_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logic_config
    ADD CONSTRAINT notification_logic_config_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ontology_concepts ontology_concepts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_concepts
    ADD CONSTRAINT ontology_concepts_pkey PRIMARY KEY (id);


--
-- Name: ontology_relations ontology_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ontology_relations
    ADD CONSTRAINT ontology_relations_pkey PRIMARY KEY (id);


--
-- Name: pac_pmc_mapping pac_pmc_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pac_pmc_mapping
    ADD CONSTRAINT pac_pmc_mapping_pkey PRIMARY KEY (id);


--
-- Name: pac_valores_estimados pac_valores_estimados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pac_valores_estimados
    ADD CONSTRAINT pac_valores_estimados_pkey PRIMARY KEY (id);


--
-- Name: password_recovery_codes password_recovery_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_recovery_codes
    ADD CONSTRAINT password_recovery_codes_pkey PRIMARY KEY (id);


--
-- Name: phone_verifications phone_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_verifications
    ADD CONSTRAINT phone_verifications_pkey PRIMARY KEY (id);


--
-- Name: phonetic_rules phonetic_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phonetic_rules
    ADD CONSTRAINT phonetic_rules_pkey PRIMARY KEY (id);


--
-- Name: pmc_valores_reais pmc_valores_reais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pmc_valores_reais
    ADD CONSTRAINT pmc_valores_reais_pkey PRIMARY KEY (id);


--
-- Name: podcast_contents podcast_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.podcast_contents
    ADD CONSTRAINT podcast_contents_pkey PRIMARY KEY (id);


--
-- Name: presentation_scripts presentation_scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presentation_scripts
    ADD CONSTRAINT presentation_scripts_pkey PRIMARY KEY (id);


--
-- Name: profile_taxonomies profile_taxonomies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profile_taxonomies
    ADD CONSTRAINT profile_taxonomies_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: pwa_config pwa_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_config
    ADD CONSTRAINT pwa_config_config_key_key UNIQUE (config_key);


--
-- Name: pwa_config pwa_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_config
    ADD CONSTRAINT pwa_config_pkey PRIMARY KEY (id);


--
-- Name: pwa_conversation_messages pwa_conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_conversation_messages
    ADD CONSTRAINT pwa_conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: pwa_conversation_sessions pwa_conversation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_conversation_sessions
    ADD CONSTRAINT pwa_conversation_sessions_pkey PRIMARY KEY (id);


--
-- Name: pwa_conversation_summaries pwa_conversation_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_conversation_summaries
    ADD CONSTRAINT pwa_conversation_summaries_pkey PRIMARY KEY (id);


--
-- Name: pwa_device_fingerprints pwa_device_fingerprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_device_fingerprints
    ADD CONSTRAINT pwa_device_fingerprints_pkey PRIMARY KEY (id);


--
-- Name: pwa_invites pwa_invites_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_invites
    ADD CONSTRAINT pwa_invites_phone_unique UNIQUE (phone);


--
-- Name: pwa_invites pwa_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_invites
    ADD CONSTRAINT pwa_invites_pkey PRIMARY KEY (id);


--
-- Name: pwa_sessions pwa_sessions_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_sessions
    ADD CONSTRAINT pwa_sessions_phone_unique UNIQUE (phone);


--
-- Name: pwa_sessions pwa_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pwa_sessions
    ADD CONSTRAINT pwa_sessions_pkey PRIMARY KEY (id);


--
-- Name: rag_analytics rag_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_analytics
    ADD CONSTRAINT rag_analytics_pkey PRIMARY KEY (id);


--
-- Name: reclassification_jobs reclassification_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reclassification_jobs
    ADD CONSTRAINT reclassification_jobs_pkey PRIMARY KEY (id);


--
-- Name: regional_pronunciations regional_pronunciations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regional_pronunciations
    ADD CONSTRAINT regional_pronunciations_pkey PRIMARY KEY (id);


--
-- Name: regional_tone_rules regional_tone_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regional_tone_rules
    ADD CONSTRAINT regional_tone_rules_pkey PRIMARY KEY (id);


--
-- Name: reply_templates reply_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reply_templates
    ADD CONSTRAINT reply_templates_pkey PRIMARY KEY (id);


--
-- Name: schema_audit_log schema_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_audit_log
    ADD CONSTRAINT schema_audit_log_pkey PRIMARY KEY (id);


--
-- Name: section_audio section_audio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_audio
    ADD CONSTRAINT section_audio_pkey PRIMARY KEY (id);


--
-- Name: section_content_versions section_content_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_content_versions
    ADD CONSTRAINT section_content_versions_pkey PRIMARY KEY (id);


--
-- Name: section_contents section_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_contents
    ADD CONSTRAINT section_contents_pkey PRIMARY KEY (id);


--
-- Name: security_alert_config security_alert_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_alert_config
    ADD CONSTRAINT security_alert_config_pkey PRIMARY KEY (id);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: security_scan_results security_scan_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_scan_results
    ADD CONSTRAINT security_scan_results_pkey PRIMARY KEY (id);


--
-- Name: security_severity_history security_severity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_severity_history
    ADD CONSTRAINT security_severity_history_pkey PRIMARY KEY (id);


--
-- Name: security_shield_config security_shield_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_shield_config
    ADD CONSTRAINT security_shield_config_config_key_key UNIQUE (config_key);


--
-- Name: security_shield_config security_shield_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_shield_config
    ADD CONSTRAINT security_shield_config_pkey PRIMARY KEY (id);


--
-- Name: security_violations security_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_violations
    ADD CONSTRAINT security_violations_pkey PRIMARY KEY (id);


--
-- Name: security_whitelist security_whitelist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_whitelist
    ADD CONSTRAINT security_whitelist_pkey PRIMARY KEY (id);


--
-- Name: sms_verification_codes sms_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_verification_codes
    ADD CONSTRAINT sms_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: speech_humanization speech_humanization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speech_humanization
    ADD CONSTRAINT speech_humanization_pkey PRIMARY KEY (id);


--
-- Name: system_api_registry system_api_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_api_registry
    ADD CONSTRAINT system_api_registry_pkey PRIMARY KEY (id);


--
-- Name: system_versions system_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_versions
    ADD CONSTRAINT system_versions_pkey PRIMARY KEY (id);


--
-- Name: tag_merge_rules tag_merge_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_merge_rules
    ADD CONSTRAINT tag_merge_rules_pkey PRIMARY KEY (id);


--
-- Name: tag_modification_logs tag_modification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag_modification_logs
    ADD CONSTRAINT tag_modification_logs_pkey PRIMARY KEY (id);


--
-- Name: taxonomy_metrics_daily taxonomy_metrics_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_metrics_daily
    ADD CONSTRAINT taxonomy_metrics_daily_pkey PRIMARY KEY (id);


--
-- Name: taxonomy_phonetics taxonomy_phonetics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_phonetics
    ADD CONSTRAINT taxonomy_phonetics_pkey PRIMARY KEY (id);


--
-- Name: taxonomy_suggestions taxonomy_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taxonomy_suggestions
    ADD CONSTRAINT taxonomy_suggestions_pkey PRIMARY KEY (id);


--
-- Name: tooltip_contents tooltip_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooltip_contents
    ADD CONSTRAINT tooltip_contents_pkey PRIMARY KEY (id);


--
-- Name: tooltip_contents tooltip_contents_tooltip_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tooltip_contents
    ADD CONSTRAINT tooltip_contents_tooltip_key_key UNIQUE (tooltip_key);


--
-- Name: typing_latency_logs typing_latency_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_latency_logs
    ADD CONSTRAINT typing_latency_logs_pkey PRIMARY KEY (id);


--
-- Name: user_chat_preferences user_chat_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_chat_preferences
    ADD CONSTRAINT user_chat_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_contacts user_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contacts
    ADD CONSTRAINT user_contacts_pkey PRIMARY KEY (id);


--
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_invitations user_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_token_key UNIQUE (token);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_profiles_extended user_profiles_extended_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles_extended
    ADD CONSTRAINT user_profiles_extended_phone_number_key UNIQUE (phone_number);


--
-- Name: user_profiles_extended user_profiles_extended_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles_extended
    ADD CONSTRAINT user_profiles_extended_pkey PRIMARY KEY (id);


--
-- Name: user_registrations user_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_registrations
    ADD CONSTRAINT user_registrations_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: vimeo_videos vimeo_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vimeo_videos
    ADD CONSTRAINT vimeo_videos_pkey PRIMARY KEY (id);


--
-- Name: vimeo_videos vimeo_videos_vimeo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vimeo_videos
    ADD CONSTRAINT vimeo_videos_vimeo_id_key UNIQUE (vimeo_id);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_daily_metrics whatsapp_daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_daily_metrics
    ADD CONSTRAINT whatsapp_daily_metrics_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_quality_events whatsapp_quality_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_quality_events
    ADD CONSTRAINT whatsapp_quality_events_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_tier_status whatsapp_tier_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_tier_status
    ADD CONSTRAINT whatsapp_tier_status_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_16 messages_2026_01_16_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_16
    ADD CONSTRAINT messages_2026_01_16_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_17 messages_2026_01_17_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_17
    ADD CONSTRAINT messages_2026_01_17_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_18 messages_2026_01_18_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_18
    ADD CONSTRAINT messages_2026_01_18_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_19 messages_2026_01_19_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_19
    ADD CONSTRAINT messages_2026_01_19_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_20 messages_2026_01_20_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_20
    ADD CONSTRAINT messages_2026_01_20_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_21 messages_2026_01_21_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_21
    ADD CONSTRAINT messages_2026_01_21_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_01_22 messages_2026_01_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_01_22
    ADD CONSTRAINT messages_2026_01_22_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_api_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_cache_expires ON public.api_cache USING btree (expires_at);


--
-- Name: idx_api_cache_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_cache_municipality ON public.api_cache USING btree (municipality_code);


--
-- Name: idx_api_cache_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_cache_source ON public.api_cache USING btree (source);


--
-- Name: idx_chunks_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_document ON public.document_chunks USING btree (document_id);


--
-- Name: idx_chunks_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_embedding ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_context_detection_rules_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_context_detection_rules_context_id ON public.context_detection_rules USING btree (context_id);


--
-- Name: idx_conversations_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_device ON public.conversations USING btree (device_id);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.conversations USING btree (user_id);


--
-- Name: idx_fingerprints_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fingerprints_created_at ON public.pwa_device_fingerprints USING btree (created_at DESC);


--
-- Name: idx_fingerprints_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fingerprints_fingerprint ON public.pwa_device_fingerprints USING btree (fingerprint);


--
-- Name: idx_fingerprints_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fingerprints_phone ON public.pwa_device_fingerprints USING btree (phone);


--
-- Name: idx_history_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_date ON public.indices_history USING btree (recorded_at);


--
-- Name: idx_history_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_municipality ON public.indices_history USING btree (municipality_code);


--
-- Name: idx_indicator_regional_values_compound; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_regional_values_compound ON public.indicator_regional_values USING btree (indicator_id, uf_code, reference_date);


--
-- Name: idx_indicator_regional_values_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_regional_values_date ON public.indicator_regional_values USING btree (reference_date);


--
-- Name: idx_indicator_regional_values_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_regional_values_indicator ON public.indicator_regional_values USING btree (indicator_id);


--
-- Name: idx_indicator_regional_values_uf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_regional_values_uf ON public.indicator_regional_values USING btree (uf_code);


--
-- Name: idx_indicator_values_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_values_date ON public.indicator_values USING btree (reference_date);


--
-- Name: idx_indicator_values_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_values_indicator ON public.indicator_values USING btree (indicator_id);


--
-- Name: idx_indicator_values_indicator_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indicator_values_indicator_date ON public.indicator_values USING btree (indicator_id, reference_date);


--
-- Name: idx_indices_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indices_municipality ON public.municipal_indices USING btree (municipality_code);


--
-- Name: idx_indices_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_indices_period ON public.municipal_indices USING btree (data_period);


--
-- Name: idx_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_created ON public.activity_logs USING btree (created_at);


--
-- Name: idx_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_user ON public.activity_logs USING btree (user_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created ON public.chat_messages USING btree (created_at);


--
-- Name: idx_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_session ON public.chat_messages USING btree (session_id);


--
-- Name: idx_municipal_indicators_ano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipal_indicators_ano ON public.municipal_indicators USING btree (ano);


--
-- Name: idx_municipal_indicators_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipal_indicators_indicator ON public.municipal_indicators USING btree (indicator_code);


--
-- Name: idx_municipal_indicators_municipio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipal_indicators_municipio ON public.municipal_indicators USING btree (codigo_municipio);


--
-- Name: idx_municipalities_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipalities_region ON public.municipalities USING btree (region);


--
-- Name: idx_municipalities_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipalities_state ON public.municipalities USING btree (state_code);


--
-- Name: idx_municipios_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipios_nome ON public.municipios USING btree (nome);


--
-- Name: idx_municipios_regiao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipios_regiao ON public.municipios USING btree (regiao);


--
-- Name: idx_municipios_uf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_municipios_uf ON public.municipios USING btree (uf);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_sessions_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_device ON public.chat_sessions USING btree (device_fingerprint);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_sms_codes_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_codes_expires ON public.sms_verification_codes USING btree (expires_at);


--
-- Name: idx_sms_codes_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_codes_phone ON public.sms_verification_codes USING btree (phone_number);


--
-- Name: idx_vimeo_videos_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vimeo_videos_category ON public.vimeo_videos USING btree (category);


--
-- Name: idx_vimeo_videos_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vimeo_videos_is_active ON public.vimeo_videos USING btree (is_active);


--
-- Name: idx_vimeo_videos_vimeo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vimeo_videos_vimeo_id ON public.vimeo_videos USING btree (vimeo_id);


--
-- Name: idx_whatsapp_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_phone ON public.whatsapp_conversations USING btree (phone_number);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_16_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_16_inserted_at_topic_idx ON realtime.messages_2026_01_16 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_17_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_17_inserted_at_topic_idx ON realtime.messages_2026_01_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_18_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_18_inserted_at_topic_idx ON realtime.messages_2026_01_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_19_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_19_inserted_at_topic_idx ON realtime.messages_2026_01_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_20_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_20_inserted_at_topic_idx ON realtime.messages_2026_01_20 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_21_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_21_inserted_at_topic_idx ON realtime.messages_2026_01_21 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_01_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_01_22_inserted_at_topic_idx ON realtime.messages_2026_01_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_01_16_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_16_inserted_at_topic_idx;


--
-- Name: messages_2026_01_16_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_16_pkey;


--
-- Name: messages_2026_01_17_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_17_inserted_at_topic_idx;


--
-- Name: messages_2026_01_17_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_17_pkey;


--
-- Name: messages_2026_01_18_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_18_inserted_at_topic_idx;


--
-- Name: messages_2026_01_18_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_18_pkey;


--
-- Name: messages_2026_01_19_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_19_inserted_at_topic_idx;


--
-- Name: messages_2026_01_19_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_19_pkey;


--
-- Name: messages_2026_01_20_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_20_inserted_at_topic_idx;


--
-- Name: messages_2026_01_20_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_20_pkey;


--
-- Name: messages_2026_01_21_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_21_inserted_at_topic_idx;


--
-- Name: messages_2026_01_21_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_21_pkey;


--
-- Name: messages_2026_01_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_01_22_inserted_at_topic_idx;


--
-- Name: messages_2026_01_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_01_22_pkey;


--
-- Name: vimeo_videos trigger_update_vimeo_videos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_vimeo_videos_updated_at BEFORE UPDATE ON public.vimeo_videos FOR EACH ROW EXECUTE FUNCTION public.update_vimeo_videos_updated_at();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: municipalities update_municipalities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON public.municipalities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: document_chunks document_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: global_taxonomy fk_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_taxonomy
    ADD CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES public.global_taxonomy(id) ON DELETE SET NULL;


--
-- Name: indices_history indices_history_municipality_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indices_history
    ADD CONSTRAINT indices_history_municipality_code_fkey FOREIGN KEY (municipality_code) REFERENCES public.municipalities(code);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: municipal_indices municipal_indices_municipality_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipal_indices
    ADD CONSTRAINT municipal_indices_municipality_code_fkey FOREIGN KEY (municipality_code) REFERENCES public.municipalities(code);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: pwa_invites Allow all access to pwa_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to pwa_invites" ON public.pwa_invites TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: pwa_sessions Allow all access to pwa_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to pwa_sessions" ON public.pwa_sessions TO authenticated, anon, postgres USING (true) WITH CHECK (true);


--
-- Name: system_api_registry Allow authenticated delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated delete" ON public.system_api_registry FOR DELETE TO authenticated USING (true);


--
-- Name: email_templates Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: notification_logs Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: system_api_registry Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.system_api_registry FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: email_templates Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.email_templates FOR SELECT TO authenticated USING (true);


--
-- Name: indicator_stats_summary Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.indicator_stats_summary FOR SELECT TO authenticated USING (true);


--
-- Name: notification_logs Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.notification_logs FOR SELECT TO authenticated USING (true);


--
-- Name: pmc_valores_reais Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.pmc_valores_reais FOR SELECT TO authenticated USING (true);


--
-- Name: section_content_versions Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.section_content_versions FOR SELECT TO authenticated USING (true);


--
-- Name: system_api_registry Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.system_api_registry FOR SELECT TO authenticated USING (true);


--
-- Name: email_templates Allow authenticated update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update" ON public.email_templates FOR UPDATE TO authenticated USING (true);


--
-- Name: notification_logs Allow authenticated update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update" ON public.notification_logs FOR UPDATE TO authenticated USING (true);


--
-- Name: system_api_registry Allow authenticated update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update" ON public.system_api_registry FOR UPDATE TO authenticated USING (true);


--
-- Name: vimeo_videos Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.vimeo_videos TO authenticated USING (true) WITH CHECK (true);


--
-- Name: pwa_device_fingerprints Allow insert fingerprints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert fingerprints" ON public.pwa_device_fingerprints FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: vimeo_videos Allow public read access to active videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to active videos" ON public.vimeo_videos FOR SELECT USING ((is_active = true));


--
-- Name: pwa_config Allow public read pwa_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read pwa_config" ON public.pwa_config FOR SELECT USING (true);


--
-- Name: pwa_device_fingerprints Allow select fingerprints for admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow select fingerprints for admin" ON public.pwa_device_fingerprints FOR SELECT TO authenticated USING (true);


--
-- Name: document_chunks Authenticated users can read document chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read document chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true);


--
-- Name: documents Authenticated users can read documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read documents" ON public.documents FOR SELECT TO authenticated USING (true);


--
-- Name: municipal_indices Authenticated users can read indices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read indices" ON public.municipal_indices FOR SELECT TO authenticated USING (true);


--
-- Name: municipalities Authenticated users can read municipalities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read municipalities" ON public.municipalities FOR SELECT TO authenticated USING (true);


--
-- Name: chat_messages Service role full access messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access messages" ON public.chat_messages TO service_role USING (true);


--
-- Name: notifications Service role full access notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access notifications" ON public.notifications TO service_role USING (true);


--
-- Name: chat_sessions Service role full access sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access sessions" ON public.chat_sessions TO service_role USING (true);


--
-- Name: user_invitations Service role has full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access" ON public.user_invitations USING (true) WITH CHECK (true);


--
-- Name: chat_sessions Users can create sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sessions" ON public.chat_sessions FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: chat_messages Users can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND ((chat_sessions.user_id = auth.uid()) OR (chat_sessions.user_id IS NULL))))));


--
-- Name: user_preferences Users can manage own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own preferences" ON public.user_preferences TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_sessions
  WHERE ((chat_sessions.id = chat_messages.session_id) AND ((chat_sessions.user_id = auth.uid()) OR (chat_sessions.user_id IS NULL))))));


--
-- Name: chat_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.chat_sessions FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: indicator_stats_summary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.indicator_stats_summary ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pmc_valores_reais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pmc_valores_reais ENABLE ROW LEVEL SECURITY;

--
-- Name: pwa_device_fingerprints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pwa_device_fingerprints ENABLE ROW LEVEL SECURITY;

--
-- Name: pwa_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pwa_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: section_content_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_content_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: sms_verification_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sms_verification_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: system_api_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_api_registry ENABLE ROW LEVEL SECURITY;

--
-- Name: user_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles_extended; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

--
-- Name: vimeo_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vimeo_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict HkEec4DcNSeOoDcv76gcMbn5aXgHKwsN3MaJRxGEdL0l8c4b2KOAqewk9XF11qP

