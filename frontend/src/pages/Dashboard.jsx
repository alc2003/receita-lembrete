import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function Dashboard() {
  const [medications, setMedications] = useState(null);

  function reload() {
    api.listMedications().then(setMedications);
  }

  useEffect(reload, []);

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
      {medications.map((med) => (
        <div className="card" key={med.id}>
          <h3>{med.name}</h3>
          <p>{med.dosage_text} — a cada {med.frequency_hours}h ({med.times_per_day}x ao dia)</p>
          {med.end_date && <p>Até: {med.end_date}</p>}
          {med.quantity_remaining != null && (
            <p className={med.quantity_remaining <= med.times_per_day * 4 ? "low-stock" : ""}>
              Restam {med.quantity_remaining} unidade(s)
            </p>
          )}
          <button
            className="button secondary"
            onClick={() => api.takeDose(med.id).then(reload)}
          >
            ✅ Marquei que tomei agora
          </button>
        </div>
      ))}
    </div>
  );
}
