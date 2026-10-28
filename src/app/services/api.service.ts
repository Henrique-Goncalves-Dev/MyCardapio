import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly accessKey = 'mycardapio.access-token';
  private readonly refreshKey = 'mycardapio.refresh-token';

  async signUp(email: string, password: string): Promise<{ emailConfirmationRequired: boolean; session: AuthSession | null }> {
    const result = await this.request<{ emailConfirmationRequired: boolean; session: AuthSession | null }>(
      '/api/auth/signup', { method: 'POST', body: { email, password } },
    );
    if (result.session) this.storeSession(result.session);
    return result;
  }

  async signIn(email: string, password: string): Promise<void> {
    const session = await this.request<AuthSession>('/api/auth/login', { method: 'POST', body: { email, password } });
    this.storeSession(session);
  }

  async signOut(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearSession();
    }
  }

  async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const send = (token: string | null) => fetch(`${environment.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    let response: Response;
    try {
      response = await send(this.read(this.accessKey));
      if (response.status === 401 && this.read(this.refreshKey) && path !== '/api/auth/refresh') {
        const refreshed = await fetch(`${environment.apiUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.read(this.refreshKey) }),
        });
        if (refreshed.ok) {
          this.storeSession(await refreshed.json() as AuthSession);
          response = await send(this.read(this.accessKey));
        } else {
          this.clearSession();
        }
      }
    } catch {
      throw new ApiError('Não foi possível conectar à API. Confira se o backend está iniciado.', 0);
    }

    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new ApiError(payload?.error || 'Não foi possível concluir a solicitação.', response.status);
    return payload as T;
  }

  private storeSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(this.accessKey, session.access_token);
    window.sessionStorage.setItem(this.refreshKey, session.refresh_token);
  }

  private clearSession(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(this.accessKey);
    window.sessionStorage.removeItem(this.refreshKey);
  }

  private read(key: string): string | null {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
  }
}
