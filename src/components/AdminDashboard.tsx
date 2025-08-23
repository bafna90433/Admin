// src/components/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import api, { MEDIA_URL } from "../utils/api"; // ✅ central axios + MEDIA_URL
import "../styles/AdminDashboard.css";

type Customer = {
  _id: string;
  firmName: string;
  shopName: string;
  state: string;
  city: string;
  zip: string;
  otpMobile: string;
  whatsapp: string;
  visitingCardUrl?: string;
  isApproved: boolean | null;
  createdAt?: string;
};

// Resolve backend file URL using MEDIA_URL
function resolveBackendUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${MEDIA_URL}${u}`;
  return `${MEDIA_URL}/uploads/${u}`;
}

const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Customer[]>("/admin/customers"); // ✅ no localhost
      setRows(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const approveUser = async (id: string) => {
    try {
      setActing(id);
      await api.patch(`/admin/approve/${id}`); // ✅ no localhost
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isApproved: true } : r))
      );
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Approval failed");
    } finally {
      setActing(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      setActing(id);
      await api.delete(`/admin/customer/${id}`); // ✅ no localhost
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Delete failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="container">
      <h1 className="heading">Registered Customers</h1>

      {loading && <div className="orders-loader">Loading…</div>}
      {err && <div className="orders-error">{err}</div>}

      {!loading && !err && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr className="tr">
                <th>Firm</th>
                <th>Shop</th>
                <th>State</th>
                <th>City</th>
                <th>Zip</th>
                <th>Mobile</th>
                <th>WhatsApp</th>
                <th>Visiting Card</th>
                <th>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const href = resolveBackendUrl(c.visitingCardUrl);
                return (
                  <tr key={c._id} className="tr">
                    <td>{c.firmName}</td>
                    <td>{c.shopName}</td>
                    <td>{c.state}</td>
                    <td>{c.city}</td>
                    <td>{c.zip}</td>
                    <td>{c.otpMobile}</td>
                    <td>{c.whatsapp}</td>
                    <td>
                      {href ? (
                        <a
                          className="image-button"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {c.isApproved === true ? (
                        <span className="badge approved">Approved</span>
                      ) : c.isApproved === false ? (
                        <span className="badge rejected">Rejected</span>
                      ) : (
                        <div className="action-group">
                          <span className="badge pending">Pending</span>
                          <button
                            className="approve-button"
                            disabled={acting === c._id}
                            onClick={() => approveUser(c._id)}
                          >
                            {acting === c._id ? "Approving..." : "Approve"}
                          </button>
                          <button
                            className="delete-button"
                            disabled={acting === c._id}
                            onClick={() => deleteUser(c._id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr className="tr">
                  <td colSpan={9} style={{ textAlign: "center" }}>
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
