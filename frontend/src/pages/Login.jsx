import { useState } from "react";
import { api } from "../api/client.js";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = mode === "login"
        ? await api.login(username, password)
        : await api.register(username, password, name);
      localStorage.setItem("token", token);
      const user = await api.me();
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page center">
      <h1>💊 Receita Lembrete</h1>
      <p>Fotografe ou envie sua receita e crie lembretes automáticos.</p>

      <a className="button" href={api.loginUrl()}>Entrar com Google</a>
      <p className="hint">Cria os lembretes como eventos no seu Google Calendar.</p>

      <div className="divider">ou</div>

      <form className="card" onSubmit={handleSubmit}>
        <h3>{mode === "login" ? "Entrar" : "Criar conta"}</h3>
        <p className="hint">
          Sem Google — o próprio app te avisa por notificação no navegador/celular.
        </p>

        {error && <p className="error">{error}</p>}

        <label>
          Usuário
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
          />
        </label>

        {mode === "register" && (
          <label>
            Nome (opcional)
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}

        <label>
          Senha
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="eye-button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </label>

        <button className="button" type="submit" disabled={busy}>
          {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <button
          type="button"
          className="link-button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
