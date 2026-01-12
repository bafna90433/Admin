import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiLayout,
  FiShoppingBag,
  FiTag,
  FiBox,
  FiPlusCircle,
  FiUsers,
  FiMessageCircle,
  FiLogOut,
  FiX,
  FiImage,
  FiPlusSquare,
  FiDollarSign,
  FiTruck, // ✅ Added Truck Icon for Shipping
} from "react-icons/fi";
import "../styles/Sidebar.css";

interface SidebarProps {
  sidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, closeSidebar }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
    }
  };

  return (
    <aside className={`sidebar-glass ${sidebarOpen ? "open" : ""}`}>
      {/* ================= BRAND ================= */}
      <div className="brand-wrapper">
        <div className="brand-icon-box">
          <img
            src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png"
            alt="Bafna Toys Logo"
          />
        </div>

        <div className="brand-info">
          <span className="brand-name">Bafna Admin</span>
          <span className="brand-status">
            <span className="dot"></span> Online
          </span>
        </div>

        <button className="sidebar-close-btn" onClick={closeSidebar}>
          <FiX />
        </button>
      </div>

      {/* ================= NAVIGATION ================= */}
      <div className="nav-container">
        {/* -------- General -------- */}
        <div className="nav-group-label">General</div>

        <Link
          to="/admin/dashboard"
          className={`glass-link ${
            isActive("/admin/dashboard") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiLayout className="link-icon" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/admin/orders"
          className={`glass-link ${
            isActive("/admin/orders") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiShoppingBag className="link-icon" />
          <span>Orders</span>
        </Link>

        {/* -------- Catalog -------- */}
        <div className="nav-group-label">Catalog</div>

        <Link
          to="/admin/categories"
          className={`glass-link ${
            isActive("/admin/categories") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiTag className="link-icon" />
          <span>Categories</span>
        </Link>

        <Link
          to="/admin/products"
          className={`glass-link ${
            isActive("/admin/products") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiBox className="link-icon" />
          <span>Products</span>
        </Link>

        <Link
          to="/admin/products/new"
          className={`glass-link ${
            isActive("/admin/products/new") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiPlusCircle className="link-icon" />
          <span>Add New Toy</span>
        </Link>

        {/* -------- Marketing -------- */}
        <div className="nav-group-label">Marketing</div>

        <Link
          to="/admin/banners"
          className={`glass-link ${
            isActive("/admin/banners") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiImage className="link-icon" />
          <span>Banner List</span>
        </Link>

        <Link
          to="/admin/banners/upload"
          className={`glass-link ${
            isActive("/admin/banners/upload") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiPlusSquare className="link-icon" />
          <span>Add Banner</span>
        </Link>

        {/* -------- System -------- */}
        <div className="nav-group-label">System</div>

        <Link
          to="/admin/registrations"
          className={`glass-link ${
            isActive("/admin/registrations") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiUsers className="link-icon" />
          <span>Customers</span>
        </Link>

        <Link
          to="/admin/whatsapp"
          className={`glass-link ${
            isActive("/admin/whatsapp") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiMessageCircle className="link-icon" />
          <span>WhatsApp</span>
        </Link>

        {/* ✅ COD SETTINGS */}
        <Link
          to="/admin/cod-settings"
          className={`glass-link ${
            isActive("/admin/cod-settings") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiDollarSign className="link-icon" />
          <span>COD Settings</span>
        </Link>

        {/* ✅ SHIPPING SETTINGS (New) */}
        <Link
          to="/admin/shipping-settings"
          className={`glass-link ${
            isActive("/admin/shipping-settings") ? "active" : ""
          }`}
          onClick={closeSidebar}
        >
          <FiTruck className="link-icon" />
          <span>Shipping Rules</span>
        </Link>
      </div>

      {/* ================= LOGOUT ================= */}
      <div className="sidebar-bottom">
        <button className="logout-glass" onClick={handleLogout}>
          <FiLogOut />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;