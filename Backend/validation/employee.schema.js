import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    age: z.string().or(z.number()).transform((val) => Number(val)).refine((n) => n > 0, "Age must be positive"),
    gender: z.enum(["male", "female", "other"]),
    phone_number1: z.string().min(9, "Phone number 1 must be at least 9 digits"),
    phone_number2: z.string().optional().nullable(),
    email: z.string().email("Invalid email format"),
    address: z.string().min(1, "Address is required"),
    position_id: z.string().or(z.number()).transform((val) => Number(val)),
    department_id: z.string().or(z.number()).transform((val) => Number(val)),
    role_id: z.string().or(z.number()).transform((val) => Number(val)),
    telegram_username: z.string().optional().nullable(),
    joined_at: z.string().min(1, "Joined date is required"),
    is_active: z.string().optional().default("active"),
    base_salary: z
      .string()
      .or(z.number())
      .optional()
      .transform((val) => (val === undefined || val === "" ? undefined : Number(val))),
  }),
});
