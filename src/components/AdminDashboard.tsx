// src/components/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import "../styles/AdminDashboard.css";
import {
  FiSearch, FiX, FiMessageSquare, FiEye, FiCheck,
  FiTrash2, FiUser, FiClock, FiCheckCircle, FiXCircle
} from "react-icons/fi";

type Customer = {
  _id: string;
  shopName: string;
  otpMobile: string;
  whatsapp: string;
  visitingCardUrl?: string;
  isApproved: boolean | null;
  createdAt?: string;
};

const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [filteredRows, setFilteredRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Media URL helpers
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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Customer[]>("/admin/customers");
      setRows(Array.isArray(data) ? data : []);
      setFilteredRows(Array.isArray(data) ? data : []);
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

  // Filter customers
  useEffect(() => {
    let result = rows;

    if (statusFilter !== "all") {
      result = result.filter((customer) => {
        if (statusFilter === "pending") return customer.isApproved === null;
        if (statusFilter === "approved") return customer.isApproved === true;
        if (statusFilter === "rejected") return customer.isApproved === false;
        return true;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (customer) =>
          customer.shopName.toLowerCase().includes(term) ||
          customer.otpMobile.includes(term) ||
          customer.whatsapp.includes(term)
      );
    }

    setFilteredRows(result);
  }, [rows, searchTerm, statusFilter]);

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

  const openWhatsApp = (phone: string) => {
    const clean = phone.startsWith("+") ? phone : `+91${phone}`;
    const message = encodeURIComponent(
      "Welcome to BafnaToys! ✅ Your account is approved. Prices are now visible.\nLogin here: https://bafnatoys.com/login"
    );
    window.open(`https://wa.me/${clean}?text=${message}`, "_blank");
  };

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1 className="heading">Registered Customers</h1>
        <p className="subheading">Manage customer approvals and accounts</p>
      </div>

      {/* 🔍 Search Box */}
      <div className="search-container">
        <div className={`search-box ${isSearchFocused ? "focused" : ""}`}>
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm("")}>
              <FiX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-container">
        <div className="stats-card total">
          <div className="stats-icon">
            <FiUser size={24} />
          </div>
          <div className="stats-content">
            <div className="stats-number">{rows.length}</div>
            <div className="stats-label">Total</div>
          </div>
        </div>
        <div className="stats-card pending">
          <div className="stats-icon">
            <FiClock size={24} />
          </div>
          <div className="stats-content">
            <div className="stats-number">
              {rows.filter((r) => r.isApproved === null).length}
            </div>
            <div className="stats-label">Pending</div>
          </div>
        </div>
        <div className="stats-card approved">
          <div className="stats-icon">
            <FiCheckCircle size={24} />
          </div>
          <div className="stats-content">
            <div className="stats-number">
              {rows.filter((r) => r.isApproved === true).length}
            </div>
            <div className="stats-label">Approved</div>
          </div>
        </div>
        <div className="stats-card rejected">
          <div className="stats-icon">
            <FiXCircle size={24} />
          </div>
          <div className="stats-content">
            <div className="stats-number">
              {rows.filter((r) => r.isApproved === false).length}
            </div>
            <div className="stats-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["all", "pending", "approved", "rejected"].map((status) => (
          <button
            key={status}
            className={`filter-tab ${statusFilter === status ? "active" : ""}`}
            onClick={() => setStatusFilter(status as any)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loader-container">
          <div className="loader"></div>Loading customers...
        </div>
      )}
      {err && <div className="error-message">{err}</div>}

      {!loading && !err && (
        <div className="customers-list">
          {filteredRows.map((customer) => {
            const full = resolveUrl(customer.visitingCardUrl);
            return (
              <div key={customer._id} className="customer-card">
                <div className="card-header">
                  <h3 className="shop-name">{customer.shopName}</h3>
                </div>

                <div className="card-content">
                  <div className="info-row">
                    <span className="info-label">Mobile:</span>
                    <span className="info-value">{customer.otpMobile}</span>
                  </div>
                  {customer.whatsapp && (
                    <div className="info-row">
                      <span className="info-label">WhatsApp:</span>
                      <span className="info-value">{customer.whatsapp}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span
                      className={`status-badge ${
                        customer.isApproved === true
                          ? "approved"
                          : customer.isApproved === false
                          ? "rejected"
                          : "pending"
                      }`}
                    >
                      {customer.isApproved === true
                        ? "Approved"
                        : customer.isApproved === false
                        ? "Rejected"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  {full && (
                    <button
                      className="action-btn view-card-btn"
                      onClick={() => setPreviewUrl(full)}
                    >
                      <FiEye size={16} /> View Card
                    </button>
                  )}
                  {customer.whatsapp && (
                    <button
                      className="action-btn whatsapp-btn"
                      onClick={() => openWhatsApp(customer.whatsapp)}
                    >
                      <FiMessageSquare size={16} /> WhatsApp
                    </button>
                  )}
                  {customer.isApproved !== true && (
                    <button
                      className="action-btn approve-btn"
                      disabled={acting === customer._id}
                      onClick={() => approveUser(customer._id)}
                    >
                      <FiCheck size={16} /> Approve
                    </button>
                  )}
                  <button
                    className="action-btn delete-btn"
                    disabled={acting === customer._id}
                    onClick={() => deleteUser(customer._id)}
                  >
                    <FiTrash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div className="no-results">
              {searchTerm || statusFilter !== "all"
                ? "No customers match your search criteria"
                : "No customers found"}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="preview-modal" onClick={() => setPreviewUrl(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewUrl(null)}>
              <FiX size={24} />
            </button>
            <img
              className="preview-image"
              src={previewUrl}
              alt="Visiting card"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/placeholder-product.png";
              }}
            />
            <div className="preview-actions">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-link"
              >
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
