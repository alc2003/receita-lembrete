import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useTimezone } from "../TimezoneContext.jsx";
import { localInputToUTCDate, nowAsLocalInput } from "../timezone.js";

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { offset } = useTimezone();
  const [prescription, setPrescription] = useState(null);
  const [firstDoses, setFirstDoses] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getPrescription(id).then((p) => {
      setPrescription(p);
      const defaults = {};
      p.medications.forEach((m) => (defaults[m.id] = nowAsLocalInput(offset)));
      setFirstDoses(defaults);
    });
  }, [id]);

  if (!prescription) return <div className="page">Carregando...</div>;

  const warnings = prescription.raw_extraction?.warnings || [];

  function updateField(medicationId, field, value) {
    setPrescription((p) => ({
      ...p,
      medications: p.medications.map((m) => (m.id === medicationId ? { ...m, [field]: value } : m)),
    }));
  }

  async function saveFieldOnBlur(medicationId, field, value) {
    await api.updateMedication(id, medicationId, { [field]: value });
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      for (const [medId, localDatetime] of Object.entries(firstDoses)) {
        payload[medId] = localInputToUTCDate(localDatetime, offset).toISOString();
      }
      await api.schedulePrescription(id, payload);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h2>Revisar receita</h2>
      <p>Confira os dados extraídos e informe o horário em que tomou (ou vai tomar) a primeira dose de cada medicamento.</p>
      <p className="hint">Fuso horário usado: UTC{offset >= 0 ? "+" : ""}{offset} (pode trocar no menu do topo).</p>

      {warnings.length > 0 && (
        <div className="warning-box">
          <strong>Atenção, confirme estes pontos:</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {prescription.medications.map((med) => (
        <div className="card" key={med.id}>
          <label>
            Medicamento
            <input
              defaultValue={med.name}
              onChange={(e) => updateField(med.id, "name", e.target.value)}
              onBlur={(e) => saveFieldOnBlur(med.id, "name", e.target.value)}
            />
          </label>

          <label>
            Dose
            <input
              defaultValue={med.dosage_text || ""}
              onChange={(e) => updateField(med.id, "dosage_text", e.target.value)}
              onBlur={(e) => saveFieldOnBlur(med.id, "dosage_text", e.target.value)}
            />
          </label>

          <div className="row">
            <label>
              A cada quantas horas
              <input
                type="number"
                min="1"
                defaultValue={med.frequency_hours}
                onBlur={(e) => saveFieldOnBlur(med.id, "frequency_hours", Number(e.target.value))}
              />
            </label>
            <label>
              Vezes ao dia
              <input
                type="number"
                min="1"
                defaultValue={med.times_per_day}
                onBlur={(e) => saveFieldOnBlur(med.id, "times_per_day", Number(e.target.value))}
              />
            </label>
          </div>

          <div className="row">
            <label>
              Duração (dias, vazio = contínuo/depende do estoque)
              <input
                type="number"
                min="1"
                defaultValue={med.duration_days || ""}
                onBlur={(e) =>
                  saveFieldOnBlur(med.id, "duration_days", e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
            <label>
              Quantidade total na caixa
              <input
                type="number"
                min="1"
                defaultValue={med.total_quantity || ""}
                onBlur={(e) =>
                  saveFieldOnBlur(med.id, "total_quantity", e.target.value ? Number(e.target.value) : null)
                }
              />
            </label>
          </div>

          <label>
            <input
              type="checkbox"
              defaultChecked={med.is_continuous}
              onChange={(e) => saveFieldOnBlur(med.id, "is_continuous", e.target.checked)}
            />
            {" "}Uso contínuo (mensal / sem data para parar)
          </label>

          <label>
            Horário da primeira dose
            <input
              type="datetime-local"
              value={firstDoses[med.id] || ""}
              onChange={(e) => setFirstDoses((f) => ({ ...f, [med.id]: e.target.value }))}
            />
          </label>
        </div>
      ))}

      <button className="button" disabled={saving} onClick={handleConfirm}>
        {saving ? "Criando lembretes..." : "Confirmar e agendar lembretes"}
      </button>
    </div>
  );
}
