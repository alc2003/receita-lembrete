import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Upload from "./pages/Upload.jsx";
import Review from "./pages/Review.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CalendarPage from "./pages/Calendar.jsx";
import Prescriptions from "./pages/Prescriptions.jsx";
import PrescriptionDetail from "./pages/PrescriptionDetail.jsx";
import { api } from "./api/client.js";
import { enablePushNotifications } from "./push.js";
import { useTimezone } from "./TimezoneContext.jsx";
import { BR_TIMEZONES } from "./timezone.js";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const { offset, setOffset } = useTimezone();

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setUser(null);
      return;
    }
    api.me().then(setUser).catch(() => {
      localStorage.removeItem("token");
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (user && user.auth_provider === "local") {
      enablePushNotifications().catch(() => {
        // best-effort - user may decline the browser permission prompt
      });
    }
  }, [user]);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  if (user === undefined) return <div className="page">Carregando...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback onLogin={setUser} />} />
        <Route path="*" element={<Login onLogin={setUser} />} />
      </Routes>
    );
  }

  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand">💊 Receita Lembrete</Link>
        <nav>
          <Link to="/calendar">📅 Agenda</Link>
          <Link to="/prescriptions">📄 Receitas</Link>
          <Link to="/upload">Nova receita</Link>
          <select
            className="tz-select"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            title="Fuso horário usado para mostrar e agendar os horários"
          >
            {BR_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <span className="user">{user.name || user.username || user.email}</span>
          <button className="link-button" onClick={logout}>Sair</button>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/prescriptions/:id/review" element={<Review />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
