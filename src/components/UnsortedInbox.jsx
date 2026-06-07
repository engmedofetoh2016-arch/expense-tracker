import "./UnsortedInbox.css";

export default function UnsortedInbox({
  receipts,
  t,
  formatCurrency,
  categoryLabels,
  onReview,
  onDelete,
  busyId,
}) {
  if (receipts.length === 0) {
    return (
      <section className="unsorted-inbox">
        <div className="unsorted-head">
          <h2>{t.unsortedTitle}</h2>
          <p className="unsorted-sub">{t.unsortedSubtitle}</p>
        </div>
        <p className="empty-state">{t.unsortedEmpty}</p>
      </section>
    );
  }

  return (
    <section className="unsorted-inbox">
      <div className="unsorted-head">
        <h2>{t.unsortedTitle}</h2>
        <p className="unsorted-sub">{t.unsortedSubtitle}</p>
        <span className="unsorted-count">{receipts.length}</span>
      </div>
      <ul className="unsorted-list">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="unsorted-card">
            <img
              src={receipt.imageUrl}
              alt={receipt.originalName}
              className="unsorted-thumb"
              loading="lazy"
            />
            <div className="unsorted-meta">
              <strong>{receipt.description || receipt.originalName}</strong>
              <span>
                {receipt.amount != null ? formatCurrency(receipt.amount) : t.amountPending}
                {receipt.date ? ` · ${receipt.date}` : ""}
              </span>
              {receipt.category ? (
                <span className="unsorted-category">{categoryLabels[receipt.category] ?? receipt.category}</span>
              ) : null}
            </div>
            <div className="unsorted-actions">
              <button
                type="button"
                className="unsorted-review-btn"
                disabled={busyId === receipt.id}
                onClick={() => onReview(receipt)}
              >
                {t.reviewReceipt}
              </button>
              <button
                type="button"
                className="unsorted-delete-btn"
                disabled={busyId === receipt.id}
                onClick={() => onDelete(receipt.id)}
              >
                {t.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
