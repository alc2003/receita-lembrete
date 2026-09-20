import { api } from "../api/client.js";

export default function Login() {
  return (
    <div className="page center">
      <h1>💊 Receita Lembrete</h1>
      <p>Fotografe ou envie sua receita e crie lembretes automáticos no Google Calendar.</p>
      <a className="button" href={api.loginUrl()}>Entrar com Google</a>
    </div>
  );
}
