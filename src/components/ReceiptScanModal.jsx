import { useEffect, useRef } from "react";

export default function ReceiptScanModal({
  open,
  onClose,
  draft,
  onChangeDraft,
  onConfirm,
  loading,
  progress,
  error,
  t,
  categoryKeys,
}) {
  const firstField = useRef(null);
  useEffect(() => {
    if (open) firstField.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdrop}>
      <div className="modal-panel" role="dialog" aria-labelledby="receipt-modal-title" aria-modal="true">
        <div className="modal-head">
          <h2 id="receipt-modal-title">{t.reviewReceipt}</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading} aria-label={t.close}>
            ×
          </button>
        </div>
        <p className="modal-hint">{t.receiptReviewHint}</p>
        {loading ? (
          <div className="ocr-progress">
            <div className="ocr-progress-bar" style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
          </div>
        ) : null}
        {error ? <p className="modal-error">{error}</p> : null}
        <div className="modal-fields">
          <label>
            <span>{t.description}</span>
            <input
              ref={firstField}
              type="text"
              value={draft.description}
              onChange={(e) => onChangeDraft({ ...draft, description: e.target.value })}
              disabled={loading}
            />
          </label>
          <label>
            <span>{t.amount}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(e) => onChangeDraft({ ...draft, amount: e.target.value })}
              disabled={loading}
            />
          </label>
          <label>
            <span>{t.date}</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => onChangeDraft({ ...draft, date: e.target.value })}
              disabled={loading}
            />
          </label>
          <label>
            <span>{t.category}</span>
            <select
              value={draft.category}
              onChange={(e) => onChangeDraft({ ...draft, category: e.target.value })}
              disabled={loading}
            >
              {categoryKeys.map((key) => (
                <option key={key} value={key}>
                  {t.categories[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={loading}>
            {t.cancel}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading}>
            {t.addToLedger}
          </button>
        </div>
      </div>
    </div>
  );
}
