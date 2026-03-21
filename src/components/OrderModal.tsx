import React from "react";
import "../styles/OrderModal.css";
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
  FileText, // ✅ Naya icon import kiya
} from "lucide-react";

// --- ✅ CONFIGURATION (Live URL Fix) ---
const MEDIA_BASE =
  process.env.VITE_MEDIA_URL ||
  process.env.REACT_APP_MEDIA_URL ||
  "https://bafnatoys-backend-production.up.railway.app";

interface OrderModalProps {
  order: any;
  onClose: () => void;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

// ✅ Resolve full image path using Live MEDIA_BASE
const resolveImage = (img?: string): string => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/uploads") || img.startsWith("/images"))
    return `${MEDIA_BASE}${img}`;
  if (img.startsWith("uploads/") || img.startsWith("images/"))
    return `${MEDIA_BASE}/${img}`;
  return `${MEDIA_BASE}/uploads/${encodeURIComponent(img)}`;
};

// ✅ Export single order (Excel) - Naye fields add kiye
const exportSingleOrder = (order: any) => {
  const sa = order.shippingAddress;
  const rows = (order.items || []).map((it: any) => ({
    Order_Number: order.orderNumber || order._id?.slice(-6),
    Shop_Name_Registered: order.customerId?.shopName || "",
    Customer_Mobile: order.customerId?.otpMobile || "",
    
    // ✅ Billing Details
    Billing_Shop_Name: sa?.shopName || "",
    Billing_GST_Number: sa?.gstNumber || "",
    Billing_Contact_Person: sa?.fullName || "",
    Billing_Phone: sa?.phone || "",
    Billing_Street: sa?.street || "",
    Billing_Area: sa?.area || "N/A",
    Billing_City: sa?.city || "",
    Billing_State: sa?.state || "",
    Billing_Pincode: sa?.pincode || "",

    // ✅ Shipping Details (If Different)
    Is_Different_Shipping: sa?.isDifferentShipping ? "Yes" : "No",
    Shipping_Street: sa?.isDifferentShipping ? sa?.shippingStreet : sa?.street,
    Shipping_Area: sa?.isDifferentShipping ? sa?.shippingArea : sa?.area || "N/A",
    Shipping_City: sa?.isDifferentShipping ? sa?.shippingCity : sa?.city,
    Shipping_State: sa?.isDifferentShipping ? sa?.shippingState : sa?.state,
    Shipping_Pincode: sa?.isDifferentShipping ? sa?.shippingPincode : sa?.pincode,

    Item_Name: it.name,
    Qty_Packets: it.qty,
    Price_Per_Pc: it.price,
    Total_Amount: (it.price || 0) * (it.qty || 0),
    Status: order.status,
    Payment_Mode:
      String(order.paymentMode || "").toUpperCase() === "ONLINE"
        ? "Online Payment"
        : "Cash on Delivery",
    Date: order.createdAt ? new Date(order.createdAt).toLocaleString() : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order_Details");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `BafnaToys_Order_${order.orderNumber || order._id?.slice(-6)}.xlsx`
  );
};

const OrderModal: React.FC<OrderModalProps> = ({ order, onClose }) => {
  const sa = order.shippingAddress;

  // ✅ Total Packets = sum of qty
  const totalPackets = (order.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.qty) || 0),
    0
  );

  // ✅ Robust payment mode logic
  const paymentMode = String(order.paymentMode || "COD").toUpperCase();
  const isOnline = paymentMode === "ONLINE";
  const paymentDisplay = isOnline ? "Online Payment (Paid)" : "Cash on Delivery";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-title">
            <Package className="header-icon" />
            <h2>Order Details #{order.orderNumber || order._id?.slice(-6)}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* Actions */}
          <div className="ord-m-actions">
            <button className="ord-btn-export" onClick={() => exportSingleOrder(order)}>
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
                    {String(order.status || "").toUpperCase()}
                  </span>
                </p>

                <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CreditCard size={14} /> Payment:
                  </strong>
                  {isOnline ? (
                    <span
                      style={{
                        color: "#16a34a",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {paymentDisplay} <CheckCircle size={14} />
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, color: "#f97316" }}>{paymentDisplay}</span>
                  )}
                </p>

                <p>
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} /> Date:
                  </strong>{" "}
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
                </p>

                <p>
                  <strong>Total Packets:</strong> {totalPackets}
                </p>
              </div>
            </div>

            {/* Customer Registration Info */}
            <div className="ord-m-section">
              <h4 className="section-title">
                <User size={18} /> Registered Account
              </h4>
              <p>
                <strong>Registered Name:</strong> {order.customerId?.shopName || "N/A"}
              </p>
              <p>
                <strong>Phone:</strong> {order.customerId?.otpMobile || "-"}
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

            {/* ✅ UPDATED: Billing Address */}
            <div className="ord-m-section shipping-highlight">
              <h4 className="section-title" style={{ color: '#1d4ed8' }}>
                <FileText size={18} /> Billing Details
              </h4>
              {sa ? (
                <div className="address-display-box" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <p>
                    <strong>Shop: {sa.shopName || "N/A"}</strong>
                  </p>
                  <p>
                    <strong>Attn: {sa.fullName}</strong>
                  </p>
                  {sa.gstNumber && (
                    <p style={{ color: '#047857', fontWeight: 600, marginTop: '4px' }}>
                      GST: {sa.gstNumber}
                    </p>
                  )}
                  <div style={{ marginTop: "8px", borderTop: '1px dashed #bae6fd', paddingTop: '8px' }}>
                    <p>{sa.street}</p>
                    {sa.area && <p>{sa.area}</p>}
                    <p>
                      {sa.city}, {sa.state} - <strong>{sa.pincode}</strong>
                    </p>
                    <div style={{ marginTop: "8px" }}>
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={14} /> {sa.phone}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="no-data">Billing details not available.</p>
              )}
            </div>

            {/* ✅ NEW: Different Shipping Address (if selected) */}
            {sa?.isDifferentShipping && (
              <div className="ord-m-section shipping-highlight">
                <h4 className="section-title" style={{ color: '#b45309' }}>
                  <MapPin size={18} /> Deliver To (Shipping Address)
                </h4>
                <div className="address-display-box" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                  <p>{sa.shippingStreet}</p>
                  {sa.shippingArea && <p>{sa.shippingArea}</p>}
                  <p>
                    {sa.shippingCity}, {sa.shippingState} - <strong>{sa.shippingPincode}</strong>
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Items */}
          <div className="ord-m-section" style={{ marginTop: '20px' }}>
            <h4 className="section-title">
              <Package size={18} /> Items List
            </h4>

            <div className="modal-items-container">
              {(order.items || []).map((it: any, i: number) => {
                const img = resolveImage(it.image);
                return (
                  <div className="ord-m-item" key={i}>
                    <div className="ord-m-img-box">
                      {img ? <img src={img} alt={it.name} /> : <div className="img-placeholder" />}
                    </div>

                    <div className="ord-m-item-info">
                      <span className="item-name-text">{it.name}</span>
                      <span className="item-qty-text">{it.qty} packets</span>
                    </div>

                    <div className="item-price-text">
                      {currency.format((Number(it.price) || 0) * (Number(it.qty) || 0))}
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
            <span className="total-amount">{currency.format(order.total || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;