export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let delay = retryDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffMultiplier;
    }
  }

  throw lastError!;
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const networkErrorMessages = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
  ];

  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';

  return networkErrorMessages.some(
    msg => errorMessage.includes(msg) || errorName.includes(msg)
  );
}

export function shouldRetry(error: any, statusCode?: number): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  if (statusCode) {
    return statusCode >= 500 || statusCode === 408 || statusCode === 429;
  }

  return false;
}
