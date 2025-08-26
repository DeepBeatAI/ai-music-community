export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string[] => {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  return errors;
};

export const validateUsername = (username: string): string[] => {
  const errors = [];
  if (username.length < 3) errors.push('Username must be at least 3 characters');
  if (username.length > 20) errors.push('Username must be less than 20 characters');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.push('Username can only contain letters, numbers, and underscores');
  return errors;
};

export const validatePostContent = (content: string, postType: 'text' | 'audio'): string[] => {
  const errors = [];
  if (postType === 'text' && content.trim().length === 0) {
    errors.push('Text posts must have content');
  }
  if (content.length > 2000) {
    errors.push('Content must be less than 2000 characters');
  }
  return errors;
};