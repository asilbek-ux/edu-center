"""
EduCenter Telegram Bot (Python 3.11+ / aiogram 3.x)
IT, Dasturlash va Robototexnika Ta'lim Markazi Boshqaruv Tizimi Boti.

Features:
1. Xavfsiz hisobni biriktirish (/start <token> orqali token validatsiyasi)
2. Rolga asoslangan ma'lumotlar (/holat, /jadval, /davomat, /balans, /vazifalar)
3. Ota-onalar va o'quvchilarga avtomatik Telegram bildirishnomalar yuborish
4. Asinxron aiogram 3.x arxitekturasi va Supabase integratsiyasi
"""

import asyncio
import logging
import os
import sys
from typing import Dict, Any, Optional

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, CommandStart, CommandObject
from aiogram.enums import ParseMode
from aiogram.types import BotCommand

# Load local config
try:
    from config import BotConfig
except ImportError:
    from bot.config import BotConfig

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)
logger = logging.getLogger("educenter_bot")


# ============================================================================
# 1. NOTIFICATION FORMATTERS (Uzbek Latin)
# ============================================================================

def format_attendance_notification_uz(student_name: str, group_name: str, status: str, date_str: str) -> str:
    status_map = {
        "present": "✅ Darsda qatnashdi",
        "late": "⏳ Darsga kechikib keldi",
        "absent": "❌ Darsga kelmadi",
        "excused": "📋 Sababli dars qoldirdi",
    }
    badge = status_map.get(status, status)
    return (
        f"🔔 <b>EduCenter — Davomat xabarnomasi</b>\n\n"
        f"👤 O'quvchi: <b>{student_name}</b>\n"
        f"📚 Guruh: <b>{group_name}</b>\n"
        f"📅 Sana: {date_str}\n"
        f"📌 Holat: <b>{badge}</b>"
    )

def format_payment_reminder_uz(student_name: str, month_label: str, amount_due_uzs: int) -> str:
    formatted_uzs = f"{amount_due_uzs:,}".replace(",", " ")
    return (
        f"💳 <b>EduCenter — O'quv To'lovi Eslatmasi</b>\n\n"
        f"Hurmatli ota-ona, <b>{student_name}</b> uchun <b>{month_label}</b> oyi "
        f"o'quv to'lovi (<b>{formatted_uzs} so'm</b>) muddati yaqinlashmoqda.\n\n"
        f"To'lovni Payme, Click, Uzum Bank yoki markaz kassasi orqali amalga oshirishingiz mumkin."
    )

def format_weekly_report_uz(data: Dict[str, Any]) -> str:
    return (
        f"📊 <b>EduCenter — Haftalik O'zlashtirish Hisoboti</b>\n\n"
        f"👤 O'quvchi: <b>{data.get('student_name', 'O\'quvchi')}</b>\n"
        f"🏆 Daraja: <b>{data.get('level', 1)}-daraja ({data.get('xp_total', 0)} XP)</b>\n"
        f"✅ Haftalik davomat: <b>{data.get('attendance_rate', 100)}%</b>\n"
        f"📝 Topshirilgan vazifalar: <b>{data.get('homework_completed', 0)}/{data.get('homework_total', 0)}</b>\n"
        f"🧪 Test natijasi (o'rtacha): <b>{data.get('quiz_avg', 0)}%</b>\n"
        f"🤖 Haftalik XP o'sishi: <b>+{data.get('weekly_xp', 0)} XP</b>"
    )

def format_homework_notification_uz(group_name: str, title_uz: str, deadline_str: str, xp_reward: int) -> str:
    return (
        f"📝 <b>EduCenter — Yangi Uy Vazifasi / Loyiha!</b>\n\n"
        f"📚 Guruh: <b>{group_name}</b>\n"
        f"📌 Mavzu: <b>{title_uz}</b>\n"
        f"⏳ Topshirish muddati: <b>{deadline_str}</b>\n"
        f"🎁 Muvaffaqiyatli topshirish uchun: <b>+{xp_reward} XP</b>"
    )


# ============================================================================
# 2. SUPABASE ASYNC CLIENT HELPER
# ============================================================================

def get_supabase_client():
    try:
        from supabase import create_client
        cfg = BotConfig.from_env()
        return create_client(cfg.supabase_url, cfg.supabase_service_role_key)
    except Exception as e:
        logger.error(f"Supabase client initialize failed: {e}")
        return None


# ============================================================================
# 3. AIOGRAM DISPATCHER & COMMAND HANDLERS
# ============================================================================

dp = Dispatcher()

@dp.message(CommandStart())
async def handle_start(message: types.Message, command: CommandObject):
    chat_id = message.chat.id
    token = command.args
    user_name = message.from_user.first_name or "Foydalanuvchi"
    username = message.from_user.username

    supabase = get_supabase_client()
    if not supabase:
        await message.answer(
            f"Salom, <b>{user_name}</b>!\n"
            f"EduCenter ta'lim platformasi botiga xush kelibsiz.\n"
            f"Hozirda server ulanishi sozlanmoqda.",
            parse_mode=ParseMode.HTML
        )
        return

    # Case A: User provided a token in deep-link: /start <token>
    if token:
        try:
            res = supabase.rpc("fn_link_telegram_account", {
                "p_token": token.strip(),
                "p_chat_id": chat_id,
                "p_username": username or ""
            }).execute()

            data = res.data or {}
            if data.get("success"):
                role_uz = {
                    "super_admin": "Bosh Administrator",
                    "admin": "Administrator",
                    "teacher": "O'qituvchi (Ustoz)",
                    "student": "O'quvchi",
                    "parent": "Ota-ona",
                }.get(data.get("role"), "Foydalanuvchi")

                await message.answer(
                    f"🎉 <b>Tabriklaymiz, hisobingiz muvaffaqiyatli bog'landi!</b>\n\n"
                    f"👤 Ism: <b>{data.get('full_name')}</b>\n"
                    f"🔰 Tizimdagi rol: <b>{role_uz}</b>\n\n"
                    f"Endi siz davomat, to'lovlar va dars jadvallari bo'yicha tezkor bildirishnomalarni shu bot orqali qabul qilasiz.\n\n"
                    f"Buyruqlar ro'yxati: /help",
                    parse_mode=ParseMode.HTML
                )
                return
            else:
                await message.answer(
                    f"⚠️ <b>Xatolik:</b> {data.get('error_uz', 'Bog\'lash kodi yaroqsiz yoki eskirgan.')}\n"
                    f"Iltimos, EduCenter web panelingizdan yangi havola oling.",
                    parse_mode=ParseMode.HTML
                )
                return
        except Exception as e:
            logger.error(f"Error linking account: {e}")
            await message.answer("⚠️ Bog'lash jarayonida xatolik yuz berdi. Qayta urinib ko'ring.")
            return

    # Case B: Standard /start without token — check if chat_id already linked
    try:
        prof_res = supabase.from_("profiles").select("id, role, full_name, is_active").eq("telegram_chat_id", chat_id).execute()
        if prof_res.data and len(prof_res.data) > 0:
            profile = prof_res.data[0]
            role_uz = {
                "super_admin": "Bosh Administrator",
                "admin": "Administrator",
                "teacher": "O'qituvchi",
                "student": "O'quvchi",
                "parent": "Ota-ona",
            }.get(profile.get("role"), "Foydalanuvchi")

            await message.answer(
                f"Assalomu alaykum, <b>{profile.get('full_name')}</b>!\n"
                f"Sizning hisobingiz tizimga ulangan (<b>{role_uz}</b>).\n\n"
                f"Foydali buyruqlar:\n"
                f"📋 /holat — Shaxsiy profil holati\n"
                f"📅 /jadval — Dars jadvallari\n"
                f"✅ /davomat — Davomat ma'lumotlari\n"
                f"💳 /balans — To'lovlar holati\n"
                f"📝 /vazifalar — Uy vazifalari",
                parse_mode=ParseMode.HTML
            )
            return
    except Exception as e:
        logger.error(f"Error checking user profile: {e}")

    # Case C: Not linked yet
    await message.answer(
        f"Assalomu alaykum, <b>{user_name}</b>!\n\n"
        f"🤖 <b>EduCenter ERP/LMS</b> rasmiy Telegram botiga xush kelibsiz.\n\n"
        f"Hisobingizni botga biriktirish uchun:\n"
        f"1. EduCenter platformasiga (web sahifangizga) kiring.\n"
        f"2. Profilingizdan <b>\"Telegramni Bog'lash\"</b> tugmasini bosing.\n"
        f"3. Botga yuborilgan shaxsiy xavfsiz havolani oching.\n\n"
        f"Yordam uchun: /help",
        parse_mode=ParseMode.HTML
    )

@dp.message(Command("help"))
async def handle_help(message: types.Message):
    await message.answer(
        f"📖 <b>EduCenter Bot — Yordam Qo'llanmasi</b>\n\n"
        f"Ushbu bot IT, Dasturlash va Robototexnika o'quv markazi o'quvchilari, ota-onalari va o'qituvchilari uchun xizmat ko'rsatadi.\n\n"
        f"<b>Asosiy buyruqlar:</b>\n"
        f"• /start — Botni ishga tushirish yoki hisobni biriktirish\n"
        f"• /holat — Shaxsiy profilingiz, XP ballaringiz va darajangiz\n"
        f"• /jadval — Dars kunlari, xona va boshlanish vaqtlari\n"
        f"• /davomat — So'nggi darslardagi davomat natijasi\n"
        f"• /balans — O'quv to'lovlari, kvitansiyalar va qarz balansi\n"
        f"• /vazifalar — Topshirilishi kerak bo'lgan uy vazifalari\n"
        f"• /help — Ushbu yordam oynasi",
        parse_mode=ParseMode.HTML
    )

@dp.message(Command("holat"))
async def handle_status(message: types.Message):
    chat_id = message.chat.id
    supabase = get_supabase_client()
    if not supabase:
        await message.answer("⚠️ Ma'lumotlar bazasi vaqtincha ulanmagan.")
        return

    try:
        res = supabase.from_("profiles").select(
            "id, full_name, role, phone, email, is_active, students(*)"
        ).eq("telegram_chat_id", chat_id).execute()

        if not res.data or len(res.data) == 0:
            await message.answer("⚠️ Sizning hisobingiz tizimga ulanmagan. Iltimos, /start orqali ulaning.")
            return

        prof = res.data[0]
        std_list = prof.get("students") or []
        std = std_list[0] if std_list else None

        role_uz = {
            "super_admin": "Bosh Administrator",
            "admin": "Administrator",
            "teacher": "O'qituvchi",
            "student": "O'quvchi",
            "parent": "Ota-ona",
        }.get(prof.get("role"), "Foydalanuvchi")

        msg = (
            f"👤 <b>Foydalanuvchi Ma'lumotlari:</b>\n\n"
            f"Ism: <b>{prof.get('full_name')}</b>\n"
            f"Rol: <b>{role_uz}</b>\n"
            f"Telefon: <code>{prof.get('phone') or '—'}</code>\n"
        )

        if std:
            msg += (
                f"\n🏆 Kod: <b>{std.get('student_code')}</b>\n"
                f"⭐ Daraja: <b>{std.get('current_level')}-daraja</b>\n"
                f"⚡ Jami XP: <b>{std.get('xp_total')} XP</b>\n"
                f"🔥 Ketma-ketlik (Streak): <b>{std.get('streak_days')} kun</b>"
            )

        await message.answer(msg, parse_mode=ParseMode.HTML)
    except Exception as e:
        logger.error(f"Error fetching status: {e}")
        await message.answer("Ma'lumotlarni yuklashda xatolik yuz berdi.")

@dp.message(Command("jadval"))
async def handle_schedule(message: types.Message):
    chat_id = message.chat.id
    supabase = get_supabase_client()
    if not supabase:
        await message.answer("⚠️ Ma'lumotlar bazasi ulanmagan.")
        return

    try:
        # Check profile
        prof = supabase.from_("profiles").select("id, role").eq("telegram_chat_id", chat_id).single().execute()
        if not prof.data:
            await message.answer("Hisobingiz ulanmagan. Iltimos, web platformadan /start havolasi oling.")
            return

        role = prof.data.get("role")
        user_id = prof.data.get("id")

        if role == "teacher":
            tch = supabase.from_("teachers").select("id").eq("profile_id", user_id).single().execute()
            if tch.data:
                grps = supabase.from_("groups").select("code, name, room, schedule_days, start_time, end_time").eq("teacher_id", tch.data.get("id")).eq("status", "active").execute()
                if grps.data:
                    lines = ["📅 <b>Sizning Dars Jadvallaringiz:</b>\n"]
                    for g in grps.data:
                        lines.append(f"• <b>{g['code']}</b> ({g['name']}): {g['schedule_days']} {g['start_time'][:5]}–{g['end_time'][:5]} (Xona: {g['room']})")
                    await message.answer("\n".join(lines), parse_mode=ParseMode.HTML)
                    return

        elif role == "student":
            std = supabase.from_("students").select("id").eq("profile_id", user_id).single().execute()
            if std.data:
                enrolls = supabase.from_("group_students").select("groups(code, name, room, schedule_days, start_time, end_time)").eq("student_id", std.data.get("id")).eq("status", "active").execute()
                if enrolls.data:
                    lines = ["📅 <b>Sizning Dars Jadvalingiz:</b>\n"]
                    for e in enrolls.data:
                        g = e.get("groups")
                        if g:
                            lines.append(f"• <b>{g['code']}</b> ({g['name']}): {g['schedule_days']} {g['start_time'][:5]}–{g['end_time'][:5]} (Xona: {g['room']})")
                    await message.answer("\n".join(lines), parse_mode=ParseMode.HTML)
                    return

        await message.answer("Hozirda faol dars jadvallari topilmadi.")
    except Exception as e:
        logger.error(f"Error fetching schedule: {e}")
        await message.answer("Jadvalni yuklashda xatolik yuz berdi.")

@dp.message(Command("davomat"))
async def handle_attendance_cmd(message: types.Message):
    chat_id = message.chat.id
    supabase = get_supabase_client()
    if not supabase:
        await message.answer("⚠️ Ma'lumotlar bazasi ulanmagan.")
        return

    try:
        prof = supabase.from_("profiles").select("id, role").eq("telegram_chat_id", chat_id).single().execute()
        if not prof.data:
            await message.answer("Hisobingiz ulanmagan. Iltimos, /start orqali ulaning.")
            return

        user_id = prof.data.get("id")
        std = supabase.from_("students").select("id").eq("profile_id", user_id).execute()

        student_id = None
        if std.data and len(std.data) > 0:
            student_id = std.data[0].get("id")
        else:
            # Check parent
            parent = supabase.from_("parents").select("id").eq("profile_id", user_id).execute()
            if parent.data:
                links = supabase.from_("parent_students").select("student_id").eq("parent_id", parent.data[0]["id"]).execute()
                if links.data:
                    student_id = links.data[0]["student_id"]

        if not student_id:
            await message.answer("O'quvchi ma'lumotlari topilmadi.")
            return

        att_res = supabase.from_("attendance").select(
            "status, lessons(lesson_date, topic_uz, groups(code))"
        ).eq("student_id", student_id).order("created_at", desc=True).limit(5).execute()

        if not att_res.data:
            await message.answer("Davomat ma'lumotlari hali kiritilmagan.")
            return

        status_uz = {
            "present": "✅ Hozir",
            "late": "⏳ Kechikdi",
            "absent": "❌ Kelmadi",
            "excused": "📋 Sababli"
        }

        lines = ["📋 <b>So'nggi Darslardagi Davomat:</b>\n"]
        for a in att_res.data:
            ls = a.get("lessons") or {}
            grp = ls.get("groups") or {}
            st = status_uz.get(a.get("status"), a.get("status"))
            lines.append(f"• <b>{ls.get('lesson_date')}</b> [{grp.get('code', '—')}]: {st}\n  Mavzu: {ls.get('topic_uz', '—')}")

        await message.answer("\n\n".join(lines), parse_mode=ParseMode.HTML)
    except Exception as e:
        logger.error(f"Error fetching attendance: {e}")
        await message.answer("Davomatni yuklashda xatolik yuz berdi.")

@dp.message(Command("balans"))
async def handle_balance_cmd(message: types.Message):
    chat_id = message.chat.id
    supabase = get_supabase_client()
    if not supabase:
        await message.answer("⚠️ Ma'lumotlar bazasi ulanmagan.")
        return

    try:
        prof = supabase.from_("profiles").select("id, role").eq("telegram_chat_id", chat_id).single().execute()
        if not prof.data:
            await message.answer("Hisobingiz ulanmagan.")
            return

        user_id = prof.data.get("id")
        std = supabase.from_("students").select("id").eq("profile_id", user_id).execute()
        student_id = None
        if std.data and len(std.data) > 0:
            student_id = std.data[0]["id"]
        else:
            parent = supabase.from_("parents").select("id").eq("profile_id", user_id).execute()
            if parent.data:
                links = supabase.from_("parent_students").select("student_id").eq("parent_id", parent.data[0]["id"]).execute()
                if links.data:
                    student_id = links.data[0]["student_id"]

        if not student_id:
            await message.answer("To'lov yozuvlari topilmadi.")
            return

        pay_res = supabase.from_("payments").select(
            "invoice_number, billing_month, amount_due_uzs, amount_paid_uzs, status"
        ).eq("student_id", student_id).order("billing_month", desc=True).limit(3).execute()

        if not pay_res.data:
            await message.answer("To'lov hisoblari topilmadi.")
            return

        lines = ["💳 <b>To'lovlar Holati:</b>\n"]
        total_debt = 0
        for p in pay_res.data:
            due = int(p.get("amount_due_uzs", 0))
            paid = int(p.get("amount_paid_uzs", 0))
            debt = max(0, due - paid)
            total_debt += debt
            status_text = "To'langan" if p.get("status") == "paid" else "Qarzdor" if p.get("status") == "overdue" else "Kutilmoqda"
            lines.append(f"• <b>{p.get('billing_month')}</b>: To'langan {paid:,} so'm / Jami {due:,} so'm ({status_text})")

        lines.append(f"\n📌 <b>Umumiy qoldiq qarz: {total_debt:,} so'm</b>")
        await message.answer("\n".join(lines), parse_mode=ParseMode.HTML)
    except Exception as e:
        logger.error(f"Error fetching balance: {e}")
        await message.answer("To'lovlarni yuklashda xatolik yuz berdi.")

@dp.message(Command("vazifalar"))
async def handle_homework_cmd(message: types.Message):
    chat_id = message.chat.id
    supabase = get_supabase_client()
    if not supabase:
        await message.answer("⚠️ Ma'lumotlar bazasi ulanmagan.")
        return

    try:
        prof = supabase.from_("profiles").select("id, role").eq("telegram_chat_id", chat_id).single().execute()
        if not prof.data:
            await message.answer("Hisobingiz ulanmagan.")
            return

        user_id = prof.data.get("id")
        std = supabase.from_("students").select("id").eq("profile_id", user_id).execute()
        if not std.data:
            await message.answer("Ushbu buyruq faqat o'quvchilar uchun mavjud.")
            return

        student_id = std.data[0]["id"]
        grps = supabase.from_("group_students").select("group_id").eq("student_id", student_id).execute()
        group_ids = [g["group_id"] for g in (grps.data or [])]

        if not group_ids:
            await message.answer("Siz birorta guruhga biriktirilmagansiz.")
            return

        hw_res = supabase.from_("homework").select(
            "title_uz, deadline, xp_reward, groups(code)"
        ).in_("group_id", group_ids).order("deadline", desc=True).limit(5).execute()

        if not hw_res.data:
            await message.answer("Hozirda yangi uy vazifalari yo'q.")
            return

        lines = ["📝 <b>Joriy Uy Vazifalari:</b>\n"]
        for h in hw_res.data:
            grp = h.get("groups") or {}
            lines.append(f"• [{grp.get('code', '—')}] <b>{h.get('title_uz')}</b>\n  Muddati: {h.get('deadline')[:16].replace('T', ' ')} (+{h.get('xp_reward')} XP)")

        await message.answer("\n\n".join(lines), parse_mode=ParseMode.HTML)
    except Exception as e:
        logger.error(f"Error fetching homework: {e}")
        await message.answer("Vazifalarni yuklashda xatolik yuz berdi.")


# ============================================================================
# 4. BACKGROUND ASYNC NOTIFICATION SENDER
# ============================================================================

async def notification_worker(bot: Bot):
    """Periodically fetches unsent notifications from Supabase and sends via Telegram."""
    logger.info("Starting background notification worker loop...")
    while True:
        try:
            supabase = get_supabase_client()
            if supabase:
                # Query notifications with un-sent status
                res = supabase.from_("notifications").select(
                    "id, recipient_profile_id, title_uz, body_uz, profiles:recipient_profile_id(telegram_chat_id)"
                ).eq("sent_via_telegram", False).limit(10).execute()

                for notif in res.data or []:
                    prof = notif.get("profiles")
                    chat_id = prof.get("telegram_chat_id") if prof else None

                    if chat_id:
                        text = f"🔔 <b>{notif.get('title_uz')}</b>\n\n{notif.get('body_uz')}"
                        try:
                            sent_msg = await bot.send_message(chat_id, text, parse_mode=ParseMode.HTML)
                            supabase.from_("notifications").update({
                                "sent_via_telegram": True,
                                "telegram_message_id": sent_msg.message_id
                            }).eq("id", notif["id"]).execute()
                            logger.info(f"Notification {notif['id']} sent to chat_id {chat_id}")
                        except Exception as send_err:
                            logger.warning(f"Failed to send telegram message to {chat_id}: {send_err}")
                            # Mark as true to prevent endless retry loops on blocked bots
                            supabase.from_("notifications").update({
                                "sent_via_telegram": True
                            }).eq("id", notif["id"]).execute()
        except Exception as e:
            logger.error(f"Error in notification worker loop: {e}")

        await asyncio.sleep(15)


# ============================================================================
# 5. BOT RUNNER & LIFECYCLE
# ============================================================================

async def main():
    try:
        cfg = BotConfig.from_env()
    except Exception as e:
        logger.error(f"Cannot start bot: {e}")
        sys.exit(1)

    bot = Bot(token=cfg.telegram_bot_token)

    # Set Telegram Menu Commands
    await bot.set_my_commands([
        BotCommand(command="start", description="Botni ishga tushirish"),
        BotCommand(command="holat", description="Shaxsiy ma'lumotlar va XP"),
        BotCommand(command="jadval", description="Dars jadvallari"),
        BotCommand(command="davomat", description="So'nggi davomat"),
        BotCommand(command="balans", description="To'lovlar va qarz holati"),
        BotCommand(command="vazifalar", description="Uy vazifalari"),
        BotCommand(command="help", description="Yordam va qo'llanma"),
    ])

    # Start background notification task
    asyncio.create_task(notification_worker(bot))

    logger.info("EduCenter Telegram Bot started successfully. Listening for updates...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
