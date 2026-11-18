import { AttendanceStatus, SubmissionStatus } from '../../types/database';

export interface StudentDashboardProfile {
  studentId: string;
  profileId: string;
  studentCode: string;
  fullName: string;
  phone: string;
  email: string;
  xpTotal: number;
  currentLevel: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number;
  progressPct: number;
  streakDays: number;
  enrolledAt: string;
}

export interface StudentGroupInfo {
  id: string;
  code: string;
  name: string;
  courseTitle: string;
  courseCategory: string;
  teacherName: string;
  room: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
}

export interface StudentAttendanceRecord {
  id: string;
  lessonDate: string;
  topicUz: string;
  status: AttendanceStatus;
  groupCode: string;
  remarks: string | null;
}

export interface StudentHomeworkItem {
  id: string;
  groupId: string;
  groupCode: string;
  titleUz: string;
  descriptionUz: string;
  deadline: string;
  maxScore: number;
  xpReward: number;
  isRoboticsProject: boolean;
  submission?: {
    id: string;
    status: SubmissionStatus;
    score: number | null;
    feedbackTeacher: string | null;
    submittedAt: string;
    fileUrl: string | null;
    githubOrVideoUrl: string | null;
  };
}

export interface StudentQuizItem {
  id: string;
  groupId: string;
  groupCode: string;
  titleUz: string;
  descriptionUz: string | null;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  attempt?: {
    id: string;
    scorePct: number;
    passed: boolean;
    completedAt: string | null;
  };
}

export interface StudentAchievementItem {
  id: string;
  code: string;
  titleUz: string;
  descriptionUz: string;
  iconName: string;
  xpBonus: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface StudentNotificationItem {
  id: string;
  type: string;
  titleUz: string;
  bodyUz: string;
  isRead: boolean;
  createdAt: string;
}
