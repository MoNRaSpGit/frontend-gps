import { useState } from "react";
import { login, loginByPassword } from "../gps.client";
import type { GpsSession } from "../gps.types";

// Pedido explicito (14/11/2026): nada de elegir "soy Martín/Ana/Pedro" --
// solo se tipea la contraseña, y el backend identifica quién es segun cual
// de las 3 coincide (ver loginByPassword). El admin es la unica cuenta que
// sigue entrando con usuario + contraseña, detras del link de abajo.
export function LoginScreen({ onLogin }: { onLogin: (session: GpsSession) => void }) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    const request = isAdminMode ? login(username, password) : loginByPassword(password);
    request
      .then(onLogin)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo ingresar."))
      .finally(() => setIsSubmitting(false));
  }

  function toggleAdminMode() {
    setIsAdminMode((current) => !current);
    setUsername("");
    setPassword("");
    setError("");
  }

  return (
    <main className="gps-shell gps-shell--center">
      <form className="gps-login-card" onSubmit={handleSubmit}>
        <h1>GPS</h1>
        <p className="gps-muted">Rutas óptimas de entrega.</p>

        {isAdminMode && (
          <label className="gps-field">
            <span>Usuario</span>
            <input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
        )}

        <label className="gps-field">
          <span>Contraseña</span>
          <input
            type="password"
            autoFocus={!isAdminMode}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <p className="gps-error">{error}</p>}
        <button type="submit" className="gps-button" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>

        <button type="button" className="gps-login-manual-link" onClick={toggleAdminMode}>
          {isAdminMode ? "Volver" : "Ingresar como admin"}
        </button>
      </form>
    </main>
  );
}
