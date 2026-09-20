const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Erro ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  loginUrl: () => `${API_URL}/auth/google/login`,

  me: () => fetch(`${API_URL}/auth/me`, { headers: authHeaders() }).then(handle),

  register: (username, password, name) =>
    fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name }),
    }).then(handle),

  login: (username, password) =>
    fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then(handle),

  getVapidPublicKey: () =>
    fetch(`${API_URL}/push/vapid-public-key`).then(handle),

  subscribePush: (subscription) =>
    fetch(`${API_URL}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(subscription),
    }).then(handle),

  uploadPrescription: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_URL}/prescriptions/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    }).then(handle);
  },

  getPrescription: (id) =>
    fetch(`${API_URL}/prescriptions/${id}`, { headers: authHeaders() }).then(handle),

  updateMedication: (prescriptionId, medicationId, payload) =>
    fetch(`${API_URL}/prescriptions/${prescriptionId}/medications/${medicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  schedulePrescription: (prescriptionId, firstDoses) =>
    fetch(`${API_URL}/prescriptions/${prescriptionId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ first_doses: firstDoses }),
    }).then(handle),

  listMedications: () =>
    fetch(`${API_URL}/medications`, { headers: authHeaders() }).then(handle),

  takeDose: (medicationId) =>
    fetch(`${API_URL}/medications/${medicationId}/take-dose`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({}),
    }).then(handle),
};
