export type PayrollStatusKey = "draft" | "generated" | "approved" | "paid";

export function translatePayrollStatus(
  t: (key: string) => string,
  status?: string,
) {
  if (!status) return "-";
  const key = `statusValues.${status}` as const;
  try {
    return t(key);
  } catch {
    return status;
  }
}
