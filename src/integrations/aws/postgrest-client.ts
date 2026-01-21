// PostgREST Client - Mimics Supabase Database interface
// This client connects to PostgREST running on EC2

interface QueryResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

class QueryBuilder<T = unknown> {
  private endpoint: string;
  private table: string;
  private queryParams: URLSearchParams;
  private selectColumns: string = '*';
  private insertData: unknown = null;
  private updateData: unknown = null;
  private upsertData: unknown = null;
  private deleteMode: boolean = false;
  private headers: Record<string, string>;
  private singleResult: boolean = false;
  private returnCountOnly: boolean = false;

  constructor(endpoint: string, table: string, headers: Record<string, string>) {
    this.endpoint = endpoint;
    this.table = table;
    this.headers = headers;
    this.queryParams = new URLSearchParams();
  }

  // SELECT
  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectColumns = columns;
    if (options?.count) {
      this.headers['Prefer'] = `count=${options.count}`;
    }
    if (options?.head) {
      this.returnCountOnly = true;
    }
    return this;
  }

  // INSERT
  insert(data: unknown) {
    this.insertData = data;
    this.headers['Prefer'] = 'return=representation';
    return this;
  }

  // UPDATE
  update(data: unknown) {
    this.updateData = data;
    this.headers['Prefer'] = 'return=representation';
    return this;
  }

  // UPSERT
  upsert(data: unknown, options?: { onConflict?: string }) {
    this.upsertData = data;
    this.headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    if (options?.onConflict) {
      this.headers['Prefer'] += `,on_conflict=${options.onConflict}`;
    }
    return this;
  }

  // DELETE
  delete() {
    this.deleteMode = true;
    this.headers['Prefer'] = 'return=representation';
    return this;
  }

  // FILTERS
  eq(column: string, value: unknown) {
    this.queryParams.append(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: unknown) {
    this.queryParams.append(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: unknown) {
    this.queryParams.append(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: unknown) {
    this.queryParams.append(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: unknown) {
    this.queryParams.append(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: unknown) {
    this.queryParams.append(column, `lte.${value}`);
    return this;
  }

  like(column: string, pattern: string) {
    this.queryParams.append(column, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string) {
    this.queryParams.append(column, `ilike.${pattern}`);
    return this;
  }

  is(column: string, value: unknown) {
    this.queryParams.append(column, `is.${value}`);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.queryParams.append(column, `in.(${values.join(',')})`);
    return this;
  }

  contains(column: string, value: unknown) {
    this.queryParams.append(column, `cs.${JSON.stringify(value)}`);
    return this;
  }

  containedBy(column: string, value: unknown) {
    this.queryParams.append(column, `cd.${JSON.stringify(value)}`);
    return this;
  }

  or(filters: string) {
    this.queryParams.append('or', `(${filters})`);
    return this;
  }

  and(filters: string) {
    this.queryParams.append('and', `(${filters})`);
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.queryParams.append(column, `not.${operator}.${value}`);
    return this;
  }

  filter(column: string, operator: string, value: unknown) {
    this.queryParams.append(column, `${operator}.${value}`);
    return this;
  }

  match(query: Record<string, unknown>) {
    Object.entries(query).forEach(([key, value]) => {
      this.queryParams.append(key, `eq.${value}`);
    });
    return this;
  }

  // MODIFIERS
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    const nulls = options?.nullsFirst ? '.nullsfirst' : '.nullslast';
    this.queryParams.append('order', `${column}.${direction}${nulls}`);
    return this;
  }

  limit(count: number) {
    this.queryParams.append('limit', String(count));
    return this;
  }

  range(from: number, to: number) {
    this.headers['Range'] = `${from}-${to}`;
    return this;
  }

  single() {
    this.singleResult = true;
    this.headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    this.headers['Accept'] = 'application/vnd.pgrst.object+json';
    return this;
  }

  // EXECUTE
  async then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = await this.execute();
    if (onfulfilled) {
      return onfulfilled(result);
    }
    return result as unknown as TResult1;
  }

  private async execute(): Promise<QueryResult<T>> {
    let method = 'GET';
    let body: string | null = null;

    if (this.insertData || this.upsertData) {
      method = 'POST';
      body = JSON.stringify(this.insertData || this.upsertData);
    } else if (this.updateData) {
      method = 'PATCH';
      body = JSON.stringify(this.updateData);
    } else if (this.deleteMode) {
      method = 'DELETE';
    }

    // Add select columns if GET
    if (method === 'GET' && this.selectColumns !== '*') {
      this.queryParams.set('select', this.selectColumns);
    }

    const queryString = this.queryParams.toString();
    const url = `${this.endpoint}/${this.table}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body,
      });

      // Get count from headers if available
      const contentRange = response.headers.get('Content-Range');
      let count: number | null = null;
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/);
        if (match) count = parseInt(match[1], 10);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error: { message: error.message || error.details, code: error.code }, count };
      }

      if (this.returnCountOnly) {
        return { data: null, error: null, count };
      }

      const data = await response.json().catch(() => null);

      // Handle single result
      if (this.singleResult && Array.isArray(data)) {
        return { data: data[0] || null, error: null, count };
      }

      return { data, error: null, count };
    } catch (error) {
      return { data: null, error: { message: String(error) } };
    }
  }
}

export class PostgrestClient {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.headers = {};
  }

  setAuth(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  from<T = unknown>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.endpoint, table, { ...this.headers });
  }

  async rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<QueryResult<T>> {
    const url = `${this.endpoint}/rpc/${fn}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: params ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { data: null, error: { message: error.message } };
      }

      const data = await response.json().catch(() => null);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: String(error) } };
    }
  }
}
