import { UserRole } from '../../types/database';

export interface AuthSessionResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  errorCode?:
    | 'INVALID_INPUT'
    | 'MISSING_ENV'
    | 'INVALID_CREDENTIALS'
    | 'INACTIVE_ACCOUNT'
    | 'PROFILE_NOT_FOUND';
  errorUz?: string;
}

export const ROLE_REDIRECT_PATHS: Record<UserRole, string> = {
  super_admin: '/admin',
  admin: '/admin',
  manager: '/manager',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};
