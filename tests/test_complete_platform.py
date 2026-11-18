import os
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL_001_PATH = ROOT / "supabase" / "migrations" / "001_initial_schema.sql"
SQL_002_PATH = ROOT / "supabase" / "migrations" / "002_security_and_rls_hardening.sql"
SQL_003_PATH = ROOT / "supabase" / "migrations" / "003_complete_platform_features.sql"
MIDDLEWARE_PATH = ROOT / "src" / "middleware.ts"
LOGIN_PAGE_PATH = ROOT / "src" / "app" / "login" / "page.tsx"
ADMIN_PAGE_PATH = ROOT / "src" / "app" / "admin" / "page.tsx"
TEACHER_PAGE_PATH = ROOT / "src" / "app" / "teacher" / "page.tsx"
STUDENT_PAGE_PATH = ROOT / "src" / "app" / "student" / "page.tsx"
PARENT_PAGE_PATH = ROOT / "src" / "app" / "parent" / "page.tsx"
AUTH_ACTIONS_PATH = ROOT / "src" / "lib" / "supabase" / "auth-actions.ts"
ADMIN_QUERIES_PATH = ROOT / "src" / "lib" / "supabase" / "admin-queries.ts"
TEACHER_QUERIES_PATH = ROOT / "src" / "lib" / "supabase" / "teacher-queries.ts"
STUDENT_QUERIES_PATH = ROOT / "src" / "lib" / "supabase" / "student-queries.ts"
PARENT_QUERIES_PATH = ROOT / "src" / "lib" / "supabase" / "parent-queries.ts"
SCHEMAS_PATH = ROOT / "src" / "lib" / "validations" / "schemas.ts"
DATABASE_TYPES_PATH = ROOT / "src" / "types" / "database.ts"
README_PATH = ROOT / "README.md"
BOT_MAIN_PATH = ROOT / "bot" / "main.py"
BOT_CONFIG_PATH = ROOT / "bot" / "config.py"

import sys
sys.path.insert(0, str(ROOT / "bot"))
import main as bot_main


class TestCompleteEduCenterPlatform(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql_001 = SQL_001_PATH.read_text(encoding="utf-8")
        cls.sql_002 = SQL_002_PATH.read_text(encoding="utf-8")
        cls.sql_003 = SQL_003_PATH.read_text(encoding="utf-8")
        cls.middleware = MIDDLEWARE_PATH.read_text(encoding="utf-8")
        cls.login_page = LOGIN_PAGE_PATH.read_text(encoding="utf-8")
        cls.admin_page = ADMIN_PAGE_PATH.read_text(encoding="utf-8")
        cls.teacher_page = TEACHER_PAGE_PATH.read_text(encoding="utf-8")
        cls.student_page = STUDENT_PAGE_PATH.read_text(encoding="utf-8")
        cls.parent_page = PARENT_PAGE_PATH.read_text(encoding="utf-8")
        cls.auth_actions = AUTH_ACTIONS_PATH.read_text(encoding="utf-8")
        cls.admin_queries = ADMIN_QUERIES_PATH.read_text(encoding="utf-8")
        cls.teacher_queries = TEACHER_QUERIES_PATH.read_text(encoding="utf-8")
        cls.student_queries = STUDENT_QUERIES_PATH.read_text(encoding="utf-8")
        cls.parent_queries = PARENT_QUERIES_PATH.read_text(encoding="utf-8")
        cls.schemas = SCHEMAS_PATH.read_text(encoding="utf-8")
        cls.db_types = DATABASE_TYPES_PATH.read_text(encoding="utf-8")
        cls.readme = README_PATH.read_text(encoding="utf-8")
        cls.bot_main = BOT_MAIN_PATH.read_text(encoding="utf-8")

    def test_five_user_roles_defined_and_protected(self):
        # 1. 5 distinct roles in database types
        for role in ["super_admin", "admin", "teacher", "student", "parent"]:
            self.assertIn(f"'{role}'", self.db_types)

        # 2. Migration 003 upgrades user_role enum
        self.assertIn("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin'", self.sql_003)

        # 3. Middleware isolates each role's dashboard
        self.assertIn("super_admin: '/admin'", self.middleware)
        self.assertIn("admin: '/admin'", self.middleware)
        self.assertIn("teacher: '/teacher'", self.middleware)
        self.assertIn("student: '/student'", self.middleware)
        self.assertIn("parent: '/parent'", self.middleware)

        # 4. Server guards check each role
        self.assertIn("requireAdminServerAuth", self.auth_actions)
        self.assertIn("requireTeacherServerAuth", self.auth_actions)
        self.assertIn("requireStudentServerAuth", self.auth_actions)
        self.assertIn("requireParentServerAuth", self.auth_actions)

    def test_all_four_dashboards_exist_and_functional(self):
        # Admin Page
        self.assertTrue(ADMIN_PAGE_PATH.exists())
        self.assertIn("fetchAdminOverviewMetrics", self.admin_page)
        self.assertIn("fetchAdminStudentsList", self.admin_page)
        self.assertIn("fetchAdminTeachersList", self.admin_page)
        self.assertIn("fetchAdminParentsList", self.admin_page)
        self.assertIn("fetchAdminPaymentsList", self.admin_page)
        self.assertIn("fetchAdminAttendanceHistory", self.admin_page)

        # Teacher Page
        self.assertTrue(TEACHER_PAGE_PATH.exists())
        self.assertIn("fetchTeacherDashboardData", self.teacher_page)
        self.assertIn("createLessonForTeacher", self.teacher_page)
        self.assertIn("markBatchAttendanceForTeacher", self.teacher_page)
        self.assertIn("createHomeworkForTeacher", self.teacher_page)
        self.assertIn("gradeSubmissionForTeacher", self.teacher_page)

        # Student Page
        self.assertTrue(STUDENT_PAGE_PATH.exists())
        self.assertIn("fetchStudentDashboardData", self.student_page)
        self.assertIn("submitHomeworkForStudent", self.student_page)
        self.assertIn("getQuizQuestionsForStudent", self.student_page)
        self.assertIn("submitQuizAttemptForStudent", self.student_page)

        # Parent Page
        self.assertTrue(PARENT_PAGE_PATH.exists())
        self.assertIn("fetchParentDashboardData", self.parent_page)
        self.assertIn("fetchParentChildDetails", self.parent_page)

    def test_sql_migration_003_security_and_procedures(self):
        # 1. Helper functions
        self.assertIn("FUNCTION public.is_admin()", self.sql_003)
        self.assertIn("FUNCTION public.is_super_admin()", self.sql_003)
        self.assertIn("FUNCTION public.is_teacher_of_student", self.sql_003)
        self.assertIn("FUNCTION public.is_student_in_group", self.sql_003)

        # 2. Critical secure functions
        self.assertIn("FUNCTION public.fn_record_payment", self.sql_003)
        self.assertIn("FUNCTION public.fn_submit_quiz_attempt", self.sql_003)
        self.assertIn("FUNCTION public.fn_link_telegram_account", self.sql_003)
        self.assertIn("FUNCTION public.fn_check_group_schedule_conflict", self.sql_003)

        # 3. Strict RLS write locks
        self.assertIn("POLICY teacher_manage_lessons", self.sql_003)
        self.assertIn("POLICY teacher_manage_homework", self.sql_003)
        self.assertIn("POLICY teacher_grade_submissions", self.sql_003)
        self.assertIn("POLICY student_manage_own_submissions", self.sql_003)
        self.assertIn("POLICY student_insert_quiz_attempt", self.sql_003)

    def test_input_validations_complete(self):
        for fn in [
            "validateEmailPasswordInput",
            "validateStudentInput",
            "validateTeacherInput",
            "validateCourseInput",
            "validateGroupInput",
            "validatePaymentInput",
            "validateHomeworkInput",
            "validateQuizInput",
        ]:
            self.assertIn(f"export function {fn}", self.schemas)

    def test_telegram_bot_integration_complete(self):
        # Commands
        self.assertIn("handle_start", self.bot_main)
        self.assertIn("handle_help", self.bot_main)
        self.assertIn("handle_status", self.bot_main)
        self.assertIn("handle_schedule", self.bot_main)
        self.assertIn("handle_attendance_cmd", self.bot_main)
        self.assertIn("handle_balance_cmd", self.bot_main)
        self.assertIn("handle_homework_cmd", self.bot_main)

        # Background notification poller
        self.assertIn("notification_worker", self.bot_main)

        # Formatters test
        msg_att = bot_main.format_attendance_notification_uz(
            "Karimov Anvar", "ROB-02", "late", "2026-11-16"
        )
        self.assertIn("EduCenter — Davomat xabarnomasi", msg_att)
        self.assertIn("Karimov Anvar", msg_att)
        self.assertIn("kechikib", msg_att)

        msg_pay = bot_main.format_payment_reminder_uz(
            "Karimov Anvar", "Noyabr", 650000
        )
        self.assertIn("650 000 so'm", msg_pay)
        self.assertIn("Payme, Click, Uzum", msg_pay)

    def test_no_secret_keys_in_client_code(self):
        for path in (ROOT / "src").rglob("*"):
            if path.is_file() and path.suffix in [".ts", ".tsx", ".js", ".mjs"]:
                content = path.read_text(encoding="utf-8")
                self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", content)
                self.assertNotIn("TELEGRAM_BOT_TOKEN", content)
                self.assertNotIn("TELEGRAM_WEBHOOK_SECRET", content)


if __name__ == "__main__":
    unittest.main()
