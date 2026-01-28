// src/components/OrderModal.tsx
import React from "react";
import "../styles/OrderModal.css";
import { MEDIA_URL } from "../utils/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  X,
  MapPin,
  Phone,
  User,
  Package,
  Download,
  CreditCard,
  Calendar,
  Info,
  ExternalLink,
  CheckCircle,
} from "lucide-react";

interface OrderModalProps {
  order: any;
  onClose: () => void;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

// ✅ Resolve full image path
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_URL}${img}`;
  if (img.startsWith("uploads/") || img.startsWith("images/"))
    return `${MEDIA_URL}/${img}`;
  return `${MEDIA_URL}/uploads/${encodeURIComponent(img)}`;
};

// ✅ Export single order (Updated for Excel Payment Mode)
const exportSingleOrder = (order: any) => {
  const sa = order.shippingAddress;
  const rows = order.items.map((it: any) => ({
    Order_Number: order.orderNumber || order._id.slice(-6),
    Shop_Name: order.customerId?.shopName || "",
    Customer_Mobile: order.customerId?.otpMobile || "",
    Shipping_Name: sa?.fullName || "",
    Shipping_Phone: sa?.phone || "",
    Street: sa?.street || "",
    Area: sa?.area || "N/A",
    City: sa?.city || "",
    State: sa?.state || "",
    Pincode: sa?.pincode || "",
    Item_Name: it.name,
    Qty_Packets: it.qty,
    Price_Per_Pc: it.price,
    Total_Amount: it.price * it.qty,
    Status: order.status,
    // ✅ Excel Payment Column
    Payment_Mode: order.paymentMode === "ONLINE" ? "Online Payment" : "Cash on Delivery",
    Date: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString()
      : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order_Details");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `BafnaToys_Order_${order.orderNumber || order._id.slice(-6)}.xlsx`
  );
};

const OrderModal: React.FC<OrderModalProps> = ({ order, onClose }) => {
  const sa = order.shippingAddress;

  // ✅ Total Packets = sum of qty
  const totalPackets = order.items?.reduce(
    (sum: number, it: any) => sum + (it.qty || 0),
    0
  );

  // ✅ Logic to display Payment Status correctly
  const isOnline = order.paymentMode === "ONLINE";
  const paymentDisplay = isOnline ? "Online Payment (Paid)" : "Cash on Delivery";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <Package className="header-icon" />
            <h2>Order Details #{order.orderNumber || order._id.slice(-6)}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Actions */}
          <div className="ord-m-actions">
            <button
              className="ord-btn-export"
              onClick={() => exportSingleOrder(order)}
            >
              <Download size={18} /> Export to Excel
            </button>
          </div>

          <div className="ord-m-grid">
            {/* Order Summary */}
            <div className="ord-m-section">
              <h4 className="section-title">
                <Info size={18} /> Order Summary
              </h4>
              <div className="info-grid">
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status-tag ${order.status}`}>
                    {order.status?.toUpperCase()}
                  </span>
                </p>
                
                {/* ✅ FIXED PAYMENT DISPLAY */}
                <p style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <strong>
                    <CreditCard size={14} /> Payment:
                  </strong>{" "}
                  {isOnline ? (
                    <span style={{ color: "green", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                      {paymentDisplay} <CheckCircle size={14} />
                    </span>
                  ) : (
                    <span>{paymentDisplay}</span>
                  )}
                </p>

                <p>
                  <strong>
                    <Calendar size={14} /> Date:
                  </strong>{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "-"}
                </p>
                <p>
                  <strong>Total Packets:</strong> {totalPackets}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="ord-m-section">
              <h4 className="section-title">
                <User size={18} /> Customer Info
              </h4>
              <p>
                <strong>Shop:</strong>{" "}
                {order.customerId?.shopName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {order.customerId?.otpMobile || "-"}
              </p>
              {order.customerId?.whatsapp && (
                <p>
                  <strong>WhatsApp:</strong> {order.customerId.whatsapp}
                </p>
              )}
              {order.customerId?.visitingCardUrl && (
                <a
                  href={resolveImage(order.customerId.visitingCardUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="view-card-link"
                >
                  View Visiting Card <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Shipping Address */}
            <div className="ord-m-section shipping-highlight">
              <h4 className="section-title">
                <MapPin size={18} /> Shipping Address
              </h4>
              {sa ? (
                <div className="address-display-box">
                  <p>
                    <strong>{sa.fullName}</strong>
                  </p>
                  <p>{sa.street}</p>
                  {sa.area && <p>{sa.area}</p>}
                  <p>
                    {sa.city}, {sa.state} -{" "}
                    <strong>{sa.pincode}</strong>
                  </p>
                  <p className="mt-2">
                    <strong>
                      <Phone size={14} /> {sa.phone}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="no-data">Shipping address not available.</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="ord-m-section">
            <h4 className="section-title">
              <Package size={18} /> Items List
            </h4>
            <div className="modal-items-container">
              {order.items?.map((it: any, i: number) => {
                const img = resolveImage(it.image);
                return (
                  <div className="ord-m-item" key={i}>
                    <div className="ord-m-img-box">
                      {img ? (
                        <img src={img} alt={it.name} />
                      ) : (
                        <div className="img-placeholder" />
                      )}
                    </div>
                    <div className="ord-m-item-info">
                      <span className="item-name-text">{it.name}</span>
                      <span className="item-qty-text">
                        {it.qty} packets
                      </span>
                    </div>
                    <div className="item-price-text">
                      {currency.format(it.price * it.qty)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="grand-total-display">
            <span>Grand Total:</span>
            <span className="total-amount">
              {currency.format(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;