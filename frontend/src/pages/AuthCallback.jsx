import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

const ERROR_MESSAGES = {
  missing_calendar_scope:
    "O Google não concedeu permissão de acesso ao Calendar. Isso geralmente " +
    "significa que o escopo do Calendar não foi adicionado em \"Acesso a " +
    "dados\" na tela de consentimento OAuth do Google Cloud Console. " +
    "Adicione o escopo, salve, e tente entrar de novo.",
};

export default function AuthCallback({ onLogin }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const errorCode = params.get("error");
    if (errorCode) {
      setError(ERROR_MESSAGES[errorCode] || `Erro ao entrar: ${errorCode}`);
      return;
    }

    const token = params.get("token");
    if (!token) {
      navigate("/");
      return;
    }
    localStorage.setItem("token", token);
    api.me().then((user) => {
      onLogin(user);
      navigate("/");
    });
  }, [params, navigate, onLogin]);

  if (error) {
    return (
      <div className="page center">
        <p className="error">{error}</p>
        <a className="button" href="/">Voltar</a>
      </div>
    );
  }

  return <div className="page">Entrando...</div>;
}
