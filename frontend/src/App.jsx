import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Upload from "./pages/Upload.jsx";
import Review from "./pages/Review.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { api } from "./api/client.js";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

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

  if (user === undefined) return <div className="page">Carregando...</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback onLogin={setUser} />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div>
      <header className="topbar">
        <Link to="/" className="brand">💊 Receita Lembrete</Link>
        <nav>
          <Link to="/upload">Nova receita</Link>
          <span className="user">{user.name || user.email}</span>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/prescriptions/:id/review" element={<Review />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
