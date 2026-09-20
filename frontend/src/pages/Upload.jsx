import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function Upload() {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setBusyLabel("Lendo a receita com IA... isso leva alguns segundos.");
    setError(null);
    try {
      const prescription = await api.uploadPrescription(file);
      navigate(`/prescriptions/${prescription.id}/review`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleManual() {
    setBusy(true);
    setBusyLabel("Preparando...");
    setError(null);
    try {
      const prescription = await api.createManualPrescription();
      navigate(`/prescriptions/${prescription.id}/review`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="page center">
        <div className="spinner" />
        <p className="hint">{busyLabel}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-heading">
        <h2>Nova receita</h2>
        <p className="hint">Escolha como quer cadastrar os medicamentos.</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="option-list">
        <label className="option-card">
          <span className="option-icon">📷</span>
          <span className="option-text">
            <strong>Tirar foto</strong>
            <span className="hint">Usa a câmera do celular e lê os dados automaticamente</span>
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </label>

        <label className="option-card">
          <span className="option-icon">📁</span>
          <span className="option-text">
            <strong>Escolher arquivo</strong>
            <span className="hint">Imagem ou PDF já salvo no aparelho</span>
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </label>

        <button className="option-card" onClick={handleManual}>
          <span className="option-icon">✍️</span>
          <span className="option-text">
            <strong>Preencher manualmente</strong>
            <span className="hint">Sem foto ou arquivo — você digita os dados do remédio</span>
          </span>
        </button>
      </div>
    </div>
  );
}
