// src/components/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
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

const API = "http://localhost:5000"; // backend origin

// If a URL is relative like "/uploads/xxx.png", prefix the backend origin.
// If it’s already absolute (http/https), return as-is.
function resolveBackendUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${API}${u}`;
  // fallback: treat as uploads path missing leading slash
  return `${API}/uploads/${u}`;
}

const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null); // user id while approving/deleting

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Customer[]>(`${API}/api/admin/customers`);
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
      await axios.patch(`${API}/api/admin/approve/${id}`);
      setRows(prev => prev.map(r => (r._id === id ? { ...r, isApproved: true } : r)));
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
      await axios.delete(`${API}/api/admin/customer/${id}`);
      setRows(prev => prev.filter(r => r._id !== id));
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
                <th className="th">Firm</th>
                <th className="th">Shop</th>
                <th className="th">State</th>
                <th className="th">City</th>
                <th className="th">Zip</th>
                <th className="th">Mobile</th>
                <th className="th">WhatsApp</th>
                <th className="th">Visiting Card</th>
                <th className="th">Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const href = resolveBackendUrl(c.visitingCardUrl);
                return (
                  <tr key={c._id} className="tr">
                    <td className="td">{c.firmName}</td>
                    <td className="td">{c.shopName}</td>
                    <td className="td">{c.state}</td>
                    <td className="td">{c.city}</td>
                    <td className="td">{c.zip}</td>
                    <td className="td">{c.otpMobile}</td>
                    <td className="td">{c.whatsapp}</td>
                    <td className="td">
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
                    <td className="td">
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
                  <td className="td" colSpan={9} style={{ textAlign: "center" }}>
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
