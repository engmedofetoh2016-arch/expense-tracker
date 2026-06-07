import { useEffect, useRef, useState } from "react";
import "./CategoryManager.css";

const COLOR_PRESETS = ["#f97316", "#6366f1", "#eab308", "#0ea5e9", "#ec4899", "#22c55e", "#64748b", "#ef4444"];

export default function CategoryManager({
  open,
  onClose,
  categories,
  onAdd,
  onDelete,
  t,
  busy,
  error,
}) {
  const labelRef = useRef(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    labelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleAdd = async (event) => {
    event.preventDefault();
    if (!label.trim()) return;
    await onAdd({ label: label.trim(), color });
    setLabel("");
    setColor(COLOR_PRESETS[0]);
  };

  return (
    <div className="category-overlay" onClick={onClose} role="presentation">
      <div
        className="category-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="category-dialog-head">
          <h2 id="category-dialog-title">{t.manageCategories}</h2>
          <button type="button" className="category-close" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <p className="category-hint">{t.categoriesHint}</p>

        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.id}>
              <span className="category-dot" style={{ backgroundColor: category.color }} aria-hidden />
              <span className="category-label">{category.label}</span>
              <code className="category-slug">{category.slug}</code>
              <button
                type="button"
                className="category-delete"
                disabled={busy || categories.length <= 1}
                onClick={() => onDelete(category.id)}
              >
                {t.delete}
              </button>
            </li>
          ))}
        </ul>

        <form className="category-add-form" onSubmit={handleAdd}>
          <input
            ref={labelRef}
            type="text"
            value={label}
            placeholder={t.newCategoryPlaceholder}
            maxLength={60}
            onChange={(event) => setLabel(event.target.value)}
          />
          <div className="category-colors" role="group" aria-label={t.pickColor}>
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`category-color ${color === preset ? "active" : ""}`}
                style={{ backgroundColor: preset }}
                aria-label={preset}
                onClick={() => setColor(preset)}
              />
            ))}
          </div>
          <button type="submit" className="category-add-btn" disabled={busy || !label.trim()}>
            {t.addCategory}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </div>
    </div>
  );
}
