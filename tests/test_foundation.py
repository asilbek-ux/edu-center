import os
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL_001_PATH = ROOT / "supabase" / "migrations" / "001_initial_schema.sql"
SQL_002_PATH = ROOT / "supabase" / "migrations" / "002_security_and_rls_hardening.sql"
MIDDLEWARE_PATH = ROOT / "src" / "middleware.ts"
LOGIN_PAGE_PATH = ROOT / "src" / "app" / "login" / "page.tsx"
ADMIN_PAGE_PATH = ROOT / "src" / "app" / "admin" / "page.tsx"
AUTH_ACTIONS_PATH = ROOT / "src" / "lib" / "supabase" / "auth-actions.ts"
ADMIN_QUERIES_PATH = ROOT / "src" / "lib" / "supabase" / "admin-queries.ts"
README_PATH = ROOT / "README.md"

import sys
sys.path.insert(0, str(ROOT / "bot"))
import main as bot_main


class TestEduCenterTasks1To4(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql_001 = SQL_001_PATH.read_text(encoding="utf-8")
        cls.sql_002 = SQL_002_PATH.read_text(encoding="utf-8")
        cls.middleware = MIDDLEWARE_PATH.read_text(encoding="utf-8")
        cls.login_page = LOGIN_PAGE_PATH.read_text(encoding="utf-8")
        cls.admin_page = ADMIN_PAGE_PATH.read_text(encoding="utf-8")
        cls.auth_actions = AUTH_ACTIONS_PATH.read_text(encoding="utf-8")
        cls.admin_queries = ADMIN_QUERIES_PATH.read_text(encoding="utf-8")
        cls.readme = README_PATH.read_text(encoding="utf-8")

    def test_task1_real_authentication_and_role_redirects(self):
        # 1. Connected to signInWithEmailPassword
        self.assertIn("signInWithEmailPassword", self.login_page)
        # 2. Fake setTimeout removed from login page
        self.assertNotIn("setTimeout", self.login_page)
        # 3. Redirects according to verified role
        for role_route in ["admin: '/admin'", "teacher: '/teacher'", "student: '/student'", "parent: '/parent'"]:
            self.assertIn(role_route, self.login_page)
        # 4. Handles inactive accounts & invalid credentials
        self.assertIn("INACTIVE_ACCOUNT", self.auth_actions)
        self.assertIn("INVALID_CREDENTIALS", self.auth_actions)
        self.assertIn("INACTIVE_ACCOUNT", self.login_page)

    def test_task2_admin_dashboard_connected_to_supabase_no_mock_data(self):
        # 1. No mock arrays in production src/app/admin/page.tsx
        for mock_const in ["INITIAL_STUDENTS", "INITIAL_TEACHERS", "INITIAL_COURSES", "INITIAL_GROUPS", "INITIAL_PAYMENTS"]:
            self.assertNotIn(mock_const, self.admin_page)
        # 2. Uses real query functions from src/lib/supabase/admin-queries.ts
        for fn_name in [
            "fetchAdminOverviewMetrics",
            "fetchAdminStudentsList",
            "fetchAdminTeachersList",
            "fetchAdminCoursesAndGroups",
            "fetchAdminAttendanceHistory",
        ]:
            self.assertIn(fn_name, self.admin_page)
            self.assertIn(f"export async function {fn_name}", self.admin_queries)
        # 3. Working logout button using signOutSecurely
        self.assertIn("signOutSecurely", self.admin_page)
        # 4. Loading, empty, and error states present
        self.assertIn("isLoading", self.admin_page)
        self.assertIn("errorUz", self.admin_page)
        self.assertIn("filteredStudents.length === 0", self.admin_page)

    def test_task3_migrations_ordered_and_non_recursive_rls(self):
        required_tables = [
            "profiles", "students", "teachers", "parents", "parent_students",
            "courses", "groups", "group_students", "lessons", "attendance",
            "payments", "homework", "submissions", "quizzes", "questions",
            "quiz_attempts", "rewards", "xp_transactions", "achievements",
            "student_achievements", "notifications",
        ]
        for table in required_tables:
            self.assertRegex(self.sql_001, rf"CREATE TABLE IF NOT EXISTS public\.{table}\b")

        # Non-recursive profile policy uses SECURITY DEFINER functions instead of SELECT from profiles
        self.assertNotIn("SELECT p.role FROM public.profiles", self.sql_002)
        self.assertIn("role = public.current_user_role()", self.sql_002)
        self.assertIn("is_active = public.current_user_is_active()", self.sql_002)
        self.assertIn("SET search_path = public", self.sql_001)
        self.assertIn("SET search_path = public", self.sql_002)
        # README documents ordered migrations 001 -> 002
        self.assertIn("001_initial_schema.sql", self.readme)
        self.assertIn("002_security_and_rls_hardening.sql", self.readme)

    def test_middleware_zero_cookie_trust_and_no_leaked_secrets(self):
        self.assertNotIn("request.cookies.get('educenter_role')", self.middleware)
        self.assertIn("supabase.auth.getUser()", self.middleware)
        for path in (ROOT / "src").rglob("*"):
            if path.is_file():
                content = path.read_text(encoding="utf-8")
                self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", content)
                self.assertNotIn("TELEGRAM_BOT_TOKEN", content)

    def test_telegram_bot_uzbek_formatters(self):
        msg = bot_main.format_attendance_notification_uz(
            "Aliyev Sardor", "ROB-01 (Arduino)", "present", "2026-11-12"
        )
        self.assertIn("EduCenter — Davomat xabarnomasi", msg)


if __name__ == "__main__":
    unittest.main()
