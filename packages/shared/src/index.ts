// ============================================
// @psy-manager/shared
// Shared types and utilities between web & api
// ============================================

/**
 * Common API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

/**
 * User type shared between frontend and backend
 */
export type User = {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};
