/**
 * EduCenter — Comprehensive TypeScript Database & Entity Definitions
 * Aligned with PostgreSQL Schema and Supabase Row Level Security
 */

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'teacher' | 'student' | 'parent';
export type CourseCategory = 'robotics' | 'it_programming';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'refunded';
export type PaymentMethod = 'cash' | 'payme' | 'click' | 'uzum' | 'bank_transfer';
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'returned';
export type XpSourceType =
  | 'attendance'
  | 'homework'
  | 'quiz'
  | 'robotics_project'
  | 'manual_bonus'
  | 'reward_redemption';
export type NotificationType =
  | 'attendance'
  | 'homework'
  | 'payment'
  | 'schedule'
  | 'achievement'
  | 'weekly_report'
  | 'system';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  telegram_chat_id: number | null;
  telegram_username: string | null;
  telegram_link_token: string | null;
  preferred_theme: 'light' | 'dark' | 'system';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  profile_id: string;
  student_code: string;
  birth_date: string | null;
  school_grade: string | null;
  xp_total: number;
  current_level: number;
  streak_days: number;
  monthly_discount_pct: number;
  notes: string | null;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
}

export interface Teacher {
  id: string;
  profile_id: string;
  employee_code: string;
  specialization: CourseCategory;
  bio: string | null;
  salary_rate_uzs: number;
  hired_at: string;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
}

export interface Parent {
  id: string;
  profile_id: string;
  occupation: string | null;
  emergency_phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  is_primary_payer: boolean;
  created_at: string;
  // Joins
  parent?: Parent;
  student?: Student;
}

export interface Course {
  id: string;
  code: string;
  title_uz: string;
  category: CourseCategory;
  description_uz: string | null;
  duration_months: number;
  lessons_per_week: number;
  monthly_fee_uzs: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  course_id: string;
  teacher_id: string;
  room: string;
  schedule_days: string;
  start_time: string;
  end_time: string;
  max_students: number;
  status: 'active' | 'forming' | 'completed' | 'paused';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  course?: Course;
  teacher?: Teacher;
}

export interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
  status: 'active' | 'paused' | 'graduated' | 'dropped';
  created_at: string;
  // Joins
  group?: Group;
  student?: Student;
}

export interface Lesson {
  id: string;
  group_id: string;
  lesson_number: number;
  topic_uz: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  materials_url: string | null;
  is_robotics_lab: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  lesson_id: string;
  student_id: string;
  status: AttendanceStatus;
  participation_score: number | null;
  remarks: string | null;
  marked_by: string | null;
  marked_at: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_number: string;
  student_id: string;
  group_id: string;
  billing_month: string;
  amount_due_uzs: number;
  amount_paid_uzs: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  receipt_url: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  student?: Student;
  group?: Group;
}

export interface Homework {
  id: string;
  lesson_id: string | null;
  group_id: string;
  title_uz: string;
  description_uz: string;
  attachment_url: string | null;
  max_score: number;
  xp_reward: number;
  is_robotics_project: boolean;
  deadline: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joins
  group?: Group;
}

export interface Submission {
  id: string;
  homework_id: string;
  student_id: string;
  file_url: string | null;
  github_or_video_url: string | null;
  comment_student: string | null;
  status: SubmissionStatus;
  score: number | null;
  robotics_hardware_score: number | null;
  robotics_code_score: number | null;
  robotics_autonomous_score: number | null;
  robotics_creativity_score: number | null;
  feedback_teacher: string | null;
  graded_by: string | null;
  submitted_at: string;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  homework?: Homework;
  student?: Student;
}

export interface Quiz {
  id: string;
  group_id: string;
  title_uz: string;
  description_uz: string | null;
  time_limit_minutes: number;
  passing_score_pct: number;
  xp_reward: number;
  is_published: boolean;
  available_from: string | null;
  available_until: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_order: number;
  question_text_uz: string;
  code_snippet: string | null;
  options: QuestionOption[];
  correct_option: string;
  points: number;
  explanation_uz: string | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: Record<string, string>;
  score_pct: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  // Joins
  quiz?: Quiz;
}

export interface Reward {
  id: string;
  title_uz: string;
  description_uz: string | null;
  cost_xp: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface XpTransaction {
  id: string;
  student_id: string;
  source_type: XpSourceType;
  source_id: string;
  amount: number;
  reason_uz: string;
  awarded_by: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title_uz: string;
  description_uz: string;
  icon_name: string;
  xp_bonus: number;
  criteria_type: 'streak_days' | 'robotics_score' | 'quizzes_passed' | 'xp_milestone';
  criteria_threshold: number;
  created_at: string;
}

export interface StudentAchievement {
  id: string;
  student_id: string;
  achievement_id: string;
  unlocked_at: string;
  // Joins
  achievement?: Achievement;
}

export interface Notification {
  id: string;
  recipient_profile_id: string;
  type: NotificationType;
  title_uz: string;
  body_uz: string;
  is_read: boolean;
  sent_via_telegram: boolean;
  telegram_message_id: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Expense {
  id: string;
  title_uz: string;
  category: 'rent' | 'utilities' | 'salaries' | 'equipment' | 'marketing' | 'office' | 'other';
  amount_uzs: number;
  expense_date: string;
  paid_via: string;
  receipt_url: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Salary {
  id: string;
  teacher_id: string;
  billing_month: string;
  amount_uzs: number;
  status: PaymentStatus;
  paid_at: string | null;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
}

export interface Announcement {
  id: string;
  title_uz: string;
  content_uz: string;
  target_role: UserRole | null;
  group_id: string | null;
  is_pinned: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

