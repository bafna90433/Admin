// src/components/OrderModal.tsx
import React from "react";
import "../styles/OrderModal.css";
import { MEDIA_URL } from "../utils/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

// ✅ Export single order (only new fields)
const exportSingleOrder = (order: any) => {
  const rows = order.items.map((it: any) => ({
    OrderNumber: order.orderNumber || order._id.slice(-6),
    Shop: order.customerId?.shopName || "",
    Mobile: order.customerId?.otpMobile || "",
    WhatsApp: order.customerId?.whatsapp || "",
    Item: it.name,
    Qty: it.qty,
    Price: it.price,
    Total: it.price * it.qty,
    Inners: it.inners || 1,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    `order_${order.orderNumber || order._id.slice(-6)}.xlsx`
  );
};

const OrderModal: React.FC<OrderModalProps> = ({ order, onClose }) => {
  const totalInners = order.items?.reduce(
    (sum: number, it: any) => sum + (it.inners || 1),
    0
  );

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        <h2>Order #{order.orderNumber || order._id.slice(-6)}</h2>

        {/* ✅ Export Button */}
        <div className="ord-m-export">
          <button
            className="ord-btn-export"
            onClick={() => exportSingleOrder(order)}
          >
            ⬇️ Export This Order
          </button>
        </div>

        {/* ✅ Order Info */}
        <div className="ord-m-section">
          <div>
            <b>Status:</b> {order.status?.toUpperCase()}
          </div>
          <div>
            <b>Total:</b> {currency.format(order.total)}
          </div>
          <div>
            <b>Total Inners:</b> {totalInners}
          </div>
          <div>
            <b>Payment:</b> {order.paymentMethod || "-"}
          </div>
          <div>
            <b>Created:</b>{" "}
            {order.createdAt
              ? new Date(order.createdAt).toLocaleString()
              : "-"}
          </div>
        </div>

        {/* ✅ Customer Info */}
        <div className="ord-m-section">
          <b>Customer:</b>
          <br />
          {order.customerId?.shopName || "N/A"}
          <br />
          {order.customerId?.otpMobile && (
            <>
              📞 {order.customerId.otpMobile}
              <br />
            </>
          )}
          {order.customerId?.whatsapp && (
            <>
              💬 {order.customerId.whatsapp}
              <br />
            </>
          )}
          {order.customerId?.visitingCardUrl && (
            <a
              href={resolveImage(order.customerId.visitingCardUrl)}
              target="_blank"
              rel="noreferrer"
              className="ord-link"
            >
              Visiting Card
            </a>
          )}
        </div>

        {/* ✅ Shipping Info */}
        <div className="ord-m-section">
          <b>Shipping:</b>
          <br />
          {order.shipping?.address && (
            <>
              📍 {order.shipping.address}
              <br />
            </>
          )}
          {order.shipping?.phone && (
            <>
              📞 {order.shipping.phone}
              <br />
            </>
          )}
          {order.shipping?.email && (
            <>
              ✉️ {order.shipping.email}
              <br />
            </>
          )}
          {order.shipping?.notes && <>📝 {order.shipping.notes}</>}
          {!order.shipping?.address &&
            !order.shipping?.phone &&
            !order.shipping?.email &&
            !order.shipping?.notes && (
              <span style={{ color: "#888" }}>No shipping info</span>
            )}
        </div>

        {/* ✅ Items List */}
        <div className="ord-m-section">
          <b>Items:</b>
          {order.items.map((it: any, i: number) => {
            const img = resolveImage(it.image);
            return (
              <div className="ord-m-item" key={i}>
                {img ? (
                  <img src={img} alt={it.name} className="ord-m-img" />
                ) : (
                  <div className="ord-m-img ord-m-imgph" />
                )}
                <span className="ord-m-iname">{it.name}</span>
                <span className="ord-m-inner">
                  ({it.inners || 1} inners)
                </span>
                <span className="ord-m-qty">x{it.qty}</span>
                <span className="ord-m-price">
                  {currency.format(it.price * it.qty)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderModal;
