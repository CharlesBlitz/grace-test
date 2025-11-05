import { useState, useEffect, useCallback } from 'react';
import { autoLockService, AutoLockConfig } from '@/lib/autoLockService';
import { useAuth } from '@/lib/authContext';

export function useAutoLock() {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [config, setConfig] = useState<AutoLockConfig | null>(null);
  const [lockTime, setLockTime] = useState<Date | null>(null);
  const [lockReason, setLockReason] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;

    const initializeAutoLock = async () => {
      await autoLockService.initialize(user.id);
      const currentConfig = autoLockService.getConfig();
      setConfig(currentConfig);
      setIsLocked(autoLockService.isSessionLocked());
    };

    initializeAutoLock();

    const unsubscribe = autoLockService.onLockStateChange((locked) => {
      setIsLocked(locked);
      if (locked) {
        setLockTime(new Date());
      } else {
        setLockTime(null);
        setLockReason(undefined);
      }
    });

    return () => {
      unsubscribe();
      autoLockService.destroy();
    };
  }, [user]);

  const lock = useCallback(async (reason?: string) => {
    setLockReason(reason);
    await autoLockService.lock(reason);
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    const success = await autoLockService.unlock();
    if (success) {
      setLockReason(undefined);
    }
    return success;
  }, []);

  const requireUnlockFor = useCallback(async (action: string): Promise<boolean> => {
    return await autoLockService.requireUnlockFor(action);
  }, []);

  const updateConfig = useCallback(async (newConfig: Partial<AutoLockConfig>) => {
    await autoLockService.updateConfig(newConfig);
    const updatedConfig = autoLockService.getConfig();
    setConfig(updatedConfig);
  }, []);

  const recordActivity = useCallback(() => {
    autoLockService.recordActivity();
  }, []);

  return {
    isLocked,
    config,
    lockTime,
    lockReason,
    lock,
    unlock,
    requireUnlockFor,
    updateConfig,
    recordActivity,
  };
}
