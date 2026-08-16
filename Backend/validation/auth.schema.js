import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "New password must contain at least one letter")
      .regex(/[0-9]/, "New password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "New password must contain at least one symbol"),
    confirm_password: z.string().min(1, "Confirm password is required"),
  }).refine((data) => data.new_password === data.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username is required"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    user_id: z.string().or(z.number()).transform((val) => Number(val)).refine((n) => n > 0, "Valid User ID is required"),
  }),
});
