import { supabase } from './supabaseClient';
import { BiometricAuthService } from './biometricAuth';

export interface LockSession {
  id: string;
  user_id: string;
  session_id: string;
  is_locked: boolean;
  locked_at?: string;
  last_activity_at: string;
  unlock_required_for?: string;
  created_at: string;
  expires_at: string;
}

export interface AutoLockConfig {
  enabled: boolean;
  timeoutSeconds: number;
  requireBiometricForUnlock: boolean;
}

export class AutoLockService {
  private static instance: AutoLockService;
  private sessionId: string;
  private userId?: string;
  private isLocked: boolean = false;
  private inactivityTimer?: NodeJS.Timeout;
  private activityListeners: (() => void)[] = [];
  private lockStateChangeListeners: ((locked: boolean) => void)[] = [];
  private config: AutoLockConfig = {
    enabled: true,
    timeoutSeconds: 300,
    requireBiometricForUnlock: true,
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupActivityListeners();
  }

  static getInstance(): AutoLockService {
    if (!AutoLockService.instance) {
      AutoLockService.instance = new AutoLockService();
    }
    return AutoLockService.instance;
  }

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadConfig();
    await this.createOrUpdateSession(false);

    if (this.config.enabled) {
      this.startInactivityTimer();
    }
  }

  async loadConfig(): Promise<void> {
    if (!this.userId) return;

    const settings = await BiometricAuthService.getBiometricSettings(this.userId);
    if (settings) {
      this.config = {
        enabled: settings.auto_lock_enabled,
        timeoutSeconds: settings.auto_lock_timeout_seconds,
        requireBiometricForUnlock: settings.require_biometric_for_sensitive,
      };
    }
  }

  async updateConfig(config: Partial<AutoLockConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (this.userId) {
      await BiometricAuthService.updateBiometricSettings(this.userId, {
        auto_lock_enabled: this.config.enabled,
        auto_lock_timeout_seconds: this.config.timeoutSeconds,
      });
    }

    if (this.config.enabled) {
      this.startInactivityTimer();
    } else {
      this.stopInactivityTimer();
    }
  }

  getConfig(): AutoLockConfig {
    return { ...this.config };
  }

  isSessionLocked(): boolean {
    return this.isLocked;
  }

  async lock(reason?: string): Promise<void> {
    if (this.isLocked) return;

    this.isLocked = true;
    await this.createOrUpdateSession(true, reason);
    this.notifyLockStateChange(true);
    this.stopInactivityTimer();
  }

  async unlock(): Promise<boolean> {
    if (!this.isLocked) return true;
    if (!this.userId) return false;

    if (this.config.requireBiometricForUnlock) {
      const result = await BiometricAuthService.reauthenticateForSensitiveAction(
        this.userId,
        'unlock_session'
      );

      if (!result.success) {
        return false;
      }
    }

    this.isLocked = false;
    await this.createOrUpdateSession(false);
    this.notifyLockStateChange(false);

    if (this.config.enabled) {
      this.startInactivityTimer();
    }

    return true;
  }

  async requireUnlockFor(action: string): Promise<boolean> {
    if (!this.isLocked) return true;

    await this.createOrUpdateSession(true, action);

    const unlocked = await this.unlock();
    return unlocked;
  }

  onLockStateChange(callback: (locked: boolean) => void): () => void {
    this.lockStateChangeListeners.push(callback);
    return () => {
      const index = this.lockStateChangeListeners.indexOf(callback);
      if (index > -1) {
        this.lockStateChangeListeners.splice(index, 1);
      }
    };
  }

  recordActivity(): void {
    if (this.isLocked) return;

    this.updateLastActivity();
    this.resetInactivityTimer();
  }

  destroy(): void {
    this.stopInactivityTimer();
    this.removeActivityListeners();
    this.lockStateChangeListeners = [];
  }

  private setupActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    const throttledActivity = this.throttle(() => this.recordActivity(), 1000);

    activityEvents.forEach((event) => {
      const listener = () => throttledActivity();
      window.addEventListener(event, listener, { passive: true });
      this.activityListeners.push(() => window.removeEventListener(event, listener));
    });

    if ('onvisibilitychange' in document) {
      const visibilityListener = () => {
        if (document.visibilityState === 'hidden') {
          this.handleAppBackgrounded();
        } else {
          this.handleAppForegrounded();
        }
      };
      document.addEventListener('visibilitychange', visibilityListener);
      this.activityListeners.push(() =>
        document.removeEventListener('visibilitychange', visibilityListener)
      );
    }
  }

  private removeActivityListeners(): void {
    this.activityListeners.forEach((remove) => remove());
    this.activityListeners = [];
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();

    if (!this.config.enabled) return;

    this.inactivityTimer = setTimeout(() => {
      this.lock('inactivity_timeout');
    }, this.config.timeoutSeconds * 1000);
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  private resetInactivityTimer(): void {
    if (this.config.enabled && !this.isLocked) {
      this.startInactivityTimer();
    }
  }

  private async handleAppBackgrounded(): Promise<void> {
    if (this.config.enabled && !this.isLocked) {
      await this.lock('app_backgrounded');
    }
  }

  private async handleAppForegrounded(): Promise<void> {
    if (this.isLocked) {
      const unlocked = await this.unlock();
      if (!unlocked) {
        console.log('Session remains locked - biometric authentication required');
      }
    }
  }

  private async createOrUpdateSession(
    isLocked: boolean,
    unlockRequiredFor?: string
  ): Promise<void> {
    if (!this.userId) return;

    try {
      const sessionData = {
        user_id: this.userId,
        session_id: this.sessionId,
        is_locked: isLocked,
        locked_at: isLocked ? new Date().toISOString() : null,
        last_activity_at: new Date().toISOString(),
        unlock_required_for: unlockRequiredFor || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { error } = await supabase
        .from('auto_lock_sessions')
        .upsert(sessionData, {
          onConflict: 'user_id,session_id',
        });

      if (error) {
        console.error('Failed to update lock session:', error);
      }
    } catch (error) {
      console.error('Error managing lock session:', error);
    }
  }

  private async updateLastActivity(): Promise<void> {
    if (!this.userId) return;

    try {
      await supabase
        .from('auto_lock_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('session_id', this.sessionId);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  private notifyLockStateChange(locked: boolean): void {
    this.lockStateChangeListeners.forEach((listener) => {
      try {
        listener(locked);
      } catch (error) {
        console.error('Error in lock state change listener:', error);
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }
}

export const autoLockService = AutoLockService.getInstance();
