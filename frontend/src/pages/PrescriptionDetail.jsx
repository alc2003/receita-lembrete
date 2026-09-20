import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";

const STATUS_LABEL = {
  uploaded: "Aguardando revisão",
  scheduled: "Agendada",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, value }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? "—"}</span>
    </div>
  );
}

export default function PrescriptionDetail() {
  const { id } = useParams();
  const [prescription, setPrescription] = useState(null);

  useEffect(() => {
    api.getPrescription(id).then(setPrescription);
  }, [id]);

  if (!prescription) return <div className="page">Carregando...</div>;

  return (
    <div className="page">
      <h2>{prescription.original_filename || `Receita #${prescription.id}`}</h2>
      <p className="hint">
        Enviada em {formatDateTime(prescription.created_at)} —{" "}
        <span className={`status-badge status-${prescription.status}`}>
          {STATUS_LABEL[prescription.status] || prescription.status}
        </span>
      </p>

      {prescription.medications.map((med) => (
        <div className="card" key={med.id}>
          <h3>{med.name}</h3>
          <Field label="Dose" value={med.dosage_text} />
          <div className="row">
            <Field label="A cada quantas horas" value={`${med.frequency_hours}h`} />
            <Field label="Vezes ao dia" value={med.times_per_day} />
          </div>
          <div className="row">
            <Field label="Duração" value={med.duration_days ? `${med.duration_days} dias` : "Contínuo / depende do estoque"} />
            <Field label="Quantidade na caixa" value={med.total_quantity} />
          </div>
          <div className="row">
            <Field label="Restam" value={med.quantity_remaining} />
            <Field label="Uso contínuo" value={med.is_continuous ? "Sim" : "Não"} />
          </div>
          <Field label="Início da primeira dose" value={formatDateTime(med.first_dose_at)} />
          <Field label="Até quando" value={med.end_date || "Sem data definida"} />
        </div>
      ))}

      <Link className="button secondary" to="/prescriptions">← Voltar para minhas receitas</Link>
    </div>
  );
}
