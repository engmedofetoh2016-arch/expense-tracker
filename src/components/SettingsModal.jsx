import { useRef, useState } from "react";
import "./SettingsModal.css";

export default function SettingsModal({ open, onClose, settings, currencies, onSave, t, busy, error }) {
  const firstField = useRef(null);
  const [baseCurrency, setBaseCurrency] = useState(settings?.baseCurrency || "USD");

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSave({ baseCurrency });
  };

  return (
    <div className="category-overlay" onClick={onClose} role="presentation">
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="category-dialog-head">
          <h2 id="settings-dialog-title">{t.settingsTitle}</h2>
          <button type="button" className="category-close" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <p className="category-hint">{t.settingsHint}</p>

        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            <span>{t.baseCurrency}</span>
            <select
              ref={firstField}
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
            >
              {currencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="category-add-btn" disabled={busy}>
            {t.saveSettings}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </div>
    </div>
  );
}
