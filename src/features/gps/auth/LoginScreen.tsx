import { useRef, useState } from "react";
import { login } from "../gps.client";
import { GPS_REPARTIDORES } from "../gps.types";
import type { GpsSession } from "../gps.types";

// Los repartidores tienen usuario fijo -- no tiene sentido que lo tipeen
// cada vez. El admin si usa el formulario manual (usuario + contraseña),
// para no andar mostrando su usuario en un boton.
const QUICK_ROLES = GPS_REPARTIDORES;

export function LoginScreen({ onLogin }: { onLogin: (session: GpsSession) => void }) {
  const [quickUsername, setQuickUsername] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const effectiveUsername = quickUsername ?? username;
    setIsSubmitting(true);
    setError("");
    login(effectiveUsername, password)
      .then(onLogin)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo ingresar."))
      .finally(() => setIsSubmitting(false));
  }

  function handlePickRole(roleUsername: string) {
    setQuickUsername(roleUsername);
    setPassword("");
    setError("");
    setTimeout(() => passwordInputRef.current?.focus(), 0);
  }

  function handleBackToManual() {
    setQuickUsername(null);
    setPassword("");
    setError("");
  }

  return (
    <main className="gps-shell gps-shell--center">
      <form className="gps-login-card" onSubmit={handleSubmit}>
        <h1>GPS</h1>
        <p className="gps-muted">Rutas óptimas de entrega.</p>

        {quickUsername === null && (
          <div className="gps-role-buttons">
            {QUICK_ROLES.map((role) => (
              <button key={role.username} type="button" className="gps-role-button" onClick={() => handlePickRole(role.username)}>
                {role.label}
              </button>
            ))}
          </div>
        )}

        {quickUsername !== null ? (
          <>
            <p className="gps-role-selected">
              Ingresando como <strong>{QUICK_ROLES.find((role) => role.username === quickUsername)?.label}</strong>
            </p>
            <label className="gps-field">
              <span>Contraseña</span>
              <input
                ref={passwordInputRef}
                type="password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <label className="gps-field">
              <span>Usuario</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label className="gps-field">
              <span>Contraseña</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          </>
        )}

        {error && <p className="gps-error">{error}</p>}
        <button type="submit" className="gps-button" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>

        {quickUsername !== null && (
          <button type="button" className="gps-login-manual-link" onClick={handleBackToManual}>
            Ingresar con usuario y contraseña
          </button>
        )}
      </form>
    </main>
  );
}
