/** All dose instants for one medication that fall within [rangeStart, rangeEnd]. */
export function doseTimesInRange(med, rangeStart, rangeEnd) {
  if (!med.first_dose_at) return [];

  const first = new Date(med.first_dose_at);
  const periodMs = med.frequency_hours * 3600 * 1000;
  const endLimit = med.end_date ? new Date(`${med.end_date}T23:59:59`) : null;

  let slot;
  if (first >= rangeStart) {
    slot = first;
  } else {
    const periodsElapsed = Math.floor((rangeStart - first) / periodMs);
    slot = new Date(first.getTime() + periodsElapsed * periodMs);
    if (slot < rangeStart) slot = new Date(slot.getTime() + periodMs);
  }

  const results = [];
  while (slot <= rangeEnd) {
    if (endLimit && slot > endLimit) break;
    results.push(new Date(slot));
    slot = new Date(slot.getTime() + periodMs);
  }
  return results;
}

const PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777"];

export function colorForMedication(medicationId) {
  return PALETTE[medicationId % PALETTE.length];
}
