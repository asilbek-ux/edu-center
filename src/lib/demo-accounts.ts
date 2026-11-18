import { UserRole } from '@/types/database';

export interface DemoAccount {
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
  titleUz: string;
  badgeUz: string;
  color: string;
  bgLight: string;
  borderColor: string;
  descriptionUz: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'super_admin',
    fullName: 'Anvar Alimov',
    email: 'admin@educenter.uz',
    password: 'admin123',
    titleUz: 'Bosh Administrator',
    badgeUz: 'Super Admin',
    color: 'from-purple-600 to-indigo-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    descriptionUz: "To'liq markaz nazorati, moliya, xodimlar, guruhlar va audit",
  },
  {
    role: 'admin',
    fullName: 'Malika Karimova',
    email: 'menejer@educenter.uz',
    password: 'admin123',
    titleUz: "O'quv Menejeri",
    badgeUz: 'Admin',
    color: 'from-blue-600 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    descriptionUz: "O'quvchilar, guruhlar, to'lovlar va davomat monitoringi",
  },
  {
    role: 'teacher',
    fullName: 'Javohir Rustamov',
    email: 'teacher@educenter.uz',
    password: 'teacher123',
    titleUz: "Robototexnika Ustozi",
    badgeUz: "O'qituvchi",
    color: 'from-emerald-600 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    descriptionUz: "Guruhlar, darslar, davomat olish, uy vazifa va testlar",
  },
  {
    role: 'student',
    fullName: 'Sardorbek Rahimov',
    email: 'student@educenter.uz',
    password: 'student123',
    titleUz: "Robototexnika O'quvchisi",
    badgeUz: "O'quvchi",
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    descriptionUz: "XP, geymifikatsiya, dars jadvali, topshiriqlar va yutuqlar",
  },
  {
    role: 'parent',
    fullName: 'Dilnoza Rahimova',
    email: 'parent@educenter.uz',
    password: 'parent123',
    titleUz: "Farzand Nazorati",
    badgeUz: 'Ota-ona',
    color: 'from-pink-600 to-rose-600',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-200',
    descriptionUz: "Farzand davomati, baholari, to'lovlari va o'zlashtirish grafigi",
  },
];
