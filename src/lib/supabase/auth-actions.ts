'use server';

import { createServerSupabaseClient } from './server';
import { validateEmailPasswordInput } from '../validations/schemas';
import { UserRole } from '../../types/database';
import type { AuthSessionResult } from './auth-types';

function checkSupabaseEnvConfigured(): { ok: boolean; errorUz?: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (
    !url ||
    !anonKey ||
    url.includes('your-project-id') ||
    url.includes('educenter-demo.supabase.co') ||
    anonKey.includes('placeholder')
  ) {
    return {
      ok: false,
      errorUz:
        "Supabase muhit o'zgaruvchilari sozlanmagan. .env.local faylga haqiqiy Supabase loyiha ma'lumotlarini kiriting.",
    };
  }
  return { ok: true };
}

/**
 * Authenticates a user with email & password via Supabase Auth and fetches
 * their verified role from `public.profiles`. Never trusts client role input.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<AuthSessionResult> {
  const valid = validateEmailPasswordInput(email, password);
  if (!valid.success) {
    return {
      authenticated: false,
      errorCode: 'INVALID_INPUT',
      errorUz: valid.errorUz,
    };
  }

  const envCheck = checkSupabaseEnvConfigured();
  if (!envCheck.ok) {
    return {
      authenticated: false,
      errorCode: 'MISSING_ENV',
      errorUz: envCheck.errorUz,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email: valid.data!.email,
    password,
  });

  if (signInError || !authData.user) {
    return {
      authenticated: false,
      errorCode: 'INVALID_CREDENTIALS',
      errorUz: "Email yoki parol noto'g'ri kiritildi. Iltimos, ma'lumotlarni tekshirib qayta urinib ko'ring.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      authenticated: false,
      errorCode: 'PROFILE_NOT_FOUND',
      errorUz: "Foydalanuvchi profili ma'lumotlar bazasidan topilmadi.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      authenticated: false,
      errorCode: 'INACTIVE_ACCOUNT',
      errorUz: "Sizning hisobingiz faol emas (bloklangan). Administratorga murojaat qiling.",
    };
  }

  return {
    authenticated: true,
    userId: profile.id,
    email: authData.user.email,
    fullName: profile.full_name,
    role: profile.role as UserRole,
  };
}

/**
 * Securely logs out the current user and clears server session cookies.
 */
export async function signOutSecurely(): Promise<{ success: boolean; redirectTo: string }> {
  const envCheck = checkSupabaseEnvConfigured();
  if (envCheck.ok) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  return { success: true, redirectTo: '/login' };
}

/**
 * Sends a password reset email via Supabase Auth.
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; messageUz: string }> {
  const envCheck = checkSupabaseEnvConfigured();
  if (!envCheck.ok) throw new Error(envCheck.errorUz);

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error("Elektron pochta manzili noto'g'ri kiritildi.");
  }

  const supabase = createServerSupabaseClient();
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?mode=update-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: redirectUrl,
  });

  if (error) {
    throw new Error("Parolni tiklash xabarini yuborishda xatolik yuz berdi: " + error.message);
  }

  return {
    success: true,
    messageUz: "Parolni tiklash bo'yicha ko'rsatmalar elektron pochtangizga yuborildi.",
  };
}

/**
 * Updates password for an authenticated session.
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; messageUz: string }> {
  const envCheck = checkSupabaseEnvConfigured();
  if (!envCheck.ok) throw new Error(envCheck.errorUz);

  if (!newPassword || newPassword.length < 8) {
    throw new Error("Yangi parol kamida 8 ta belgidan iborat bo'lishi shart.");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error("Parolni yangilashda xatolik: " + error.message);
  }

  return {
    success: true,
    messageUz: "Parolingiz muvaffaqiyatli yangilandi.",
  };
}

/**
 * Verifies session and returns current user profile with role.
 */
export async function requireAuthenticatedUser(): Promise<{
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
}> {
  const envCheck = checkSupabaseEnvConfigured();
  if (!envCheck.ok) {
    throw new Error(envCheck.errorUz);
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sessiya muddati tugagan yoki tizimga kirilmagan. Iltimos, /login sahifasidan kiring.");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Foydalanuvchi profili topilmadi.");
  }

  if (!profile.is_active) {
    throw new Error("Sizning hisobingiz faol emas.");
  }

  return {
    userId: profile.id,
    role: profile.role as UserRole,
    fullName: profile.full_name,
    email: user.email || '',
  };
}

/**
 * Server-side authorization guard required for Admin / Super Admin operations.
 */
export async function requireAdminServerAuth(): Promise<{
  adminProfileId: string;
  fullName: string;
  email: string;
  isSuperAdmin: boolean;
  isManager: boolean;
}> {
  const session = await requireAuthenticatedUser();
  if (session.role !== 'admin' && session.role !== 'super_admin' && session.role !== 'manager') {
    throw new Error("Ruxsat rad etildi: Faqat administrator yoki boshqaruvchi ushbu amalni bajara oladi.");
  }

  return {
    adminProfileId: session.userId,
    fullName: session.fullName,
    email: session.email,
    isSuperAdmin: session.role === 'super_admin',
    isManager: session.role === 'manager',
  };
}

/**
 * Server-side authorization guard required for Teacher operations.
 */
export async function requireTeacherServerAuth(): Promise<{
  teacherId: string;
  profileId: string;
  fullName: string;
  email: string;
}> {
  const session = await requireAuthenticatedUser();
  const supabase = createServerSupabaseClient();

  if (session.role === 'admin' || session.role === 'super_admin') {
    // Admins can act on behalf of teacher context if needed, or fetch first teacher
    const { data: teacher } = await supabase.from('teachers').select('id, profile_id').limit(1).single();
    return {
      teacherId: teacher?.id || session.userId,
      profileId: session.userId,
      fullName: session.fullName,
      email: session.email,
    };
  }

  if (session.role !== 'teacher') {
    throw new Error("Ruxsat rad etildi: Ushbu amal faqat o'qituvchilar uchun mo'ljallangan.");
  }

  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id, profile_id')
    .eq('profile_id', session.userId)
    .single();

  if (teacherError || !teacher) {
    throw new Error("O'qituvchi yozuvi topilmadi.");
  }

  return {
    teacherId: teacher.id,
    profileId: session.userId,
    fullName: session.fullName,
    email: session.email,
  };
}

/**
 * Server-side authorization guard required for Student operations.
 */
export async function requireStudentServerAuth(): Promise<{
  studentId: string;
  profileId: string;
  fullName: string;
  email: string;
}> {
  const session = await requireAuthenticatedUser();
  const supabase = createServerSupabaseClient();

  if (session.role === 'admin' || session.role === 'super_admin') {
    const { data: student } = await supabase.from('students').select('id, profile_id').limit(1).single();
    return {
      studentId: student?.id || session.userId,
      profileId: session.userId,
      fullName: session.fullName,
      email: session.email,
    };
  }

  if (session.role !== 'student') {
    throw new Error("Ruxsat rad etildi: Ushbu amal faqat o'quvchilar uchun mo'ljallangan.");
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, profile_id')
    .eq('profile_id', session.userId)
    .single();

  if (studentError || !student) {
    throw new Error("O'quvchi profili topilmadi.");
  }

  return {
    studentId: student.id,
    profileId: session.userId,
    fullName: session.fullName,
    email: session.email,
  };
}

/**
 * Server-side authorization guard required for Parent operations.
 */
export async function requireParentServerAuth(): Promise<{
  parentId: string;
  profileId: string;
  fullName: string;
  email: string;
}> {
  const session = await requireAuthenticatedUser();
  const supabase = createServerSupabaseClient();

  if (session.role === 'admin' || session.role === 'super_admin') {
    const { data: parent } = await supabase.from('parents').select('id, profile_id').limit(1).single();
    return {
      parentId: parent?.id || session.userId,
      profileId: session.userId,
      fullName: session.fullName,
      email: session.email,
    };
  }

  if (session.role !== 'parent') {
    throw new Error("Ruxsat rad etildi: Ushbu amal faqat ota-onalar uchun mo'ljallangan.");
  }

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('id, profile_id')
    .eq('profile_id', session.userId)
    .single();

  if (parentError || !parent) {
    throw new Error("Ota-ona profili topilmadi.");
  }

  return {
    parentId: parent.id,
    profileId: session.userId,
    fullName: session.fullName,
    email: session.email,
  };
}
