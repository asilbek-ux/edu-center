import { CourseCategory, SubmissionStatus } from '../../types/database';

export interface TeacherAssignedGroup {
  id: string;
  code: string;
  name: string;
  room: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  courseTitle: string;
  courseCategory: CourseCategory;
  enrolledStudentsCount: number;
}

export interface TeacherStudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string;
  groupId: string;
  groupCode: string;
  xpTotal: number;
  currentLevel: number;
  streakDays: number;
  attendancePct: number;
  homeworkCompletedCount: number;
}

export interface TeacherLessonRow {
  id: string;
  groupId: string;
  groupCode: string;
  lessonNumber: number;
  topicUz: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  materialsUrl: string | null;
  isRoboticsLab: boolean;
  markedStudentsCount: number;
}

export interface TeacherHomeworkRow {
  id: string;
  groupId: string;
  groupCode: string;
  titleUz: string;
  descriptionUz: string;
  deadline: string;
  maxScore: number;
  xpReward: number;
  isRoboticsProject: boolean;
  submissionsCount: number;
  gradedCount: number;
}

export interface TeacherSubmissionRow {
  id: string;
  homeworkId: string;
  homeworkTitle: string;
  isRoboticsProject: boolean;
  studentId: string;
  studentName: string;
  studentCode: string;
  groupCode: string;
  fileUrl: string | null;
  githubOrVideoUrl: string | null;
  commentStudent: string | null;
  status: SubmissionStatus;
  score: number | null;
  roboticsHardwareScore: number | null;
  roboticsCodeScore: number | null;
  roboticsAutonomousScore: number | null;
  roboticsCreativityScore: number | null;
  feedbackTeacher: string | null;
  submittedAt: string;
}

export interface TeacherQuizRow {
  id: string;
  groupId: string;
  groupCode: string;
  titleUz: string;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  isPublished: boolean;
  questionsCount: number;
  attemptsCount: number;
}
