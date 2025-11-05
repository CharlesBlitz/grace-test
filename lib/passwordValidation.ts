export interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      feedback: ['Password is required'],
      isValid: false,
    };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character (!@#$%^&*)');
  }

  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'admin',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.push('This password is too common. Please choose a more unique password');
    score = Math.max(0, score - 2);
  }

  const isValid = score >= 4 && password.length >= 8;

  if (isValid && feedback.length === 0) {
    feedback.push('Strong password!');
  }

  return {
    score,
    feedback,
    isValid,
  };
}

export function getPasswordStrengthLabel(score: number): string {
  if (score <= 2) return 'Weak';
  if (score <= 4) return 'Fair';
  if (score <= 5) return 'Good';
  return 'Strong';
}

export function getPasswordStrengthColor(score: number): string {
  if (score <= 2) return 'bg-red-500';
  if (score <= 4) return 'bg-yellow-500';
  if (score <= 5) return 'bg-blue-500';
  return 'bg-emerald-500';
}
