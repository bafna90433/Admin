import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiX,
  FiCheck,
  FiAlertCircle,
  FiPackage,
  FiBox,
  FiUser,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import "../styles/AdminReturns.css";

// ================= TYPES =================
type OrderItem = {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type ReturnRequest = {
  isRequested: boolean;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  description: string;
  proofImages: string[];
  proofVideo: string;
  adminComment?: string;
  requestDate?: string;
};

type Customer = {
  _id?: string;
  firmName?: string;
  shopName?: string;
  otpMobile?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
};

type Order = {
  _id: string;
  orderNumber?: string;
  createdAt: string;
  total: number;
  items: OrderItem[];
  returnRequest?: ReturnRequest;
  shippingAddress?: any;
  customerId?: Customer;
};

// Helper to resolve image URL
const resolveImage = (img?: string) => {
  if (!img) return "/placeholder-product.png";
  if (img.startsWith("http")) return img;
  return `http://localhost:5000${img}`;
};

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

// ================= MAIN COMPONENT =================
const AdminReturns: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // ✅ Search + Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const API_URL = "http://localhost:5000/api";

  // ✅ Modal open -> body scroll lock
  useEffect(() => {
    if (selectedOrder) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedOrder]);

  // 1) Fetch Orders
  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const { data } = await axios.get(`${API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const returnOrders = data.filter(
          (o: Order) => o.returnRequest && o.returnRequest.isRequested === true
        );

        // ✅ Pending first
        returnOrders.sort((a: any, b: any) =>
          a.returnRequest?.status === "Pending" && b.returnRequest?.status !== "Pending"
            ? -1
            : 1
        );

        setOrders(returnOrders);
      } catch (error) {
        console.error("Error fetching returns:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReturns();
  }, []);

  // 2) Handle Action (✅ NO RELOAD, update state locally)
  const handleAction = async (status: "Approved" | "Rejected") => {
    if (!selectedOrder) return;
    setProcessing(true);

    try {
      const token = localStorage.getItem("adminToken");

      await axios.put(
        `${API_URL}/orders/admin/return-action/${selectedOrder._id}`,
        { status, comment: adminComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Update list immediately
      setOrders((prev) =>
        prev.map((o) =>
          o._id === selectedOrder._id
            ? {
                ...o,
                returnRequest: o.returnRequest
                  ? {
                      ...o.returnRequest,
                      status,
                      adminComment: adminComment,
                    }
                  : o.returnRequest,
              }
            : o
        )
      );

      alert(`Return ${status} Successfully!`);
    } catch (error) {
      console.error("Action Error:", error);
      alert("Something went wrong!");
    } finally {
      setProcessing(false);
      setSelectedOrder(null);
      setAdminComment("");
    }
  };

  const getReturnedProducts = (order: Order) => {
    if (!order.returnRequest?.description) return [];
    const match = order.returnRequest.description.match(/\[RETURN ITEMS: (.*?)\]/);
    if (match && match[1]) {
      const itemNames = match[1].split(",").map((s) => s.trim());
      return order.items.filter((item) => itemNames.includes(item.name));
    }
    return [];
  };

  // ✅ counts
  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, approved: 0, rejected: 0 };
    for (const o of orders) {
      const st = o.returnRequest?.status;
      if (st === "Pending") c.pending++;
      if (st === "Approved") c.approved++;
      if (st === "Rejected") c.rejected++;
    }
    return c;
  }, [orders]);

  // ✅ filter + search
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const st = order.returnRequest?.status;

      // status filter
      const statusOk = statusFilter === "All" ? true : st === statusFilter;

      if (!statusOk) return false;

      if (!q) return true;

      const orderIdText = (order.orderNumber || order._id).toLowerCase();
      const customerName =
        (order.customerId?.shopName ||
          order.shippingAddress?.fullName ||
          "guest").toLowerCase();
      const mobile =
        (order.customerId?.otpMobile || order.shippingAddress?.phone || "").toLowerCase();
      const reason = (order.returnRequest?.reason || "").toLowerCase();

      return (
        orderIdText.includes(q) ||
        customerName.includes(q) ||
        mobile.includes(q) ||
        reason.includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="admin-container">
      <h2 className="page-title">
        <FiPackage /> Customer Return Requests
      </h2>

      {/* ✅ Toolbar (Search + Filter + Counts) */}
      <div className="returns-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <FiSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Customer, Mobile, Reason..."
            />
          </div>

          <div className="filter-box">
            <FiFilter />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="stat-pill">All: <strong>{counts.all}</strong></div>
          <div className="stat-pill pending">Pending: <strong>{counts.pending}</strong></div>
          <div className="stat-pill approved">Approved: <strong>{counts.approved}</strong></div>
          <div className="stat-pill rejected">Rejected: <strong>{counts.rejected}</strong></div>
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Loading requests...</p>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <h3>No return requests found.</h3>
        </div>
      ) : (
        <div className="table-container">
          <table className="returns-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td className="order-id">
                    {order.orderNumber || order._id.slice(-6).toUpperCase()}
                  </td>

                  <td>
                    <strong>
                      {order.customerId?.shopName ||
                        order.shippingAddress?.fullName ||
                        "Guest"}
                    </strong>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      {order.customerId?.otpMobile || order.shippingAddress?.phone || ""}
                    </small>
                  </td>

                  <td>
                    {new Date(order.returnRequest?.requestDate || "").toLocaleDateString()}
                  </td>

                  <td className="reason-text">{order.returnRequest?.reason}</td>

                  <td>
                    <span className={`status-badge ${order.returnRequest?.status.toLowerCase()}`}>
                      {order.returnRequest?.status}
                    </span>
                  </td>

                  <td>
                    <button className="btn-view" onClick={() => setSelectedOrder(order)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODAL ================= */}
      {selectedOrder && selectedOrder.returnRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Review Return Request</h3>
              <button className="close-icon" onClick={() => setSelectedOrder(null)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* CUSTOMER DETAILS */}
              <div className="info-section">
                <h4 className="section-title">
                  <FiUser /> Customer Details
                </h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <span>Shop Name</span>
                    <strong>
                      {selectedOrder.customerId?.shopName ||
                        selectedOrder.shippingAddress?.fullName ||
                        "N/A"}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Mobile</span>
                    <strong>
                      {selectedOrder.customerId?.otpMobile ||
                        selectedOrder.shippingAddress?.phone ||
                        "N/A"}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>City</span>
                    <strong>
                      {selectedOrder.shippingAddress?.city ||
                        selectedOrder.customerId?.city ||
                        "N/A"}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>State</span>
                    <strong>
                      {selectedOrder.shippingAddress?.state ||
                        selectedOrder.customerId?.state ||
                        "N/A"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ORDER & RETURN INFO */}
              <div className="info-section">
                <div className="details-grid">
                  <div className="detail-item">
                    <span>Order ID</span>
                    <strong>{selectedOrder.orderNumber || selectedOrder._id}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Reason</span>
                    <strong style={{ color: "#ef4444" }}>
                      {selectedOrder.returnRequest.reason}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div className="detail-item">
                    <span>Description</span>
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        fontSize: "13px",
                        color: "#334155",
                        marginTop: "6px",
                      }}
                    >
                      {selectedOrder.returnRequest.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* RETURNED PRODUCTS */}
              {getReturnedProducts(selectedOrder).length > 0 && (
                <div className="info-section">
                  <h4 className="section-title">
                    <FiBox /> Returned Product(s)
                  </h4>
                  <div className="product-grid">
                    {getReturnedProducts(selectedOrder).map((item, idx) => (
                      <div key={idx} className="product-card">
                        <img
                          src={resolveImage(item.image)}
                          alt={item.name}
                          className="product-thumb"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).src =
                              "/placeholder-product.png")
                          }
                        />
                        <div className="product-name">{item.name}</div>
                        <div className="product-qty">Qty: {item.qty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROOF IMAGES */}
              <div className="info-section">
                <h4 className="section-title">Proof Images (User Uploaded)</h4>
                <div className="proof-grid">
                  {selectedOrder.returnRequest.proofImages.length > 0 ? (
                    selectedOrder.returnRequest.proofImages.map((img, idx) => (
                      <a
                        key={idx}
                        href={resolveImage(img)}
                        target="_blank"
                        rel="noreferrer"
                        className="proof-card"
                      >
                        <img
                          src={resolveImage(img)}
                          alt="proof"
                          className="proof-thumb"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/100?text=Error")
                          }
                        />
                      </a>
                    ))
                  ) : (
                    <p style={{ color: "#94a3b8", fontStyle: "italic" }}>
                      No proof images.
                    </p>
                  )}
                </div>

                {selectedOrder.returnRequest.proofVideo && (
                  <div style={{ marginTop: "10px" }}>
                    <a
                      href={resolveImage(selectedOrder.returnRequest.proofVideo)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2563eb", fontSize: "13px", fontWeight: 800 }}
                    >
                      🎥 Watch Proof Video
                    </a>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              {selectedOrder.returnRequest.status === "Pending" ? (
                <div className="action-area">
                  <textarea
                    className="admin-note-input"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Enter approval note or rejection reason..."
                  />

                  <div className="btn-row">
                    <button
                      className="btn btn-approve"
                      onClick={() => handleAction("Approved")}
                      disabled={processing}
                    >
                      <FiCheck /> Approve Return
                    </button>

                    <button
                      className="btn btn-reject"
                      onClick={() => handleAction("Rejected")}
                      disabled={processing}
                    >
                      <FiX /> Reject Return
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "15px",
                    background: "#f1f5f9",
                    borderRadius: "8px",
                    marginTop: "20px",
                  }}
                >
                  <FiAlertCircle
                    style={{
                      verticalAlign: "middle",
                      marginRight: "5px",
                      color: "#64748b",
                    }}
                  />
                  Request is <strong>{selectedOrder.returnRequest.status}</strong>.
                  {selectedOrder.returnRequest.adminComment && (
                    <div style={{ marginTop: "8px", fontSize: "13px", color: "#475569" }}>
                      <strong>Admin Note:</strong> {selectedOrder.returnRequest.adminComment}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReturns;
