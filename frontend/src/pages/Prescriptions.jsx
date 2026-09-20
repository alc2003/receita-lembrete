import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useTimezone } from "../TimezoneContext.jsx";
import { formatInOffset } from "../timezone.js";

const STATUS_LABEL = {
  uploaded: "Aguardando revisão",
  scheduled: "Agendada",
};

export default function Prescriptions() {
  const { offset } = useTimezone();
  const [prescriptions, setPrescriptions] = useState(null);

  function reload() {
    api.listPrescriptions().then(setPrescriptions);
  }

  useEffect(reload, []);

  async function handleDelete(prescription) {
    if (!window.confirm(`Excluir a receita "${prescription.original_filename || prescription.id}"? Isso cancela todos os lembretes dela.`)) return;
    await api.deletePrescription(prescription.id);
    reload();
  }

  if (prescriptions === null) return <p>Carregando...</p>;

  if (prescriptions.length === 0) {
    return (
      <div className="center">
        <p>Você ainda não enviou nenhuma receita.</p>
        <Link className="button" to="/upload">Enviar receita</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Minhas receitas</h2>
      {prescriptions.map((p) => (
        <div className="card" key={p.id}>
          <div className="card-header">
            <h3>{p.original_filename || `Receita #${p.id}`}</h3>
            <button className="icon-button" title="Excluir" onClick={() => handleDelete(p)}>🗑️</button>
          </div>
          <p className="hint">
            Enviada em {formatInOffset(p.created_at, { day: true, year: true, hour: true }, offset)} — <span className={`status-badge status-${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
          </p>

          {p.medications.length > 0 ? (
            <ul className="med-summary-list">
              {p.medications.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong>{m.dosage_text ? ` — ${m.dosage_text}` : ""}
                  <br />
                  <span className="hint">
                    {m.first_dose_at ? `Iniciado em ${formatInOffset(m.first_dose_at, { day: true, year: true, hour: true }, offset)}` : "Ainda não iniciado"}
                    {" · "}a cada {m.frequency_hours}h ({m.times_per_day}x ao dia)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Nenhum medicamento identificado.</p>
          )}

          <div className="row">
            <Link className="button secondary" to={`/prescriptions/${p.id}`}>Ver detalhes</Link>
            {p.status === "uploaded" && (
              <Link className="button secondary" to={`/prescriptions/${p.id}/review`}>Continuar revisão</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
