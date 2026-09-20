import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

const STATUS_LABEL = {
  uploaded: "Aguardando revisão",
  scheduled: "Agendada",
};

function formatDate(iso) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Prescriptions() {
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
            Enviada em {formatDate(p.created_at)} — <span className={`status-badge status-${p.status}`}>{STATUS_LABEL[p.status] || p.status}</span>
          </p>

          {p.medications.length > 0 ? (
            <ul className="med-summary-list">
              {p.medications.map((m) => (
                <li key={m.id}>{m.name}{m.dosage_text ? ` — ${m.dosage_text}` : ""}</li>
              ))}
            </ul>
          ) : (
            <p className="hint">Nenhum medicamento identificado.</p>
          )}

          {p.status === "uploaded" && (
            <Link className="button secondary" to={`/prescriptions/${p.id}/review`}>Continuar revisão</Link>
          )}
        </div>
      ))}
    </div>
  );
}
