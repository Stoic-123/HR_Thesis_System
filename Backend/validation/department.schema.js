import { z } from "zod";

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Department name is required"),
    manager_id: z.string().or(z.number()).transform((val) => Number(val)).optional().nullable(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({
    department_id: z.string().or(z.number()).transform((val) => Number(val)),
  }),
  body: z.object({
    name: z.string().min(1, "Department name is required").optional(),
    manager_id: z.string().or(z.number()).transform((val) => Number(val)).optional().nullable(),
  }),
});
