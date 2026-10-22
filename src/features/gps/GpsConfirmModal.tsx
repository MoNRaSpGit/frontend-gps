// Confirmacion propia de la app (en vez del cartel del navegador). La usa
// "Generar ruta final" cuando todavia faltan repartidores por guardar.
export function GpsConfirmModal({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="gps-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="gps-modal-card gps-confirm-card" role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p className="gps-muted">{message}</p>
        <div className="gps-confirm-actions">
          <button type="button" className="gps-button-secondary" onClick={onCancel} disabled={busy} autoFocus>
            Cancelar
          </button>
          <button type="button" className="gps-button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
