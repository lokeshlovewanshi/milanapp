import React from "react";
import { Icon } from "./Icons";

export default function DetailCard({
  title,
  subtitle,
  rows = [],
  body = "",
  onEdit,
  emptyHint = "Not shared yet",
}) {
  const filledRows = rows.filter((r) => r.value !== null && r.value !== undefined && String(r.value).trim() !== "");
  const hasBody = Boolean(body && body.trim());
  const isEmpty = filledRows.length === 0 && !hasBody;

  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <div>
          <h3 className="detail-card-title">{title}</h3>
          {subtitle && <p className="detail-card-subtitle">{subtitle}</p>}
        </div>
        {onEdit && (
          <button type="button" className="detail-edit-btn" onClick={onEdit} title={`Edit ${title}`}>
            <Icon name="pencil" size={16} />
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="detail-empty-box">
          <p className="detail-empty-text">{emptyHint}</p>
          {onEdit && (
            <button type="button" className="detail-add-now" onClick={onEdit}>
              Add now +
            </button>
          )}
        </div>
      ) : hasBody ? (
        <div className="detail-body-text">{body}</div>
      ) : (
        <div className="detail-rows-grid">
          {filledRows.map((row, i) => (
            <div key={i} className="detail-row-item">
              <div className="detail-row-icon">
                <Icon name={row.icon || "user"} size={17} color="#6B7280" />
              </div>
              <div className="detail-row-content">
                {row.label && <span className="detail-row-label">{row.label}</span>}
                <span className="detail-row-value">{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
