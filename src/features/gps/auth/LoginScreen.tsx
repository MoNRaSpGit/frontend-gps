import { useState } from "react";
import { login } from "../gps.client";
import type { GpsSession } from "../gps.types";

export function LoginScreen({ onLogin }: { onLogin: (session: GpsSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    login(username, password)
      .then(onLogin)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo ingresar."))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <main className="gps-shell gps-shell--center">
      <form className="gps-login-card" onSubmit={handleSubmit}>
        <h1>GPS</h1>
        <p className="gps-muted">Rutas óptimas de entrega.</p>
        <label className="gps-field">
          <span>Usuario</span>
          <input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="gps-field">
          <span>Contraseña</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="gps-error">{error}</p>}
        <button type="submit" className="gps-button" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
