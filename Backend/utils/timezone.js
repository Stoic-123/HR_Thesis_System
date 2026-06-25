/**
 * Timezone utilities for Asia/Phnom_Penh (GMT+7)
 */

/**
 * Returns a new Date object shifted to ICT timezone (+7 hours).
 * Calling getUTCHours(), getUTCMinutes(), getUTCDay() etc. on this returned date
 * will yield the correct local time in Cambodia.
 * 
 * @param {Date|string|number} d 
 * @returns {Date}
 */
export const toICTDate = (d) => {
  if (!d) return new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    return new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  }
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
};

/**
 * Formats a Date object as a local ICT date/time string.
 * Format: "YYYY-MM-DD HH:MM"
 * 
 * @param {Date|string|number} d 
 * @returns {string}
 */
export const formatICTDateTime = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const date = toICTDate(d);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

/**
 * Formats a Date object as a local ICT date string.
 * Format: "YYYY-MM-DD"
 * 
 * @param {Date|string|number} d 
 * @returns {string}
 */
export const formatICTDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const date = toICTDate(d);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/**
 * Formats a Date object as a local ICT time string.
 * Format: "HH:MM"
 * 
 * @param {Date|string|number} d 
 * @returns {string}
 */
export const formatICTTime = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const date = toICTDate(d);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};
