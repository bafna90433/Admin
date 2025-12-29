// src/components/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import api from "../utils/api";
import "../styles/AdminDashboard.css";
import {
  FiSearch,
  FiX,
  FiMessageSquare,
  FiEye,
  FiCheck,
  FiTrash2,
  FiUser,
  FiClock,
  FiCheckCircle,
  FiDownload,
  FiAlertCircle,
  FiPhone,
  FiKey,
} from "react-icons/fi";

// 🧾 Customer Type
type Customer = {
  _id: string;
  shopName: string;
  address: string; // ✅ Address field
  otpMobile: string;
  whatsapp: string;
  visitingCardUrl?: string;
  isApproved: boolean | null;
  createdAt: string;
};

// 🧩 Main Component
const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [filteredRows, setFilteredRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved"
  >("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Delete confirmation modal
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null
  );
  const [deletePassword, setDeletePassword] = useState("");

  // ✅ Stats cards
  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.isApproved !== true).length,
      approved: rows.filter((r) => r.isApproved === true).length,
    }),
    [rows]
  );

  const mediaBase = useMemo(() => {
    const apiBase = (import.meta as any).env?.VITE_API_URL || "";
    const fromApi = apiBase ? apiBase.replace(/\/api\/?$/, "") : "";
    return (
      ((import.meta as any).env?.VITE_MEDIA_URL || fromApi || "").replace(
        /\/+$/,
        ""
      )
    );
  }, []);

  const resolveUrl = (u?: string) => {
    if (!u) return undefined;
    if (/^https?:\/\//i.test(u)) return u;
    return `${mediaBase}/${u.replace(/^\//, "")}`;
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Customer[]>("/admin/customers");
      setRows(
        Array.isArray(data)
          ? data.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
          : []
      );
      setErr(null);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to load customers");
      toast.error("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    let result = rows;
    if (statusFilter !== "all") {
      result = result.filter((c) => {
        if (statusFilter === "pending") return c.isApproved !== true;
        if (statusFilter === "approved") return c.isApproved === true;
        return true;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.shopName.toLowerCase().includes(term) ||
          c.otpMobile.includes(term) ||
          c.whatsapp.includes(term) ||
          (c.address && c.address.toLowerCase().includes(term))
      );
    }
    setFilteredRows(result);
  }, [rows, searchTerm, statusFilter]);

  const handleApiAction = async (
    action: Promise<any>,
    successStateUpdate: () => void,
    successMessage: string
  ) => {
    try {
      await action;
      successStateUpdate();
      toast.success(successMessage);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "An error occurred.");
    } finally {
      setActing(null);
    }
  };

  const approveUser = (id: string) => {
    setActing(id);
    handleApiAction(
      api.patch(`/admin/approve/${id}`),
      () =>
        setRows((p) =>
          p.map((r) => (r._id === id ? { ...r, isApproved: true } : r))
        ),
      "Customer approved successfully!"
    );
  };

  const deleteUser = (id: string) => {
    setDeleteCandidateId(id);
  };

  const handleConfirmDelete = () => {
    if (deletePassword !== "bafnatoys") {
      toast.error("Incorrect password. Deletion cancelled.");
      return;
    }

    if (deleteCandidateId) {
      setActing(deleteCandidateId);
      handleApiAction(
        api.delete(`/admin/customer/${deleteCandidateId}`),
        () =>
          setRows((p) =>
            p.filter((r) => r._id !== deleteCandidateId)
          ),
        "Customer deleted successfully."
      );
    }

    setDeleteCandidateId(null);
    setDeletePassword("");
  };

  const handleExport = () => {
    const dataToExport = filteredRows.map((c) => ({
      "Shop Name": c.shopName,
      "Address": c.address || "N/A", 
      Mobile: c.otpMobile,
      WhatsApp: c.whatsapp,
      Status: c.isApproved === true ? "Approved" : "Pending",
      "Registered On": format(new Date(c.createdAt), "dd MMM yyyy, hh:mm a"),
    }));

    if (dataToExport.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Customers");

    const cols = Object.keys(dataToExport[0]).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...dataToExport.map((row) =>
            String(row[key as keyof typeof row]).length
          )
        ) + 2,
    }));

    worksheet["!cols"] = cols;
    writeFile(
      workbook,
      `BafnaToys_Customers_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    );
    toast.success("Data exported successfully!");
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) {
      toast.error("WhatsApp number missing!");
      return;
    }
    const clean = phone.startsWith("+") ? phone : `+91${phone}`;
    const message = encodeURIComponent(
      "Welcome to BafnaToys! ✅\nYour account is approved.\nPrices are now visible.\nLogin here: https://bafnatoys.com/login"
    );
    const waLink = `https://api.whatsapp.com/send?phone=${clean}&text=${message}`;
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="admin-dashboard-container">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="dashboard-header">
        <div>
          <h1 className="heading">Customer Management</h1>
          <p className="subheading">
            View, manage, and export all customer registrations.
          </p>
        </div>
        <button className="action-btn export-btn" onClick={handleExport}>
          <FiDownload size={16} /> Export to Excel
        </button>
      </div>

      <div className="stats-cards-container">
        <div className="stats-card total">
          <div className="stats-icon">
            <FiUser />
          </div>
          <div>
            <div className="stats-number">{stats.total}</div>
            <div className="stats-label">Total Registrations</div>
          </div>
        </div>
        <div className="stats-card pending">
          <div className="stats-icon">
            <FiClock />
          </div>
          <div>
            <div className="stats-number">{stats.pending}</div>
            <div className="stats-label">Pending Approval</div>
          </div>
        </div>
        <div className="stats-card approved">
          <div className="stats-icon">
            <FiCheckCircle />
          </div>
          <div>
            <div className="stats-number">{stats.approved}</div>
            <div className="stats-label">Approved Customers</div>
          </div>
        </div>
      </div>

      {/* 🔍 Search + Filter */}
      <div className="table-toolbar">
        <div className="search-box-wrapper">
          <div className={`search-box ${isSearchFocused ? "focused" : ""}`}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by shop name, phone or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchTerm && (
              <button
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="filter-tabs">
          {["all", "pending", "approved"].map((status) => (
            <button
              key={status}
              className={`filter-tab ${
                statusFilter === status ? "active" : ""
              }`}
              onClick={() => setStatusFilter(status as any)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* 🧾 Customers Table */}
      <div className="table-container">
        {loading && (
          <div className="loader-container">
            <div className="loader"></div>
          </div>
        )}
        {err && (
          <div className="error-message">
            <FiAlertCircle /> {err}
          </div>
        )}
        {!loading && !err && (
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Address</th> {/* ✅ Address Column */}
                  <th>Contact Details</th>
                  <th>Registered On</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((customer) => {
                    const fullUrl = resolveUrl(customer.visitingCardUrl);
                    return (
                      <tr key={customer._id}>
                        <td data-label="Shop Name">
                          <div className="cell-content shop-name-cell">
                            {customer.shopName}
                          </div>
                        </td>

                        {/* ✅ Styled Address Column */}
                        <td data-label="Address">
                          <div className="cell-content" style={{ textAlign: "left", fontSize: "13px", maxWidth: "300px" }}>
                            {customer.address ? (
                                // Splitting by new line and parsing for Bold Headers
                                customer.address.split('\n').map((line, idx) => {
                                    const parts = line.split(':');
                                    // Agar line mein ":" hai (e.g., "State: Maharashtra")
                                    if(parts.length > 1) {
                                        const label = parts[0]; 
                                        const value = parts.slice(1).join(':'); 
                                        return (
                                            <div key={idx} style={{ marginBottom: "2px", lineHeight: "1.4" }}>
                                                <strong style={{ color: "#333", fontWeight: 700 }}>{label}:</strong>
                                                <span style={{ color: "#555", marginLeft: "4px" }}>{value}</span>
                                            </div>
                                        );
                                    }
                                    // Normal line (agar koi hai)
                                    return <div key={idx} style={{ marginBottom: "2px" }}>{line}</div>;
                                })
                            ) : (
                                <span style={{ color: "#999", fontStyle: "italic" }}>N/A</span>
                            )}
                          </div>
                        </td>

                        <td data-label="Contact">
                          <div className="cell-content contact-cell">
                            <div className="contact-info">
                              <FiPhone size={14} /> {customer.otpMobile}
                            </div>
                            {customer.whatsapp && (
                              <div className="contact-info">
                                <FiMessageSquare size={14} />{" "}
                                {customer.whatsapp}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Registered">
                          <div className="cell-content date-cell">
                            {format(new Date(customer.createdAt), "dd MMM, yyyy")}
                          </div>
                        </td>
                        <td data-label="Status">
                          <div className="cell-content">
                            {customer.isApproved === true ? (
                              <span className="status-badge approved">
                                Approved
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Actions">
                          <div className="actions-cell">
                            {fullUrl && (
                              <button
                                className="action-btn-icon"
                                title="View Visiting Card"
                                onClick={() => setPreviewUrl(fullUrl)}
                              >
                                <FiEye size={16} />
                              </button>
                            )}
                            {customer.isApproved !== true ? (
                              <button
                                className="action-btn-sm approve-btn"
                                disabled={acting === customer._id}
                                onClick={() => approveUser(customer._id)}
                              >
                                <FiCheck size={14} /> Approve
                              </button>
                            ) : (
                              customer.whatsapp && (
                                <button
                                  className="action-btn-sm whatsapp-btn"
                                  onClick={() => openWhatsApp(customer.whatsapp)}
                                >
                                  <FiMessageSquare size={14} /> Notify
                                </button>
                              )
                            )}
                            <button
                                className="action-btn-icon delete-btn"
                                title="Delete Customer"
                                disabled={acting === customer._id}
                                onClick={() => deleteUser(customer._id)}
                              >
                                <FiTrash2 size={16} />
                              </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="no-results">
                      No customers match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🪪 Visiting Card Preview */}
      {previewUrl && (
        <div className="preview-modal" onClick={() => setPreviewUrl(null)}>
          <div
            className="preview-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setPreviewUrl(null)}
            >
              <FiX size={24} />
            </button>
            <img
              className="preview-image"
              src={previewUrl}
              alt="Visiting card"
            />
            <div className="preview-actions">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="preview-link"
              >
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 🧨 Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3 className="delete-modal-title">Confirm Deletion</h3>
            <p className="delete-modal-text">
              This action is permanent and cannot be undone. Please enter the
              password to confirm.
            </p>
            <div className="delete-modal-input-wrapper">
              <FiKey className="delete-modal-input-icon" />
              <input
                type="password"
                placeholder="Enter password..."
                className="delete-modal-input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="delete-modal-actions">
              <button
                className="action-btn-sm modal-cancel-btn"
                onClick={() => {
                  setDeleteCandidateId(null);
                  setDeletePassword("");
                }}
              >
                Cancel
              </button>
              <button
                className="action-btn-sm modal-confirm-btn"
                onClick={handleConfirmDelete}
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;