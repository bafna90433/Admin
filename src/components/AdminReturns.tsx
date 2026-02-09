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

// ================= ENV =================
const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://bafnatoys-backend-production.up.railway.app/api";

const MEDIA_URL =
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

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

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

// ================= HELPERS =================
const resolveImage = (img?: string) => {
  if (!img) return "/placeholder-product.png";
  if (img.startsWith("http")) return img;
  return `${MEDIA_URL}${img}`;
};

// ================= MAIN COMPONENT =================
const AdminReturns: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  // 🔒 Modal scroll lock
  useEffect(() => {
    document.body.style.overflow = selectedOrder ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedOrder]);

  // ================= FETCH RETURNS =================
  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const token = localStorage.getItem("adminToken");

        const { data } = await axios.get(`${API_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const returnOrders = data.filter(
          (o: Order) => o.returnRequest?.isRequested === true
        );

        // Pending first
        returnOrders.sort((a: Order, b: Order) =>
          a.returnRequest?.status === "Pending" &&
          b.returnRequest?.status !== "Pending"
            ? -1
            : 1
        );

        setOrders(returnOrders);
      } catch (err) {
        console.error("Error fetching returns:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReturns();
  }, []);

  // ================= ACTION =================
  const handleAction = async (status: "Approved" | "Rejected") => {
    if (!selectedOrder) return;
    setProcessing(true);

    try {
      const token = localStorage.getItem("adminToken");

      await axios.put(
        `${API_URL}/orders/admin/return-action/${selectedOrder._id}`,
        { status, comment: adminComment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update UI immediately
      setOrders((prev) =>
        prev.map((o) =>
          o._id === selectedOrder._id
            ? {
                ...o,
                returnRequest: o.returnRequest
                  ? {
                      ...o.returnRequest,
                      status,
                      adminComment,
                    }
                  : o.returnRequest,
              }
            : o
        )
      );

      alert(`Return ${status} successfully`);
    } catch (err) {
      console.error("Action error:", err);
      alert("Action failed");
    } finally {
      setProcessing(false);
      setSelectedOrder(null);
      setAdminComment("");
    }
  };

  // ================= UTILS =================
  const getReturnedProducts = (order: Order) => {
    if (!order.returnRequest?.description) return [];
    const match = order.returnRequest.description.match(
      /\[RETURN ITEMS: (.*?)\]/
    );
    if (!match?.[1]) return [];
    const names = match[1].split(",").map((s) => s.trim());
    return order.items.filter((i) => names.includes(i.name));
  };

  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, approved: 0, rejected: 0 };
    orders.forEach((o) => {
      if (o.returnRequest?.status === "Pending") c.pending++;
      if (o.returnRequest?.status === "Approved") c.approved++;
      if (o.returnRequest?.status === "Rejected") c.rejected++;
    });
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const st = order.returnRequest?.status;
      if (statusFilter !== "All" && st !== statusFilter) return false;
      if (!q) return true;

      const orderId = (order.orderNumber || order._id).toLowerCase();
      const customer =
        (order.customerId?.shopName ||
          order.shippingAddress?.fullName ||
          "guest").toLowerCase();
      const mobile =
        (order.customerId?.otpMobile ||
          order.shippingAddress?.phone ||
          "").toLowerCase();
      const reason = (order.returnRequest?.reason || "").toLowerCase();

      return (
        orderId.includes(q) ||
        customer.includes(q) ||
        mobile.includes(q) ||
        reason.includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  // ================= UI =================
  return (
    <div className="admin-container">
      <h2 className="page-title">
        <FiPackage /> Customer Return Requests
      </h2>

      {/* Toolbar */}
      <div className="returns-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <FiSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order, Customer, Mobile, Reason"
            />
          </div>

          <div className="filter-box">
            <FiFilter />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="stat-pill">All: {counts.all}</div>
          <div className="stat-pill pending">Pending: {counts.pending}</div>
          <div className="stat-pill approved">Approved: {counts.approved}</div>
          <div className="stat-pill rejected">Rejected: {counts.rejected}</div>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No return requests</p>
      ) : (
        <table className="returns-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Reason</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o._id}>
                <td>{o.orderNumber || o._id.slice(-6)}</td>
                <td>{o.customerId?.shopName || "Guest"}</td>
                <td>
                  {new Date(
                    o.returnRequest?.requestDate || ""
                  ).toLocaleDateString()}
                </td>
                <td>{o.returnRequest?.reason}</td>
                <td>{o.returnRequest?.status}</td>
                <td>
                  <button onClick={() => setSelectedOrder(o)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL */}
      {selectedOrder && selectedOrder.returnRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="close-icon"
              onClick={() => setSelectedOrder(null)}
            >
              <FiX />
            </button>

            <h3>Return Details</h3>

            {selectedOrder.returnRequest.status === "Pending" && (
              <>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Admin note"
                />
                <button
                  disabled={processing}
                  onClick={() => handleAction("Approved")}
                >
                  <FiCheck /> Approve
                </button>
                <button
                  disabled={processing}
                  onClick={() => handleAction("Rejected")}
                >
                  <FiX /> Reject
                </button>
              </>
            )}

            {selectedOrder.returnRequest.status !== "Pending" && (
              <p>
                <FiAlertCircle /> Already{" "}
                {selectedOrder.returnRequest.status}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReturns;
