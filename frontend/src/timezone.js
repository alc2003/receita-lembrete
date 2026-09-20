/** Brazil has no DST since 2019, so a fixed UTC offset per region is exact
 * and much simpler than pulling in full IANA timezone data. This also
 * means the app never has to trust the device's own timezone setting,
 * which can be misconfigured (e.g. defaulting to Brasília even outside
 * that region). */
export const BR_TIMEZONES = [
  { value: -2, label: "Fernando de Noronha (UTC-2)" },
  { value: -3, label: "Brasília, SP, RJ, MG e a maioria dos estados (UTC-3)" },
  { value: -4, label: "MT, MS, RO, AM (parte), RR (UTC-4)" },
  { value: -5, label: "Acre, AM (oeste) (UTC-5)" },
];

const STORAGE_KEY = "utc_offset_hours";
const DEFAULT_OFFSET = -3;

export function getTimezoneOffset() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const value = stored !== null ? Number(stored) : NaN;
  return Number.isFinite(value) ? value : DEFAULT_OFFSET;
}

export function setTimezoneOffset(offsetHours) {
  localStorage.setItem(STORAGE_KEY, String(offsetHours));
}

/** A "YYYY-MM-DDTHH:mm" wall-clock string (as picked in a datetime-local
 * input, meant to represent that time at `offsetHours` from UTC) -> the
 * true UTC Date instant it corresponds to. */
export function localInputToUTCDate(localString, offsetHours = getTimezoneOffset()) {
  const [datePart, timePart] = localString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const asIfUTC = Date.UTC(y, m - 1, d, hh, mm);
  return new Date(asIfUTC - offsetHours * 3600 * 1000);
}

/** The current moment, as a "YYYY-MM-DDTHH:mm" string in the given offset -
 * for defaulting a datetime-local input to "now" in the user's chosen zone. */
export function nowAsLocalInput(offsetHours = getTimezoneOffset()) {
  const shifted = new Date(Date.now() + offsetHours * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** A UTC ISO datetime string from the API -> a Date object whose UTC-*
 * getters read as the wall-clock time in the given offset. Use with
 * formatInOffset / doseTimesInRange, not with plain toLocaleString. */
function shiftToOffset(isoString, offsetHours) {
  return new Date(new Date(isoString).getTime() + offsetHours * 3600 * 1000);
}

const WEEKDAYS_SHORT = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Formats a UTC ISO string as local wall-clock time in the given offset,
 * without relying on the browser's own timezone (Intl's timeZone option
 * only accepts real IANA names, not a raw offset). */
export function formatInOffset(isoString, options = {}, offsetHours = getTimezoneOffset()) {
  const d = shiftToOffset(isoString, offsetHours);
  const parts = [];
  if (options.weekday) parts.push(WEEKDAYS_SHORT[d.getUTCDay()]);
  if (options.day) parts.push(`${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`);
  else if (options.month) parts.push(pad(d.getUTCMonth() + 1));
  if (options.year) parts[parts.length - 1] += `/${d.getUTCFullYear()}`;
  const datePiece = parts.join(", ");
  const timePiece = options.hour ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : "";
  return [datePiece, timePiece].filter(Boolean).join(" ");
}

export function dateKeyInOffset(isoString, offsetHours = getTimezoneOffset()) {
  const d = shiftToOffset(isoString, offsetHours);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
