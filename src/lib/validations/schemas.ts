/**
 * EduCenter — Server & Client Input Validation Schemas
 * Comprehensive validation for all ERP/LMS actions before database mutations.
 */

import { CourseCategory, PaymentMethod, PaymentStatus, AttendanceStatus } from '../../types/database';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errorUz?: string;
}

const UZ_PHONE_REGEX = /^\+998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes any Uzbek phone number into the standard "+998 XX XXX XX XX" format.
 * Accepts formats like:
 * - "+998 90 123 45 67"
 * - "+998901234567"
 * - "998901234567"
 * - "90 123 45 67"
 * - "901234567"
 * - "+998 (90) 123-45-67"
 */
export function normalizeUzPhone(input: string): { valid: boolean; formatted: string; rawDigits: string; errorUz?: string } {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      formatted: '',
      rawDigits: '',
      errorUz: "Telefon raqami kiritilmadi.",
    };
  }

  const digits = input.trim().replace(/\D/g, '');

  let raw = '';
  if (digits.startsWith('998') && digits.length === 12) {
    raw = digits;
  } else if (digits.length === 9) {
    raw = '998' + digits;
  } else if (digits.length === 10 && digits.startsWith('8')) {
    raw = '998' + digits.slice(1);
  } else {
    return {
      valid: false,
      formatted: '',
      rawDigits: digits,
      errorUz: "Telefon raqami 9 ta yoki 12 ta raqamdan iborat bo'lishi kerak (masalan: +998 90 123 45 67 yoki 90 123 45 67).",
    };
  }

  const cc = raw.slice(0, 3);
  const operator = raw.slice(3, 5);
  const part1 = raw.slice(5, 8);
  const part2 = raw.slice(8, 10);
  const part3 = raw.slice(10, 12);
  const formatted = `+${cc} ${operator} ${part1} ${part2} ${part3}`;

  return { valid: true, formatted, rawDigits: raw };
}

export function validateEmailPasswordInput(
  email: string,
  password: string
): ValidationResult<{ email: string; password: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { success: false, errorUz: "Elektron pochta manzili noto'g'ri formatda kiritildi." };
  }
  if (!password || password.length < 8) {
    return { success: false, errorUz: "Parol kamida 8 ta belgidan iborat bo'lishi shart." };
  }
  return { success: true, data: { email: cleanEmail, password } };
}

export function validateStudentInput(input: {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  schoolGrade?: string;
  parentName: string;
  parentPhone: string;
  parentRelationship?: string;
  groupId?: string;
  notes?: string;
}): ValidationResult<typeof input> {
  if (!input.fullName || input.fullName.trim().length < 4) {
    return { success: false, errorUz: "O'quvchi F.I.Sh. kamida 4 ta harfdan iborat bo'lishi kerak." };
  }

  const phoneNorm = normalizeUzPhone(input.phone);
  if (!phoneNorm.valid) {
    return { success: false, errorUz: phoneNorm.errorUz || "Telefon raqami noto'g'ri kiritildi." };
  }

  if (!input.parentName || input.parentName.trim().length < 3) {
    return { success: false, errorUz: "Ota-ona F.I.Sh. kamida 3 ta belgidan iborat bo'lishi shart." };
  }

  const parentPhoneNorm = normalizeUzPhone(input.parentPhone);
  if (!parentPhoneNorm.valid) {
    return { success: false, errorUz: `Ota-ona telefon raqami: ${parentPhoneNorm.errorUz || "noto'g'ri kiritildi."}` };
  }

  if (input.email && !EMAIL_REGEX.test(input.email.trim())) {
    return { success: false, errorUz: "O'quvchi elektron pochtasi noto'g'ri formatda." };
  }

  return {
    success: true,
    data: {
      ...input,
      fullName: input.fullName.trim(),
      phone: phoneNorm.formatted,
      email: input.email ? input.email.trim().toLowerCase() : undefined,
      parentName: input.parentName.trim(),
      parentPhone: parentPhoneNorm.formatted,
      parentRelationship: input.parentRelationship?.trim() || 'Ota-ona',
      notes: input.notes?.trim() || '',
    },
  };
}

export function validateTeacherInput(input: {
  fullName: string;
  phone: string;
  email: string;
  specialization: CourseCategory;
  salaryRateUzs: number;
  bio?: string;
}): ValidationResult<typeof input> {
  if (!input.fullName || input.fullName.trim().length < 4) {
    return { success: false, errorUz: "O'qituvchi F.I.Sh. kamida 4 ta harfdan iborat bo'lishi kerak." };
  }

  const phoneNorm = normalizeUzPhone(input.phone);
  if (!phoneNorm.valid) {
    return { success: false, errorUz: phoneNorm.errorUz || "O'qituvchi telefon raqami noto'g'ri kiritildi." };
  }

  if (!EMAIL_REGEX.test(input.email.trim().toLowerCase())) {
    return { success: false, errorUz: "O'qituvchi elektron pochtasi noto'g'ri kiritildi." };
  }
  if (input.salaryRateUzs < 0 || input.salaryRateUzs > 50000000) {
    return { success: false, errorUz: "Oylik maosh stavkasi 0 dan 50 000 000 so'mgacha bo'lishi kerak." };
  }
  return {
    success: true,
    data: {
      ...input,
      fullName: input.fullName.trim(),
      phone: phoneNorm.formatted,
      email: input.email.trim().toLowerCase(),
      bio: input.bio?.trim() || '',
    },
  };
}

export function validateCourseInput(input: {
  code: string;
  titleUz: string;
  category: CourseCategory;
  durationMonths: number;
  lessonsPerWeek: number;
  monthlyFeeUzs: number;
  descriptionUz?: string;
}): ValidationResult<typeof input> {
  if (!input.code || input.code.trim().length < 2) {
    return { success: false, errorUz: "Kurs kodi kamida 2 ta belgidan iborat bo'lishi kerak (masalan: ROB, PY)." };
  }
  if (!input.titleUz || input.titleUz.trim().length < 4) {
    return { success: false, errorUz: "Kurs nomi to'liq kiritilishi shart." };
  }
  if (input.monthlyFeeUzs < 50000 || input.monthlyFeeUzs > 15000000) {
    return { success: false, errorUz: "Oylik kurs to'lovi 50 000 dan 15 000 000 so'mgacha bo'lishi kerak." };
  }
  if (input.durationMonths < 1 || input.durationMonths > 36) {
    return { success: false, errorUz: "Kurs davomiyligi 1 oydan 36 oygacha bo'lishi kerak." };
  }
  if (input.lessonsPerWeek < 1 || input.lessonsPerWeek > 7) {
    return { success: false, errorUz: "Haftalik darslar soni 1 tadan 7 tagacha bo'lishi kerak." };
  }
  return {
    success: true,
    data: {
      ...input,
      code: input.code.trim().toUpperCase(),
      titleUz: input.titleUz.trim(),
      descriptionUz: input.descriptionUz?.trim() || '',
    },
  };
}

export function validateGroupInput(input: {
  code: string;
  name: string;
  courseId: string;
  teacherId: string;
  room: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  status?: string;
}): ValidationResult<typeof input> {
  if (!input.code || input.code.trim().length < 2) {
    return { success: false, errorUz: "Guruh kodi kiritilishi shart (masalan: ROB-01)." };
  }
  if (!input.name || input.name.trim().length < 3) {
    return { success: false, errorUz: "Guruh nomi to'liq kiritilishi shart." };
  }
  if (!input.courseId) {
    return { success: false, errorUz: "Kurs tanlanishi shart." };
  }
  if (!input.teacherId) {
    return { success: false, errorUz: "O'qituvchi tanlanishi shart." };
  }
  if (!input.startTime || !input.endTime) {
    return { success: false, errorUz: "Dars boshlanish va tugash vaqti to'liq ko'rsatilishi shart." };
  }
  if (input.maxStudents < 1 || input.maxStudents > 30) {
    return { success: false, errorUz: "Guruh sig'imi 1 dan 30 nafargacha bo'lishi mumkin." };
  }
  return {
    success: true,
    data: {
      ...input,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      room: input.room.trim() || 'Xona 1',
      scheduleDays: input.scheduleDays.trim(),
    },
  };
}

export function validatePaymentInput(input: {
  studentId: string;
  groupId: string;
  billingMonth: string;
  amountDueUzs: number;
  amountPaidUzs: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
}): ValidationResult<typeof input> {
  if (!input.studentId) {
    return { success: false, errorUz: "O'quvchi tanlanishi shart." };
  }
  if (!input.groupId) {
    return { success: false, errorUz: "Guruh tanlanishi shart." };
  }
  if (input.amountDueUzs < 0) {
    return { success: false, errorUz: "Hisoblangan to'lov summasi manfiy bo'lishi mumkin emas." };
  }
  if (input.amountPaidUzs < 0) {
    return { success: false, errorUz: "To'langan summa manfiy bo'lishi mumkin emas." };
  }
  return {
    success: true,
    data: {
      ...input,
      notes: input.notes?.trim() || '',
    },
  };
}

export function validateHomeworkInput(input: {
  groupId: string;
  titleUz: string;
  descriptionUz: string;
  deadline: string;
  maxScore?: number;
  xpReward?: number;
  isRoboticsProject?: boolean;
}): ValidationResult<typeof input> {
  if (!input.groupId) {
    return { success: false, errorUz: "Guruh tanlanishi shart." };
  }
  if (!input.titleUz || input.titleUz.trim().length < 4) {
    return { success: false, errorUz: "Vazifa mavzusi kamida 4 ta belgidan iborat bo'lishi kerak." };
  }
  if (!input.descriptionUz || input.descriptionUz.trim().length < 10) {
    return { success: false, errorUz: "Vazifa tavsifi kamida 10 ta belgidan iborat bo'lishi kerak." };
  }
  if (!input.deadline) {
    return { success: false, errorUz: "Topshirish muddati (deadline) ko'rsatilishi shart." };
  }
  return {
    success: true,
    data: {
      ...input,
      titleUz: input.titleUz.trim(),
      descriptionUz: input.descriptionUz.trim(),
      maxScore: input.maxScore || 100,
      xpReward: input.xpReward || 25,
      isRoboticsProject: Boolean(input.isRoboticsProject),
    },
  };
}

export function validateQuizInput(input: {
  groupId: string;
  titleUz: string;
  descriptionUz?: string;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  questions: Array<{
    questionTextUz: string;
    codeSnippet?: string;
    options: Array<{ id: string; text: string }>;
    correctOption: string;
    points: number;
    explanationUz?: string;
  }>;
}): ValidationResult<typeof input> {
  if (!input.groupId) {
    return { success: false, errorUz: "Guruh tanlanishi shart." };
  }
  if (!input.titleUz || input.titleUz.trim().length < 4) {
    return { success: false, errorUz: "Test sarlavhasi kamida 4 ta belgidan iborat bo'lishi kerak." };
  }
  if (input.timeLimitMinutes < 1 || input.timeLimitMinutes > 180) {
    return { success: false, errorUz: "Vaqt chegarasi 1 dan 180 daqiqagacha bo'lishi mumkin." };
  }
  if (input.passingScorePct < 1 || input.passingScorePct > 100) {
    return { success: false, errorUz: "O'tish bali 1% dan 100% gacha bo'lishi mumkin." };
  }
  if (!input.questions || input.questions.length === 0) {
    return { success: false, errorUz: "Kamida 1 ta test savoli kiritilishi shart." };
  }
  for (let i = 0; i < input.questions.length; i++) {
    const q = input.questions[i];
    if (!q.questionTextUz || q.questionTextUz.trim().length < 3) {
      return { success: false, errorUz: `${i + 1}-savol matni to'liq emas.` };
    }
    if (!q.options || q.options.length < 2) {
      return { success: false, errorUz: `${i + 1}-savolda kamida 2 ta javob varianti bo'lishi shart.` };
    }
    if (!q.correctOption) {
      return { success: false, errorUz: `${i + 1}-savol to'g'ri varianti tanlanmagan.` };
    }
  }
  return { success: true, data: input };
}
