import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { utils, writeFile } from "xlsx";
import { format } from "date-fns";
import axios from "axios";
import "../styles/AdminDashboard.css";
import {
  FiSearch,
  FiX,
  FiMessageSquare,
  FiTrash2,
  FiUser,
  FiDownload,
  FiAlertCircle,
  FiPhone,
  FiKey,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiMapPin,
  FiHome,
  FiBriefcase,
  FiFileText,
  FiEye // ✅ Preview Icon
} from "react-icons/fi";

// --- CONFIGURATION ---
const API_BASE =
  process.env.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

// ✅ Helper to construct standard URL
const getFileUrl = (filePath?: string) => {
  if (!filePath) return "";
  
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath; // Original Cloudinary link
  }

  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  const cleanPath = filePath.replace(/\\/g, "/"); 
  return `${baseUrl}/${cleanPath.startsWith("/") ? cleanPath.slice(1) : cleanPath}`;
};

// ✅ Helper to construct Download URL (forces Cloudinary to download)
const getDownloadUrl = (filePath?: string) => {
  const url = getFileUrl(filePath);
  if (url.includes("res.cloudinary.com")) {
    // Adds 'fl_attachment' to force the file to download instead of opening in browser
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

// Customer Type 
type Customer = {
  _id: string;
  shopName: string;
  address: string;
  otpMobile: string;
  whatsapp: string;
  gstNumber?: string; 
  gstDocumentUrl?: string; 
  createdAt: string;
};

const extractCity = (address: string): string => {
  if (!address) return "Unknown";
  
  const lines = address.split('\n');
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('city:') || lowerLine.includes('town:') || lowerLine.includes('district:')) {
      const parts = line.split(':');
      if (parts.length > 1) return parts[1].trim();
    }
  }
  
  for (let i = Math.max(0, lines.length - 3); i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(',')) {
      const parts = line.split(',');
      if (parts.length > 1) return parts[0].trim();
    }
  }
  
  const firstLine = lines.find(l => l.trim().length > 0);
  return firstLine ? firstLine.substring(0, 15) + '...' : "Unknown";
};

// Main Component
const AdminDashboard: React.FC = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [filteredRows, setFilteredRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); 
  
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());

  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  // ✅ State for Document Preview Modal
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const toggleAddress = (customerId: string) => {
    setExpandedAddresses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) newSet.delete(customerId);
      else newSet.add(customerId);
      return newSet;
    });
  };

  const stats = useMemo(() => ({ total: rows.length }), [rows]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Customer[]>(`${API_BASE}/admin/customers`);
      setRows(
        Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : []
      );
      setErr(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load customers");
      toast.error("Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    let result = rows;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.shopName.toLowerCase().includes(term) ||
          c.otpMobile.includes(term) ||
          (c.whatsapp && c.whatsapp.includes(term)) ||
          (c.gstNumber && c.gstNumber.toLowerCase().includes(term)) ||
          (c.address && c.address.toLowerCase().includes(term))
      );
    }
    setFilteredRows(result);
    setCurrentPage(1);
  }, [rows, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleConfirmDelete = async () => {
    if (deletePassword !== "bafnatoys") return toast.error("Incorrect password.");
    if (deleteCandidateId) {
      setActing(deleteCandidateId);
      try {
        await axios.delete(`${API_BASE}/admin/customer/${deleteCandidateId}`);
        setRows((p) => p.filter((r) => r._id !== deleteCandidateId));
        toast.success("Customer deleted successfully.");
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "An error occurred.");
      } finally {
        setActing(null);
      }
    }
    setDeleteCandidateId(null);
    setDeletePassword("");
  };

  const handleExport = () => {
    const dataToExport = filteredRows.map((c) => ({
      "Shop Name": c.shopName,
      "GST Number": c.gstNumber || "N/A", 
      "Has GST Document": c.gstDocumentUrl ? "Yes" : "No", 
      "City": extractCity(c.address),
      "Full Address": c.address || "N/A",
      "Mobile": c.otpMobile,
      "WhatsApp": c.whatsapp,
      "Registered On": format(new Date(c.createdAt), "dd MMM yyyy, hh:mm a"),
    }));

    if (dataToExport.length === 0) return toast.error("No data to export.");
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Customers");
    writeFile(workbook, `BafnaToys_Customers_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Data exported successfully!");
  };

  // ✅ FIX: Fixed Double 91 issue in WhatsApp
  const openWhatsApp = (phone: string) => {
    if (!phone) return toast.error("WhatsApp number missing!");
    
    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, "");
    
    // If number starts with 91, strip it out temporarily
    if (digits.startsWith("91") && digits.length > 10) {
      digits = digits.substring(2);
    }
    
    // Take only the last 10 digits to be safe
    if (digits.length > 10) {
      digits = digits.slice(-10);
    }

    // Now cleanly prepend exactly one '91'
    const cleanWhatsApp = `91${digits}`;

    const message = encodeURIComponent("Hello from BafnaToys! 🧸\nHow can we help you today?");
    window.open(`https://api.whatsapp.com/send?phone=${cleanWhatsApp}&text=${message}`, "_blank", "noopener,noreferrer");
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, -1, totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="admin-dashboard-container fullscreen">
      <Toaster position="top-center" reverseOrder={false} />

      {/* ✅ --- PREVIEW MODAL --- */}
      {previewDocUrl && (
        <div className="doc-modal-overlay">
          <div className="doc-modal-content">
            <div className="doc-modal-header">
              <h3 className="doc-modal-title">Document Preview</h3>
              <div className="doc-modal-actions">
                <a 
                  href={getDownloadUrl(previewDocUrl)} 
                  className="action-btn-sm export-btn" 
                  style={{ textDecoration: 'none' }}
                >
                  <FiDownload size={14} /> Download
                </a>
                <button className="action-btn-sm delete-btn" onClick={() => setPreviewDocUrl(null)}>
                  <FiX size={14} /> Close
                </button>
              </div>
            </div>
            <div className="doc-modal-body">
              <iframe 
                src={getFileUrl(previewDocUrl)} 
                title="Document Preview" 
                className="doc-iframe"
              />
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="heading"><FiHome className="heading-icon" /> Customer Management</h1>
          <p className="subheading">View, manage, and export all customer registrations.</p>
        </div>
        <div className="header-right">
          <button className="action-btn export-btn" onClick={handleExport}><FiDownload size={16} /> Export to Excel</button>
          <div className="profile-section">
            <div className="profile-icon"><FiUser size={22} /></div>
            <div className="profile-info">
              <span className="profile-name">Admin User</span>
              <span className="profile-role">Administrator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-cards-container">
        <div className="stats-card total">
          <div className="stats-icon"><FiUser size={24} /></div>
          <div>
            <div className="stats-number">{stats.total}</div>
            <div className="stats-label">Total Registered Users</div>
          </div>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-box-wrapper">
          <div className={`search-box ${isSearchFocused ? "focused" : ""}`}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by shop name, phone, GST or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm("")}><FiX size={16} /></button>
            )}
          </div>
        </div>
      </div>

      <div className="table-container fullscreen">
        {loading && <div className="loader-container"><div className="loader"></div></div>}
        {err && <div className="error-message"><FiAlertCircle /> {err}</div>}
        {!loading && !err && (
          <>
            <div className="customers-list">
              {paginatedData.length > 0 ? (
                paginatedData.map((customer) => {
                  const isExpanded = expandedAddresses.has(customer._id);
                  const cityName = extractCity(customer.address);
                  
                  return (
                    <div key={customer._id} className="customer-card">
                      <div className="card-main">
                        <div className="card-left">
                          <div className="shop-name"><FiMapPin className="location-icon" size={16} />{customer.shopName}</div>
                          <div className="city-row">
                            <span className="dash">-</span><FiMapPin className="city-icon" size={14} /><span className="city-name">{cityName}</span>
                          </div>
                        </div>
                        <div className="card-right">
                          <button className="action-btn-sm whatsapp-btn" onClick={() => openWhatsApp(customer.whatsapp)}><FiMessageSquare size={14} /> Chat</button>
                          <button className="action-btn-icon delete-btn" disabled={acting === customer._id} onClick={() => setDeleteCandidateId(customer._id)}><FiTrash2 size={16} /></button>
                        </div>
                      </div>
                      
                      {(customer.address || customer.gstNumber || customer.gstDocumentUrl) && (
                        <div className="address-section">
                          <button className="toggle-address-btn" onClick={() => toggleAddress(customer._id)}>
                            {isExpanded ? "Hide full details" : "See full details"}
                          </button>
                          
                          {isExpanded && (
                            <div className="full-address">
                              
                              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                
                                {customer.gstNumber && (
                                  <div style={{ background: "#f0f7ff", padding: "8px 12px", borderRadius: "6px", color: "#0056b3", fontWeight: "600", display: "inline-flex", alignItems: "center" }}>
                                    <FiBriefcase size={14} style={{ marginRight: '6px' }} />
                                    GST: {customer.gstNumber}
                                  </div>
                                )}

                                {/* ✅ Button: Opens Modal instead of a new tab */}
                                {customer.gstDocumentUrl && (
                                  <div 
                                    onClick={() => setPreviewDocUrl(customer.gstDocumentUrl || null)}
                                    style={{ background: "#e8f5e9", padding: "8px 12px", borderRadius: "6px", color: "#2e7d32", fontWeight: "600", display: "inline-flex", alignItems: "center", cursor: "pointer", transition: "0.2s" }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                                  >
                                    <FiEye size={16} style={{ marginRight: '6px' }} />
                                    View / Download GST Document
                                  </div>
                                )}
                              </div>

                              {customer.address && customer.address.split('\n').map((line, idx) => {
                                const parts = line.split(':');
                                if(parts.length > 1) {
                                  return (
                                    <div key={idx} className="address-line">
                                      <strong>{parts[0]}:</strong><span>{parts.slice(1).join(':')}</span>
                                    </div>
                                  );
                                }
                                return <div key={idx} className="address-line">{line}</div>;
                              })}
                              <div className="contact-details">
                                <div className="contact-item"><FiPhone size={12} className="contact-icon" /><span>{customer.otpMobile}</span></div>
                                {customer.whatsapp && customer.whatsapp !== customer.otpMobile && (
                                  <div className="contact-item"><FiMessageSquare size={12} className="contact-icon" /><span>{customer.whatsapp}</span></div>
                                )}
                              </div>
                              <div className="reg-date"><FiUser size={12} className="reg-icon" /> Registered: {format(new Date(customer.createdAt), "dd MMM yyyy, hh:mm a")}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="no-results">No customers match your criteria.</div>
              )}
            </div>

            {filteredRows.length > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">Showing 1 to {Math.min(itemsPerPage, filteredRows.length)} of {filteredRows.length} entries</div>
                <div className="pagination-controls">
                  <button className="pagination-btn" onClick={() => handlePageChange(1)} disabled={currentPage === 1}><FiChevronsLeft size={18} /></button>
                  <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><FiChevronLeft size={18} /></button>
                  {getPageNumbers().map((page, index) => (
                    page === -1 ? <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span> : 
                    <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page)}>{page}</button>
                  ))}
                  <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><FiChevronRight size={18} /></button>
                  <button className="pagination-btn" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}><FiChevronsRight size={18} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteCandidateId && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content" style={{height: "auto", maxWidth: "400px"}}>
            <h3 className="delete-modal-title">Confirm Deletion</h3>
            <p className="delete-modal-text">This action is permanent and cannot be undone. Please enter the password to confirm.</p>
            <div className="delete-modal-input-wrapper">
              <FiKey className="delete-modal-input-icon" />
              <input type="password" placeholder="Enter password..." className="delete-modal-input" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoFocus />
            </div>
            <div className="delete-modal-actions">
              <button className="action-btn-sm modal-cancel-btn" onClick={() => { setDeleteCandidateId(null); setDeletePassword(""); }}>Cancel</button>
              <button className="action-btn-sm modal-confirm-btn" onClick={handleConfirmDelete}>Delete Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;