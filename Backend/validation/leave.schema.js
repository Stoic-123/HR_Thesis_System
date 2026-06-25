import { z } from "zod";

export const createLeaveSchema = z.object({
  body: z.object({
    leave_type_id: z.string().or(z.number()).transform((val) => Number(val)),
    dates: z.string().min(1, "Dates are required"), // We'll send JSON string of dates array
    reason: z.string().min(1, "Reason is required"),
  }),
});
