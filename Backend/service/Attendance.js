import prisma from "../lib/prisma.js";

export const clockAttendance = async (
  employee_id,
  time_mode_id,
  status,
  type = "FINGER",
  meta = {}
) => {
  const { is_late = false, is_early = false, work_at = new Date() } = meta || {};
  return await prisma.attendancerecord.create({
    data: {
      employee_id,
      time_mode_id,
      status,
      type,
      work_at,
      is_late,
      is_early,
    },
    include: {
      timemode: true,
    },
  });
};

export const recordOnlineAttendance = async (
  employee_id,
  photo_path,
  remark,
  latitude,
  longitude,
  has_activity
) => {
  return await prisma.onlineattendance.create({
    data: {
      employee_id,
      photo_path,
      remark,
      latitude,
      longitude,
      has_activity,
    },
  });
};
