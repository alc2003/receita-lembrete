import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function Upload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prescription = await api.uploadPrescription(file);
      navigate(`/prescriptions/${prescription.id}/review`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return <div className="page center"><p>Lendo a receita com IA... isso leva alguns segundos.</p></div>;
  }

  return (
    <div className="page center">
      <h2>Nova receita</h2>
      <p>Tire uma foto da receita ou envie um arquivo (imagem ou PDF).</p>

      {error && <p className="error">{error}</p>}

      <label className="button">
        📷 Tirar foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>

      <label className="button secondary">
        📁 Escolher arquivo
        <input
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>
    </div>
  );
}
