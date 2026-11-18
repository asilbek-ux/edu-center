import { XpSourceType } from '../types/database';

export interface RoboticsRubricScores {
  hardwareScore: number;   // 0 - 25 (Mexanika va sxemotexnika)
  codeScore: number;       // 0 - 25 (Mikrokontroller dasturi / C++ / Python)
  autonomousScore: number; // 0 - 25 (Avtonom ishlash va datchiklar aniqligi)
  creativityScore: number; // 0 - 25 (Muhandislik yechimi va dizayn)
}

/**
 * Calculates student level from total XP using the PostgreSQL trigger formula:
 * Level = FLOOR(SQRT(MAX(xp, 0) / 100)) + 1
 */
export function calculateStudentLevel(xpTotal: number): {
  level: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number;
  progressPct: number;
} {
  const safeXp = Math.max(0, xpTotal);
  const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
  const currentLevelMinXp = Math.pow(level - 1, 2) * 100;
  const nextLevelMinXp = Math.pow(level, 2) * 100;
  const span = Math.max(1, nextLevelMinXp - currentLevelMinXp);
  const progressPct = Math.min(100, Math.round(((safeXp - currentLevelMinXp) / span) * 100));

  return { level, currentLevelMinXp, nextLevelMinXp, progressPct };
}

/**
 * Evaluates a Robotics project rubric and determines total score (0-100) and XP reward.
 */
export function evaluateRoboticsProject(rubric: RoboticsRubricScores): {
  totalScore: number;
  xpAwarded: number;
  gradeLabelUz: string;
} {
  const clamp = (v: number) => Math.max(0, Math.min(25, Math.round(v)));
  const totalScore =
    clamp(rubric.hardwareScore) +
    clamp(rubric.codeScore) +
    clamp(rubric.autonomousScore) +
    clamp(rubric.creativityScore);

  let xpAwarded = 30;
  let gradeLabelUz = "Qoniqarli";

  if (totalScore >= 90) {
    xpAwarded = 120;
    gradeLabelUz = "A'lo (Innovatsion loyiha)";
  } else if (totalScore >= 75) {
    xpAwarded = 80;
    gradeLabelUz = "Yaxshi (Barqaror prototip)";
  } else if (totalScore >= 60) {
    xpAwarded = 50;
    gradeLabelUz = "O'rta (Ishchi model)";
  }

  return { totalScore, xpAwarded, gradeLabelUz };
}

/**
 * Generates deterministic idempotency key for (student_id, source_type, source_id)
 * matching PostgreSQL constraint `uq_xp_student_activity`.
 */
export function buildXpIdempotencyKey(
  studentId: string,
  sourceType: XpSourceType,
  sourceId: string
): string {
  return `${studentId}::${sourceType}::${sourceId}`;
}
