// src/components/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
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

const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  // --- Helpers for image/URL handling ---
  const mediaBase = useMemo(() => {
    const apiBase = (import.meta as any).env?.VITE_API_URL || "";
    const fromApi = apiBase ? apiBase.replace(/\/api\/?$/, "") : "";
    return (
      (import.meta as any).env?.VITE_MEDIA_URL ||
      (import.meta as any).env?.VITE_IMAGE_BASE_URL ||
      fromApi ||
      ""
    ).replace(/\/+$/, "");
  }, []);

  const resolveUrl = (u?: string) => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    if (!mediaBase) return u;
    return `${mediaBase}/${u.replace(/^\//, "")}`;
  };

  const toCloudThumb = (url?: string, w = 120, h = 80) => {
    if (!url) return undefined;
    if (!/res\.cloudinary\.com/i.test(url)) return url;
    return url.replace(
      "/upload/",
      `/upload/c_fill,w_${w},h_${h},q_auto,f_auto/`
    );
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Customer[]>("/admin/customers");
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
      await api.patch(`/admin/approve/${id}`);
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
      await api.delete(`/admin/customer/${id}`);
      setRows((prev) => prev.filter((r) => r._id !== id));
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || "Delete failed");
    } finally {
      setActing(null);
    }
  };

  // ---- Preview modal state ----
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // --- WhatsApp redirect helper ---
  const openWhatsApp = (phone: string) => {
    const clean = phone.startsWith("+") ? phone : `+91${phone}`;
    const message = encodeURIComponent("Hello! ✅ Your account is approved.");
    window.open(`https://wa.me/${clean}?text=${message}`, "_blank");
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
                const full = resolveUrl(c.visitingCardUrl);
                const thumb = toCloudThumb(full, 120, 80);
                return (
                  <tr key={c._id} className="tr">
                    <td>{c.firmName}</td>
                    <td>{c.shopName}</td>
                    <td>{c.state}</td>
                    <td>{c.city}</td>
                    <td>{c.zip}</td>
                    <td>{c.otpMobile}</td>
                    <td>
                      {c.whatsapp ? (
                        <>
                          <span>{c.whatsapp}</span>
                          <button
                            className="whatsapp-row-btn"
                            onClick={() => openWhatsApp(c.whatsapp)}
                          >
                            WhatsApp
                          </button>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {full ? (
                        <div className="vc-cell">
                          <img
                            className="vc-thumb"
                            src={thumb}
                            alt="Visiting card"
                            onClick={() => setPreviewUrl(full)}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "/placeholder-product.png";
                            }}
                          />
                          <a
                            className="image-button"
                            href={full}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                        </div>
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

      {/* Lightbox Preview */}
      {previewUrl && (
        <div
          className="vc-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="vc-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="vc-modal-close"
              onClick={() => setPreviewUrl(null)}
              aria-label="Close"
            >
              ×
            </button>
            <img
              className="vc-modal-image"
              src={previewUrl}
              alt="Visiting card"
            />
            <div className="vc-modal-actions">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Open original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
