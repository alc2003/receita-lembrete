import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

function upcomingDoses(med, count = 3) {
  if (!med.first_dose_at) return [];

  const first = new Date(med.first_dose_at);
  const periodMs = med.frequency_hours * 3600 * 1000;
  const endLimit = med.end_date ? new Date(`${med.end_date}T23:59:59`) : null;
  const now = new Date();

  const elapsed = now - first;
  let slot = elapsed < 0 ? first : new Date(first.getTime() + Math.floor(elapsed / periodMs) * periodMs);
  if (slot < now) slot = new Date(slot.getTime() + periodMs);

  const slots = [];
  while (slots.length < count) {
    if (endLimit && slot > endLimit) break;
    slots.push(slot);
    slot = new Date(slot.getTime() + periodMs);
  }
  return slots;
}

function formatDose(date) {
  return date.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [medications, setMedications] = useState(null);

  function reload() {
    api.listMedications().then(setMedications);
  }

  useEffect(reload, []);

  async function handleDelete(med) {
    if (!window.confirm(`Excluir "${med.name}"? Isso cancela os lembretes (Calendar e/ou notificações).`)) return;
    await api.deleteMedication(med.id);
    reload();
  }

  if (medications === null) return <p>Carregando...</p>;

  if (medications.length === 0) {
    return (
      <div className="center">
        <p>Nenhum medicamento agendado ainda.</p>
        <Link className="button" to="/upload">Enviar receita</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Meus medicamentos</h2>
      {medications.map((med) => {
        const doses = upcomingDoses(med);
        return (
          <div className="card" key={med.id}>
            <div className="card-header">
              <h3>{med.name}</h3>
              <button className="icon-button" title="Excluir" onClick={() => handleDelete(med)}>🗑️</button>
            </div>
            <p>{med.dosage_text} — a cada {med.frequency_hours}h ({med.times_per_day}x ao dia)</p>
            {med.end_date && <p>Até: {med.end_date}</p>}
            {med.quantity_remaining != null && (
              <p className={med.quantity_remaining <= med.times_per_day * 4 ? "low-stock" : ""}>
                Restam {med.quantity_remaining} unidade(s)
              </p>
            )}

            {doses.length > 0 ? (
              <div className="agenda">
                <strong>Próximas doses:</strong>
                <ul>
                  {doses.map((d, i) => <li key={i}>{formatDose(d)}</li>)}
                </ul>
              </div>
            ) : (
              <p className="hint">Tratamento encerrado.</p>
            )}

            <button
              className="button secondary"
              onClick={() => api.takeDose(med.id).then(reload)}
            >
              ✅ Marquei que tomei agora
            </button>
          </div>
        );
      })}
    </div>
  );
}
