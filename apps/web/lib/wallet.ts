/**
 * Wallet connector — Freighter stub for the scaffold.
 *
 * In production this delegates to `window.freighterApi` once the user
 * approves the extension. The scaffold mocks a deterministic dev key
 * so the rest of the dashboard can render against a connected state.
 */
const MOCK_DEMO_PUBLIC_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACJUR';
const FREIGHTER_API = 'freighterApi';

export const WalletConnector = {
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return FREIGHTER_API in window;
  },

  async connect(): Promise<string> {
    if (typeof window === 'undefined') {
      return MOCK_DEMO_PUBLIC_KEY;
    }
    const windowWithFreighter = window as unknown as {
      freighterApi?: {
        requestAccess(): Promise<string>;
        getPublicKey(): Promise<string>;
        signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
      };
    };
    const api = windowWithFreighter.freighterApi;
    if (!api) {
      // Fall back to a deterministic mock wallet so the UI still works.
      return MOCK_DEMO_PUBLIC_KEY;
    }
    return api.requestAccess();
  },

  async getPublicKey(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const api = (window as unknown as { freighterApi?: { getPublicKey(): Promise<string> } }).freighterApi;
    if (!api) return null;
    try {
      return await api.getPublicKey();
    } catch {
      return null;
    }
  },

  async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
    const api = (window as unknown as {
      freighterApi?: { signTransaction(xdr: string, opts: { networkPassphrase: string }): Promise<string> };
    }).freighterApi;
    if (!api) {
      throw new Error('Freighter not available');
    }
    return api.signTransaction(xdr, { networkPassphrase });
  },
};
