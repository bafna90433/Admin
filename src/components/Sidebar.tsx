import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,           // Dashboard
  FiPackage,        // Orders
  FiLayers,         // Categories
  FiBox,            // Products
  FiPlus,           // Add
  FiUsers,          // Customers
  FiMessageSquare,  // Whatsapp
  FiLogOut,
  FiX,
  FiImage,
  FiUploadCloud,
  FiCreditCard,     // Payment
  FiSettings,
  FiChevronRight
} from "react-icons/fi";
import "../styles/Sidebar.css";

interface SidebarProps {
  sidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, closeSidebar }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path);

  const handleLogout = () => {
    if (window.confirm("Confirm Logout?")) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
    }
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`nav-item ${active ? "active" : ""}`}
        onClick={closeSidebar}
      >
        <Icon className="nav-icon" />
        <span className="nav-label">{label}</span>
        {active && <div className="active-dot" />}
      </Link>
    );
  };

  return (
    <>
      <div 
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`} 
        onClick={closeSidebar}
      />

      <aside className={`sidebar-pro ${sidebarOpen ? "open" : ""}`}>
        {/* === BRAND HEADER === */}
        <div className="sidebar-header">
          <div className="logo-container">
            <img
              src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png"
              alt="Bafna Toys"
            />
          </div>
          <div className="brand-details">
            <h1>Bafna Toys</h1>
            <span className="workspace-badge">Workspace</span>
          </div>
          <button className="mobile-close" onClick={closeSidebar}>
            <FiX />
          </button>
        </div>

        {/* === NAVIGATION SCROLL === */}
        <div className="sidebar-nav-scroll">
          
          <div className="nav-section">
            <h4 className="section-header">ANALYTICS</h4>
            <NavItem to="/admin/dashboard" icon={FiGrid} label="Dashboard" />
            <NavItem to="/admin/orders" icon={FiPackage} label="Orders" />
          </div>

          <div className="nav-section">
            <h4 className="section-header">INVENTORY</h4>
            <NavItem to="/admin/products" icon={FiBox} label="All Products" />
            <NavItem to="/admin/products/new" icon={FiPlus} label="Add Product" />
            <NavItem to="/admin/categories" icon={FiLayers} label="Categories" />
          </div>

          <div className="nav-section">
            <h4 className="section-header">MARKETING</h4>
            <NavItem to="/admin/banners" icon={FiImage} label="Banners" />
            <NavItem to="/admin/banners/upload" icon={FiUploadCloud} label="Upload Media" />
            <NavItem to="/admin/whatsapp" icon={FiMessageSquare} label="WhatsApp" />
          </div>

          <div className="nav-section">
            <h4 className="section-header">MANAGEMENT</h4>
            <NavItem to="/admin/registrations" icon={FiUsers} label="Customers" />
            <NavItem to="/admin/payment-shipping" icon={FiCreditCard} label="Finance & Ship" />
          </div>
        </div>

        {/* === PROFESSIONAL FOOTER === */}
        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="profile-icon">
              <FiSettings />
            </div>
            <div className="profile-info">
              <span className="p-name">Admin Console</span>
              <span className="p-role">v2.4.0</span>
            </div>
            <button className="logout-mini-btn" onClick={handleLogout} title="Sign Out">
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;