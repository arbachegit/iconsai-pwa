// Cognito Authentication - Mimics Supabase Auth interface

export interface User {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  role?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
}

interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
}

type AuthChangeCallback = (event: string, session: Session | null) => void;

export class CognitoAuth {
  private config: CognitoConfig;
  private currentSession: Session | null = null;
  private listeners: AuthChangeCallback[] = [];
  private cognitoEndpoint: string;

  constructor(config: CognitoConfig) {
    this.config = config;
    this.cognitoEndpoint = `https://cognito-idp.${config.region}.amazonaws.com`;
    this.loadSession();
  }

  private loadSession() {
    const stored = localStorage.getItem('aws_session');
    if (stored) {
      try {
        this.currentSession = JSON.parse(stored);
      } catch {
        this.currentSession = null;
      }
    }
  }

  private saveSession(session: Session | null) {
    this.currentSession = session;
    if (session) {
      localStorage.setItem('aws_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('aws_session');
    }
    this.notifyListeners(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  }

  private notifyListeners(event: string, session: Session | null) {
    this.listeners.forEach(cb => cb(event, session));
  }

  // Sign up with email and password
  async signUp(credentials: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
    try {
      const response = await fetch(this.cognitoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify({
          ClientId: this.config.clientId,
          Username: credentials.email,
          Password: credentials.password,
          UserAttributes: [
            { Name: 'email', Value: credentials.email },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: { user: null, session: null }, error: { message: data.message || 'Sign up failed' } };
      }

      // User needs to confirm email
      const user: User = {
        id: data.UserSub,
        email: credentials.email,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: credentials.options?.data || {},
        aud: 'authenticated',
      };

      return { data: { user, session: null }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: { message: String(error) } };
    }
  }

  // Sign in with email and password
  async signInWithPassword(credentials: { email: string; password: string }) {
    try {
      const response = await fetch(this.cognitoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.config.clientId,
          AuthParameters: {
            USERNAME: credentials.email,
            PASSWORD: credentials.password,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: { user: null, session: null }, error: { message: data.message || 'Sign in failed' } };
      }

      const authResult = data.AuthenticationResult;

      // Get user info
      const userResponse = await fetch(this.cognitoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.GetUser',
        },
        body: JSON.stringify({
          AccessToken: authResult.AccessToken,
        }),
      });

      const userData = await userResponse.json();

      const user: User = {
        id: userData.Username,
        email: userData.UserAttributes?.find((a: { Name: string }) => a.Name === 'email')?.Value,
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
      };

      const session: Session = {
        access_token: authResult.AccessToken,
        refresh_token: authResult.RefreshToken,
        expires_in: authResult.ExpiresIn,
        expires_at: Math.floor(Date.now() / 1000) + authResult.ExpiresIn,
        token_type: authResult.TokenType,
        user,
      };

      this.saveSession(session);
      return { data: { user, session }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: { message: String(error) } };
    }
  }

  // Sign out
  async signOut() {
    try {
      if (this.currentSession?.access_token) {
        await fetch(this.cognitoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.GlobalSignOut',
          },
          body: JSON.stringify({
            AccessToken: this.currentSession.access_token,
          }),
        });
      }
    } catch {
      // Ignore errors on sign out
    }
    this.saveSession(null);
    return { error: null };
  }

  // Get current session
  async getSession() {
    if (this.currentSession && this.currentSession.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now < this.currentSession.expires_at) {
        return { data: { session: this.currentSession }, error: null };
      }
      // Try to refresh
      if (this.currentSession.refresh_token) {
        return await this.refreshSession();
      }
    }
    return { data: { session: null }, error: null };
  }

  // Refresh session
  private async refreshSession() {
    if (!this.currentSession?.refresh_token) {
      return { data: { session: null }, error: { message: 'No refresh token' } };
    }

    try {
      const response = await fetch(this.cognitoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: this.config.clientId,
          AuthParameters: {
            REFRESH_TOKEN: this.currentSession.refresh_token,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.saveSession(null);
        return { data: { session: null }, error: { message: data.message } };
      }

      const authResult = data.AuthenticationResult;
      const session: Session = {
        ...this.currentSession,
        access_token: authResult.AccessToken,
        expires_in: authResult.ExpiresIn,
        expires_at: Math.floor(Date.now() / 1000) + authResult.ExpiresIn,
      };

      this.saveSession(session);
      return { data: { session }, error: null };
    } catch (error) {
      return { data: { session: null }, error: { message: String(error) } };
    }
  }

  // Get current user
  async getUser() {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user || null }, error: null };
  }

  // Listen for auth state changes
  onAuthStateChange(callback: AuthChangeCallback) {
    this.listeners.push(callback);

    // Initial call with current state
    setTimeout(() => {
      callback(this.currentSession ? 'INITIAL_SESSION' : 'SIGNED_OUT', this.currentSession);
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = this.listeners.indexOf(callback);
            if (idx > -1) this.listeners.splice(idx, 1);
          },
        },
      },
    };
  }

  // Reset password
  async resetPasswordForEmail(email: string) {
    try {
      const response = await fetch(this.cognitoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
        },
        body: JSON.stringify({
          ClientId: this.config.clientId,
          Username: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: {}, error: { message: data.message } };
      }

      return { data: {}, error: null };
    } catch (error) {
      return { data: {}, error: { message: String(error) } };
    }
  }

  // Update user
  async updateUser(attributes: { email?: string; password?: string; data?: Record<string, unknown> }) {
    if (!this.currentSession?.access_token) {
      return { data: { user: null }, error: { message: 'Not authenticated' } };
    }

    try {
      const userAttributes: Array<{ Name: string; Value: string }> = [];

      if (attributes.email) {
        userAttributes.push({ Name: 'email', Value: attributes.email });
      }

      if (userAttributes.length > 0) {
        await fetch(this.cognitoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.UpdateUserAttributes',
          },
          body: JSON.stringify({
            AccessToken: this.currentSession.access_token,
            UserAttributes: userAttributes,
          }),
        });
      }

      if (attributes.password) {
        await fetch(this.cognitoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.ChangePassword',
          },
          body: JSON.stringify({
            AccessToken: this.currentSession.access_token,
            PreviousPassword: '', // Would need old password
            ProposedPassword: attributes.password,
          }),
        });
      }

      return { data: { user: this.currentSession.user }, error: null };
    } catch (error) {
      return { data: { user: null }, error: { message: String(error) } };
    }
  }
}
