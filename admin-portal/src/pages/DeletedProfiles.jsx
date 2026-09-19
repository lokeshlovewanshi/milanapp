import { useEffect, useState } from "react";
import { api } from "../api";
import AccountStatus from "../components/AccountStatus";

const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN") : "-";

/** Audit trail for accounts soft-deleted by an admin or member. */
export default function DeletedProfiles() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.deletedProfiles(page, 20).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [page]);

  const rows = data?.content ?? [];
  return (
    <div>
      <h1>Deleted Accounts</h1>
      <p className="muted">Soft-deleted accounts are retained for audit purposes.</p>
      {loading && <p className="muted">Loading deleted accounts...</p>}
      {!loading && rows.length === 0 && <div className="card">No deleted accounts.</div>}
      {!loading && rows.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Account status</th><th>Deleted on</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td>{p.displayId || `GM${String(p.id).padStart(5, "0")}`}</td>
                <td>{p.name || "(No name)"}</td>
                <td>{p.email || "-"}</td>
                <td><AccountStatus profile={p} /></td>
                <td>{formatDate(p.deletedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {data?.totalPages > 1 && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <span>Page {page + 1} of {data.totalPages}</span>
          <button disabled={page + 1 >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
