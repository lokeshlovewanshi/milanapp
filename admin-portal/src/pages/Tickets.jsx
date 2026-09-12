import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const STATUS_TABS = [
  { key: "OPEN", label: "Open" },
  { key: "CLOSED", label: "Closed" },
  { key: "", label: "All" },
];

export default function Tickets() {
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .listTickets(status, page, 20)
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(load, [status, page]);

  return (
    <div>
      <h1>Support Tickets</h1>

      <div className="pager" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: "1.25rem" }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            className={status === t.key ? undefined : "secondary"}
            onClick={() => {
              setStatus(t.key);
              setPage(0);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {!loading && data?.content?.length === 0 && (
        <p className="muted">Nothing here.</p>
      )}

      <div className="ticket-list">
        {data?.content?.map((t) => (
          <Link to={`/tickets/${t.id}`} className="card ticket-row" key={t.id}>
            <div className="ticket-row-main">
              <span className={`badge ${t.status === "OPEN" ? "badge-pending" : "badge-verified"}`}>
                {t.status}
              </span>
              <span className="ticket-subject">{t.subject}</span>
            </div>
            <div className="muted small">
              {t.profileName || "(no name)"} · {t.displayId} · {t.profileEmail}
            </div>
          </Link>
        ))}
      </div>

      {data && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(data.totalPages, 1)}
          </span>
          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
