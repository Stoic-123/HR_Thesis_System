import prisma from "../lib/prisma.js";
import { toICTDate, formatICTDate } from "../utils/timezone.js";
import { sendTelegramMessage } from "./Telegram.js";

// Helper to parse "HH:MM" string and convert to minutes since midnight
const getMinutesFromTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hh, mm] = timeStr.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const getTodayKey = (dateObj) => {
  const localDate = toICTDate(dateObj);
  const dayIdx = localDate.getUTCDay();
  if (dayIdx === 0) return "sunday";
  if (dayIdx === 1) return "monday";
  if (dayIdx === 2) return "tuesday";
  if (dayIdx === 3) return "wednesday";
  if (dayIdx === 4) return "thursday";
  if (dayIdx === 5) return "friday";
  return "saturday";
};

// Keep track of sent reminders to prevent duplicates
const sentReminders = new Set();
let lastCleanedDate = formatICTDate(new Date());

let isRunning = false;

export const checkAndSendAttendanceReminders = async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    const rawNow = new Date();
    const ictNow = toICTDate(rawNow);
    const currentHours = ictNow.getUTCHours();
    const currentMinutes = ictNow.getUTCMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    // Pass rawNow (unshifted) to avoid double shifting inside getTodayKey
    const dayKey = getTodayKey(rawNow);
    const todayStr = formatICTDate(rawNow);

    // Clean up cache once a day
    if (todayStr !== lastCleanedDate) {
      sentReminders.clear();
      lastCleanedDate = todayStr;
    }

    // Fetch active employees who have registered a telegram_chat_id
    const employees = await prisma.employee.findMany({
      where: {
        is_active: "active",
        telegram_chat_id: { not: null },
      },
      include: {
        company: true,
        employeeworkingprofile: {
          include: {
            dayofweek: {
              include: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true,
              }
            }
          }
        }
      }
    });

    for (const employee of employees) {
      const company = employee.company;
      if (!company || !company.telegram_bot_token) continue;

      // Determine dayofweek configuration (use custom or default)
      let dayOfWeekConfig = employee.employeeworkingprofile?.dayofweek;
      if (!dayOfWeekConfig) {
        // Fallback to company default
        dayOfWeekConfig = await prisma.dayofweek.findFirst({
          where: { company_id: company.id, is_default: true },
          include: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true,
          }
        });
      }

      if (!dayOfWeekConfig) continue;

      const timeSheet = dayOfWeekConfig[dayKey];
      if (!timeSheet) continue;

      // Check each reminder dynamically
      const checkReminder = async (timeStr, isRequired, labelKhmer) => {
        if (!isRequired || !timeStr) return;
        const timeMinutes = getMinutesFromTimeString(timeStr);
        if (timeMinutes === null) return;

        // Check if current time is exactly 5 minutes before scheduled time
        if (currentTotalMinutes === timeMinutes - 5) {
          const reminderKey = `${employee.telegram_chat_id}-${timeMinutes}-${timeStr}-${todayStr}`;
          if (sentReminders.has(reminderKey)) return;

          sentReminders.add(reminderKey);

          const message = `🔔 <b>រំលឹកចាក់វត្តមាន៖</b>\nសូមកុំភ្លេចស្កេនវត្តមានសម្រាប់ <b>${labelKhmer}</b> វេលាម៉ោង <b>${timeStr}</b> (នៅសល់ ៥នាទីទៀត)។`;
          
          await sendTelegramMessage(company.telegram_bot_token, employee.telegram_chat_id, message);
          console.log(`[Reminder] Sent reminder to employee ${employee.first_name} ${employee.last_name} for ${timeStr}`);
        }
      };

      // Check all 4 schedule fields dynamically (with default fallbacks if properties are null)
      await checkReminder(timeSheet.time_in, timeSheet.require_time_in ?? true, "ចូលធ្វើការ");
      await checkReminder(timeSheet.lunch_out, timeSheet.require_lunch_out ?? false, "ចេញសម្រាកអាហារថ្ងៃត្រង់");
      await checkReminder(timeSheet.lunch_in, timeSheet.require_lunch_in ?? false, "ចូលធ្វើការវិញ");
      await checkReminder(timeSheet.time_out, timeSheet.require_time_out ?? true, "ចេញពីធ្វើការ");
    }
  } catch (error) {
    console.error("[Reminder] checkAndSendAttendanceReminders error:", error.message);
  } finally {
    isRunning = false;
  }
};
