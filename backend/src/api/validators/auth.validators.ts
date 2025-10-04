/**
 * Authentication Request Validators
 * Uses Zod for request validation as per existing tech stack
 * Implements validation for Task 3.1, Subtask 1: Authentication System
 */

import { z } from 'zod';

/**
 * Register validation schema
 * As per plan line 698: POST /api/auth/register
 */
export const RegisterSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(255, 'Full name too long')
      .trim(),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    companyName: z
      .string()
      .max(255, 'Company name too long')
      .trim()
      .optional(),
    whatsappNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid WhatsApp number format'),
  }),
});

/**
 * Login validation schema
 * As per plan line 699: POST /api/auth/login
 */
export const LoginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(1, 'Password is required'),
  }),
});

/**
 * Refresh token validation schema
 * As per plan line 700: POST /api/auth/refresh-token
 */
export const RefreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(1, 'Refresh token is required'),
  }),
});

/**
 * Forgot password validation schema
 * As per plan line 701: POST /api/auth/forgot-password
 */
export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
  }),
});

/**
 * Reset password validation schema
 * As per plan line 702: POST /api/auth/reset-password
 */
export const ResetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string()
      .min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }),
});

/**
 * Change password validation schema
 */
export const ChangePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string()
      .min(1, 'Old password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
  }),
});

/**
 * Type inference for validated data
 */
export type RegisterData = z.infer<typeof RegisterSchema>['body'];
export type LoginData = z.infer<typeof LoginSchema>['body'];
export type RefreshTokenData = z.infer<typeof RefreshTokenSchema>['body'];
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>['body'];
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>['body'];
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>['body'];


