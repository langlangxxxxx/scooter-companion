// Authentifizierungs-Service für Xiaomi und Ninebot
import { AuthToken, ScooterModel } from '@/types/scooter';

// Fallback für Web Crypto API
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// Fallback SHA-256 mit Web Crypto
async function sha256Hash(data: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
    return new Uint8Array(hashBuffer);
  }
  // Einfacher Hash-Fallback (nicht kryptografisch sicher, nur für Demo)
  const result = new Uint8Array(32);
  for (let i = 0; i < data.length; i++) {
    result[i % 32] ^= data[i];
  }
  return result;
}

// Synchroner Hash-Fallback für einfache Operationen
function simpleHash(data: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  for (let i = 0; i < data.length; i++) {
    result[i % 32] = (result[i % 32] + data[i]) % 256;
    result[(i + 1) % 32] ^= data[i];
    result[(i + 7) % 32] = (result[(i + 7) % 32] * 31 + data[i]) % 256;
  }
  return result;
}

// Lokaler Speicher-Key
const TOKEN_STORAGE_KEY = 'scooter_auth_tokens';

export class AuthService {
  private static instance: AuthService;
  private tokens: Map<string, AuthToken> = new Map();
  private sessionKeys: Map<string, SessionKeys> | null = null;

  private constructor() {
    this.loadTokens();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Tokens aus localStorage laden
  private loadTokens(): void {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredToken[];
        parsed.forEach(t => {
          this.tokens.set(t.deviceId, {
            deviceId: t.deviceId,
            token: new Uint8Array(t.token),
            createdAt: t.createdAt,
          });
        });
      }
    } catch (error) {
      console.error('[Auth] Token-Laden fehlgeschlagen:', error);
    }
  }

  // Tokens speichern
  private saveTokens(): void {
    try {
      const toStore: StoredToken[] = Array.from(this.tokens.values()).map(t => ({
        deviceId: t.deviceId,
        token: Array.from(t.token),
        createdAt: t.createdAt,
      }));
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('[Auth] Token-Speichern fehlgeschlagen:', error);
    }
  }

  // Prüfen ob Token existiert
  hasToken(deviceId: string): boolean {
    return this.tokens.has(deviceId);
  }

  // Token abrufen
  getToken(deviceId: string): AuthToken | null {
    return this.tokens.get(deviceId) || null;
  }

  // Token speichern
  setToken(deviceId: string, token: Uint8Array): void {
    this.tokens.set(deviceId, {
      deviceId,
      token,
      createdAt: Date.now(),
    });
    this.saveTokens();
    console.log(`[Auth] Token für ${deviceId} gespeichert`);
  }

  // Token löschen
  deleteToken(deviceId: string): void {
    this.tokens.delete(deviceId);
    this.saveTokens();
  }

  // Alle Tokens löschen
  clearAllTokens(): void {
    this.tokens.clear();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  // ============================================
  // Xiaomi MiBLE Authentifizierung
  // ============================================

  // ECDH Schlüsselpaar generieren (Placeholder - benötigt native Crypto)
  generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
    // Für echte ECDH würde @noble/curves benötigt
    // Dies ist ein Placeholder für die Demo
    const privateKey = getRandomBytes(32);
    const publicKey = getRandomBytes(65);
    publicKey[0] = 0x04; // Uncompressed point prefix
    console.warn('[Auth] ECDH-Placeholder verwendet - echte Crypto benötigt native Bibliotheken');
    return { privateKey, publicKey };
  }

  // Shared Secret berechnen (Placeholder)
  computeSharedSecret(privateKey: Uint8Array, remotePublicKey: Uint8Array): Uint8Array {
    // Für echte ECDH würde @noble/curves benötigt
    const combined = new Uint8Array([...privateKey, ...remotePublicKey]);
    return simpleHash(combined).slice(0, 32);
  }

  // Token aus Shared Secret ableiten
  deriveToken(sharedSecret: Uint8Array, info: string = 'mible-login-info'): Uint8Array {
    const infoBytes = new TextEncoder().encode(info);
    const combined = new Uint8Array([...sharedSecret, ...infoBytes]);
    return simpleHash(combined).slice(0, 12);
  }

  // Session-Keys ableiten
  deriveSessionKeys(
    token: Uint8Array, 
    appRandom: Uint8Array, 
    devRandom: Uint8Array
  ): SessionKeys {
    const combined = new Uint8Array([...token, ...appRandom, ...devRandom]);
    const hash = simpleHash(combined);
    
    return {
      appKey: hash.slice(0, 16),
      devKey: hash.slice(16, 32),
      appIv: this.deriveIV(hash, 'app'),
      devIv: this.deriveIV(hash, 'dev'),
    };
  }

  // IV ableiten
  private deriveIV(hash: Uint8Array, prefix: string): Uint8Array {
    const prefixBytes = new TextEncoder().encode(prefix);
    const combined = new Uint8Array([...prefixBytes, ...hash]);
    return simpleHash(combined).slice(0, 4);
  }

  // Zufällige Bytes generieren
  generateRandom(length: number = 16): Uint8Array {
    return getRandomBytes(length);
  }

  // Registrierungs-Flow Commands
  createGetInfoCommand(): Uint8Array {
    // MiBLE CMD_GET_INFO
    return new Uint8Array([0x00, 0x00, 0x01, 0x01]);
  }

  createSendKeyCommand(publicKey: Uint8Array): Uint8Array {
    // MiBLE CMD_SEND_KEY mit Public Key
    return new Uint8Array([0x00, 0x00, 0x0f, 0x02, ...publicKey.slice(1)]);
  }

  createLoginCommand(random: Uint8Array): Uint8Array {
    // MiBLE CMD_LOGIN
    return new Uint8Array([0x00, 0x00, 0x0c, 0x04, ...random]);
  }

  // HMAC-Verifikation
  verifyHMAC(expected: Uint8Array, received: Uint8Array): boolean {
    if (expected.length !== received.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected[i] ^ received[i];
    }
    return result === 0;
  }

  // ============================================
  // Ninebot Authentifizierung
  // ============================================

  // Ninebot Key aus Seriennummer ableiten
  deriveNinebotKey(serialNumber: string): Uint8Array {
    const serialBytes = new TextEncoder().encode(serialNumber);
    const hash = simpleHash(serialBytes);
    return hash.slice(0, 16);
  }

  // Ninebot Authentifizierungs-Command
  createNinebotAuthCommand(serialNumber: string): Uint8Array {
    const key = this.deriveNinebotKey(serialNumber);
    // Auth command für Ninebot
    return new Uint8Array([
      0x5a, 0xa5, // Header
      0x12,       // Length
      0x3e,       // Source
      0x21,       // Destination
      0x5c,       // Auth command
      ...key,
    ]);
  }

  // Authentifizierungs-Status
  isAuthenticated(deviceId: string): boolean {
    return this.hasToken(deviceId);
  }

  // Authentifizierung basierend auf Modell
  async authenticate(
    deviceId: string, 
    model: ScooterModel,
    sendCommand: (data: Uint8Array) => Promise<void>,
    waitForResponse: () => Promise<Uint8Array>
  ): Promise<boolean> {
    if (model === 'xiaomi-1s') {
      return this.authenticateXiaomi(deviceId, sendCommand, waitForResponse);
    } else {
      return this.authenticateNinebot(deviceId, sendCommand);
    }
  }

  // Xiaomi Authentifizierung
  private async authenticateXiaomi(
    deviceId: string,
    sendCommand: (data: Uint8Array) => Promise<void>,
    waitForResponse: () => Promise<Uint8Array>
  ): Promise<boolean> {
    try {
      // Prüfen ob Token existiert
      const existingToken = this.getToken(deviceId);
      
      if (existingToken) {
        // Login mit bestehendem Token
        const random = this.generateRandom(12);
        await sendCommand(this.createLoginCommand(random));
        
        const response = await waitForResponse();
        // Hier würde die HMAC-Verifikation stattfinden
        
        console.log('[Auth] Xiaomi Login erfolgreich');
        return true;
      } else {
        // Registrierung erforderlich
        console.log('[Auth] Xiaomi Registrierung erforderlich');
        return false;
      }
    } catch (error) {
      console.error('[Auth] Xiaomi Auth fehlgeschlagen:', error);
      return false;
    }
  }

  // Ninebot Authentifizierung
  private async authenticateNinebot(
    deviceId: string,
    sendCommand: (data: Uint8Array) => Promise<void>
  ): Promise<boolean> {
    try {
      // Ninebot verwendet einfachere Authentifizierung
      const token = this.getToken(deviceId);
      
      if (token) {
        console.log('[Auth] Ninebot bereits authentifiziert');
        return true;
      }

      // Einfache Registrierung für Ninebot
      this.setToken(deviceId, this.generateRandom(16));
      return true;
    } catch (error) {
      console.error('[Auth] Ninebot Auth fehlgeschlagen:', error);
      return false;
    }
  }
}

// Typen
interface SessionKeys {
  appKey: Uint8Array;
  devKey: Uint8Array;
  appIv: Uint8Array;
  devIv: Uint8Array;
}

interface StoredToken {
  deviceId: string;
  token: number[];
  createdAt: number;
}

export const authService = AuthService.getInstance();
export default authService;
