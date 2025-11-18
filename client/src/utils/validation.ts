/**
 * Input validation utilities for user type operations
 * Provides comprehensive validation and sanitization for user type data
 */

import { PlanTier, RoleType } from '@/types/userTypes';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
  field?: string;
  code?: string;
}

/**
 * Validate plan tier value
 * @param value - Value to validate
 * @returns ValidationResult<PlanTier>
 */
export function validatePlanTier(value: unknown): ValidationResult<PlanTier> {
  // Check if value is provided
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: 'Plan tier is required',
      field: 'planTier',
      code: 'REQUIRED',
    };
  }

  // Check if value is a string
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'Plan tier must be a string',
      field: 'planTier',
      code: 'INVALID_TYPE',
    };
  }

  // Sanitize input (trim and lowercase)
  const sanitized = value.trim().toLowerCase();

  // Check if value is a valid plan tier
  const validTiers = Object.values(PlanTier);
  if (!validTiers.includes(sanitized as PlanTier)) {
    return {
      valid: false,
      error: `Invalid plan tier. Must be one of: ${validTiers.join(', ')}`,
      field: 'planTier',
      code: 'INVALID_VALUE',
    };
  }

  return {
    valid: true,
    value: sanitized as PlanTier,
  };
}

/**
 * Validate role type value
 * @param value - Value to validate
 * @returns ValidationResult<RoleType>
 */
export function validateRoleType(value: unknown): ValidationResult<RoleType> {
  // Check if value is provided
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: 'Role type is required',
      field: 'roleType',
      code: 'REQUIRED',
    };
  }

  // Check if value is a string
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'Role type must be a string',
      field: 'roleType',
      code: 'INVALID_TYPE',
    };
  }

  // Sanitize input (trim and lowercase)
  const sanitized = value.trim().toLowerCase();

  // Check if value is a valid role type
  const validRoles = Object.values(RoleType);
  if (!validRoles.includes(sanitized as RoleType)) {
    return {
      valid: false,
      error: `Invalid role type. Must be one of: ${validRoles.join(', ')}`,
      field: 'roleType',
      code: 'INVALID_VALUE',
    };
  }

  return {
    valid: true,
    value: sanitized as RoleType,
  };
}

/**
 * Validate user ID (UUID format)
 * @param value - Value to validate
 * @returns ValidationResult<string>
 */
export function validateUserId(value: unknown): ValidationResult<string> {
  // Check if value is provided
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: 'User ID is required',
      field: 'userId',
      code: 'REQUIRED',
    };
  }

  // Check if value is a string
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'User ID must be a string',
      field: 'userId',
      code: 'INVALID_TYPE',
    };
  }

  // Sanitize input (trim)
  const sanitized = value.trim();

  // Check if value is empty
  if (sanitized.length === 0) {
    return {
      valid: false,
      error: 'User ID cannot be empty',
      field: 'userId',
      code: 'EMPTY',
    };
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitized)) {
    return {
      valid: false,
      error: 'User ID must be a valid UUID',
      field: 'userId',
      code: 'INVALID_FORMAT',
    };
  }

  return {
    valid: true,
    value: sanitized,
  };
}

/**
 * Validate username format
 * @param username - Username to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateUsername(username: string): string[] {
  const errors: string[] = [];

  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
    return errors;
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (trimmed.length > 20) {
    errors.push('Username must be no more than 20 characters long');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return errors;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Array of error messages (empty if valid)
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    errors.push('Password is required');
    return errors;
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return errors;
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 * @param value - Value to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent XSS
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 255); // Limit length
}

/**
 * Validate assign plan tier request
 * @param data - Request data
 * @returns ValidationResult with sanitized data
 */
export function validateAssignPlanTierRequest(data: unknown): ValidationResult<{
  targetUserId: string;
  planTier: PlanTier;
}> {
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      error: 'Invalid request data',
      code: 'INVALID_DATA',
    };
  }

  const request = data as Record<string, unknown>;

  // Validate target user ID
  const userIdResult = validateUserId(request.targetUserId);
  if (!userIdResult.valid) {
    return {
      valid: false,
      error: userIdResult.error,
      field: userIdResult.field,
      code: userIdResult.code,
    };
  }

  // Validate plan tier
  const planTierResult = validatePlanTier(request.planTier);
  if (!planTierResult.valid) {
    return {
      valid: false,
      error: planTierResult.error,
      field: planTierResult.field,
      code: planTierResult.code,
    };
  }

  return {
    valid: true,
    value: {
      targetUserId: userIdResult.value!,
      planTier: planTierResult.value!,
    },
  };
}

/**
 * Validate grant role request
 * @param data - Request data
 * @returns ValidationResult with sanitized data
 */
export function validateGrantRoleRequest(data: unknown): ValidationResult<{
  targetUserId: string;
  roleType: RoleType;
}> {
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      error: 'Invalid request data',
      code: 'INVALID_DATA',
    };
  }

  const request = data as Record<string, unknown>;

  // Validate target user ID
  const userIdResult = validateUserId(request.targetUserId);
  if (!userIdResult.valid) {
    return {
      valid: false,
      error: userIdResult.error,
      field: userIdResult.field,
      code: userIdResult.code,
    };
  }

  // Validate role type
  const roleTypeResult = validateRoleType(request.roleType);
  if (!roleTypeResult.valid) {
    return {
      valid: false,
      error: roleTypeResult.error,
      field: roleTypeResult.field,
      code: roleTypeResult.code,
    };
  }

  return {
    valid: true,
    value: {
      targetUserId: userIdResult.value!,
      roleType: roleTypeResult.value!,
    },
  };
}

/**
 * Validate revoke role request
 * @param data - Request data
 * @returns ValidationResult with sanitized data
 */
export function validateRevokeRoleRequest(data: unknown): ValidationResult<{
  targetUserId: string;
  roleType: RoleType;
}> {
  // Same validation as grant role
  return validateGrantRoleRequest(data);
}

/**
 * Create validation error response
 * @param result - Validation result
 * @returns Error object for API response
 */
export function createValidationErrorResponse(result: ValidationResult<unknown>): {
  error: string;
  field?: string;
  code?: string;
} {
  return {
    error: result.error || 'Validation failed',
    field: result.field,
    code: result.code,
  };
}
