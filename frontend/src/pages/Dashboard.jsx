import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { doseTimesInRange } from "../scheduleUtils.js";
import { useTimezone } from "../TimezoneContext.jsx";
import { formatInOffset } from "../timezone.js";

function upcomingDoses(med, count = 3) {
  const now = new Date();
  const farFuture = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  return doseTimesInRange(med, now, farFuture).slice(0, count);
}

export default function Dashboard() {
  const { offset } = useTimezone();
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
                  {doses.map((d, i) => (
                    <li key={i}>{formatInOffset(d.toISOString(), { weekday: true, day: true, hour: true }, offset)}</li>
                  ))}
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
