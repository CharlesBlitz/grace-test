import { supabase } from './supabaseClient';

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: 'platform' | 'cross-platform';
  device_name: string;
  backup_eligible: boolean;
  backup_state: boolean;
  transports: string[];
  aaguid?: string;
  last_used_at?: string;
  created_at: string;
  revoked_at?: string;
}

export interface BiometricSettings {
  user_id: string;
  biometric_enabled: boolean;
  auto_lock_enabled: boolean;
  auto_lock_timeout_seconds: number;
  require_biometric_for_sensitive: boolean;
  emergency_pin_enabled: boolean;
  emergency_pin_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricAuthResult {
  success: boolean;
  credential?: PublicKeyCredential;
  error?: string;
}

export class BiometricAuthService {
  private static RP_NAME = 'Grace Companion';
  private static RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  static isWebAuthnSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      window.PublicKeyCredential &&
      navigator.credentials &&
      typeof navigator.credentials.create === 'function' &&
      typeof navigator.credentials.get === 'function'
    );
  }

  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  static async getBiometricType(): Promise<'fingerprint' | 'face' | 'pin' | 'unknown'> {
    const isAvailable = await this.isPlatformAuthenticatorAvailable();
    if (!isAvailable) return 'unknown';

    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      if (userAgent.includes('iphone x') || userAgent.includes('iphone 1')) {
        return 'face';
      }
      return 'fingerprint';
    } else if (userAgent.includes('android')) {
      return 'fingerprint';
    }
    return 'pin';
  }

  static async registerBiometric(
    userId: string,
    email: string,
    deviceName?: string
  ): Promise<BiometricAuthResult> {
    if (!this.isWebAuthnSupported()) {
      return { success: false, error: 'WebAuthn not supported on this device' };
    }

    try {
      const challenge = this.generateChallenge();
      const userIdBuffer = this.stringToBuffer(userId);

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: this.RP_NAME,
          id: this.RP_ID,
        },
        user: {
          id: userIdBuffer,
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create credential' };
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = this.bufferToBase64URL(credential.rawId);
      const publicKey = this.bufferToBase64URL(response.getPublicKey()!);

      const transports = response.getTransports?.() || [];
      const detectedDeviceName = deviceName || await this.detectDeviceName();

      const { error: dbError } = await supabase
        .from('webauthn_credentials')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          public_key: publicKey,
          counter: 0,
          device_type: 'platform',
          device_name: detectedDeviceName,
          backup_eligible: false,
          backup_state: false,
          transports: transports,
        });

      if (dbError) {
        console.error('Failed to save credential:', dbError);
        return { success: false, error: 'Failed to save credential to database' };
      }

      await this.logAuthAttempt(userId, credentialId, 'login', null, true);

      return { success: true, credential };
    } catch (error: any) {
      console.error('Biometric registration error:', error);
      await this.logAuthAttempt(userId, null, 'login', null, false, error.message);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  static async authenticateWithBiometric(userId: string): Promise<BiometricAuthResult> {
    if (!this.isWebAuthnSupported()) {
      return { success: false, error: 'WebAuthn not supported' };
    }

    try {
      const { data: credentials, error: fetchError } = await supabase
        .from('webauthn_credentials')
        .select('*')
        .eq('user_id', userId)
        .is('revoked_at', null);

      if (fetchError || !credentials || credentials.length === 0) {
        return { success: false, error: 'No registered biometric credentials found' };
      }

      const challenge = this.generateChallenge();
      const allowCredentials = credentials.map((cred) => ({
        id: this.base64URLToBuffer(cred.credential_id),
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransport[],
      }));

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        rpId: this.RP_ID,
        allowCredentials: allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Authentication cancelled' };
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const credentialId = this.bufferToBase64URL(credential.rawId);

      const { error: updateError } = await supabase
        .from('webauthn_credentials')
        .update({
          last_used_at: new Date().toISOString(),
          counter: supabase.rpc('increment', { row_id: credentialId }),
        })
        .eq('credential_id', credentialId);

      if (updateError) {
        console.error('Failed to update credential:', updateError);
      }

      await this.logAuthAttempt(userId, credentialId, 'login', null, true);

      return { success: true, credential };
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      await this.logAuthAttempt(userId, null, 'login', null, false, error.message);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }

  static async reauthenticateForSensitiveAction(
    userId: string,
    actionContext: string
  ): Promise<BiometricAuthResult> {
    const result = await this.authenticateWithBiometric(userId);

    if (result.success && result.credential) {
      const credentialId = this.bufferToBase64URL(result.credential.rawId);
      await this.logAuthAttempt(userId, credentialId, 'sensitive_action', actionContext, true);
    } else {
      await this.logAuthAttempt(userId, null, 'sensitive_action', actionContext, false, result.error);
    }

    return result;
  }

  static async getBiometricSettings(userId: string): Promise<BiometricSettings | null> {
    const { data, error } = await supabase
      .from('biometric_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch biometric settings:', error);
      return null;
    }

    return data;
  }

  static async updateBiometricSettings(
    userId: string,
    settings: Partial<BiometricSettings>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('biometric_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to update biometric settings:', error);
      return false;
    }

    return true;
  }

  static async enableBiometric(userId: string, email: string): Promise<BiometricAuthResult> {
    const registrationResult = await this.registerBiometric(userId, email);

    if (registrationResult.success) {
      await this.updateBiometricSettings(userId, { biometric_enabled: true });
    }

    return registrationResult;
  }

  static async disableBiometric(userId: string): Promise<boolean> {
    await supabase
      .from('webauthn_credentials')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);

    return await this.updateBiometricSettings(userId, { biometric_enabled: false });
  }

  static async getUserCredentials(userId: string): Promise<WebAuthnCredential[]> {
    const { data, error } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch credentials:', error);
      return [];
    }

    return data || [];
  }

  static async revokeCredential(credentialId: string): Promise<boolean> {
    const { error } = await supabase
      .from('webauthn_credentials')
      .update({ revoked_at: new Date().toISOString() })
      .eq('credential_id', credentialId);

    return !error;
  }

  private static async logAuthAttempt(
    userId: string,
    credentialId: string | null,
    authType: 'login' | 'reauth' | 'sensitive_action' | 'emergency_pin',
    actionContext: string | null,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      await supabase.from('biometric_auth_log').insert({
        user_id: userId,
        credential_id: credentialId,
        auth_type: authType,
        action_context: actionContext,
        success,
        failure_reason: failureReason,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log auth attempt:', error);
    }
  }

  private static generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  private static stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  private static bufferToBase64URL(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static base64URLToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static async detectDeviceName(): Promise<string> {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';

    return 'Unknown Device';
  }
}
