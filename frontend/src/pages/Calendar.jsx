import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { doseTimesInRange, colorForMedication } from "../scheduleUtils.js";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGridDays(monthStart) {
  const firstCell = new Date(monthStart);
  firstCell.setDate(firstCell.getDate() - firstCell.getDay()); // back up to the Sunday on/before day 1

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(firstCell);
    d.setDate(firstCell.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarPage() {
  const [medications, setMedications] = useState(null);
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());

  useEffect(() => {
    api.listMedications().then(setMedications);
  }, []);

  const days = useMemo(() => monthGridDays(monthStart), [monthStart]);

  // dose occurrences per day, for the whole visible grid (may spill into
  // the previous/next month at the edges)
  const dosesByDay = useMemo(() => {
    if (!medications) return new Map();
    const rangeStart = days[0];
    const rangeEnd = new Date(days[days.length - 1]);
    rangeEnd.setHours(23, 59, 59, 999);

    const map = new Map();
    for (const med of medications) {
      for (const time of doseTimesInRange(med, rangeStart, rangeEnd)) {
        const key = time.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ time, med });
      }
    }
    for (const entries of map.values()) entries.sort((a, b) => a.time - b.time);
    return map;
  }, [medications, days]);

  if (medications === null) return <p>Carregando...</p>;

  const selectedEntries = dosesByDay.get(selectedDay.toDateString()) || [];
  const today = new Date();

  return (
    <div>
      <div className="calendar-header">
        <button className="icon-button" onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}>‹</button>
        <h2>{capitalizeFirst(monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }))}</h2>
        <button className="icon-button" onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}>›</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w, i) => <div key={i} className="calendar-weekday">{w}</div>)}
        {days.map((day, i) => {
          const entries = dosesByDay.get(day.toDateString()) || [];
          const inMonth = day.getMonth() === monthStart.getMonth();
          const isSelected = sameDay(day, selectedDay);
          const isToday = sameDay(day, today);
          return (
            <button
              key={i}
              className={`calendar-day ${inMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
              onClick={() => setSelectedDay(day)}
            >
              <span className="day-number">{day.getDate()}</span>
              {entries.length > 0 && (
                <span className="dose-dots">
                  {entries.slice(0, 4).map((e, j) => (
                    <span key={j} className="dose-dot" style={{ background: colorForMedication(e.med.id) }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="card">
        <h3>{capitalizeFirst(selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }))}</h3>
        {selectedEntries.length === 0 ? (
          <p className="hint">Nenhuma dose nesse dia.</p>
        ) : (
          <ul className="day-detail-list">
            {selectedEntries.map((e, i) => (
              <li key={i}>
                <span className="dose-dot" style={{ background: colorForMedication(e.med.id) }} />
                <strong>{e.time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
                {" — "}{e.med.name} {e.med.dosage_text ? `(${e.med.dosage_text})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
