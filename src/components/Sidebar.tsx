// src/components/Sidebar.tsx ✅ FINAL (Home Builder included)
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiPackage,
  FiBox,
  FiPlus,
  FiUsers,
  FiMessageSquare,
  FiLogOut,
  FiX,
  FiImage,
  FiUploadCloud,
  FiCreditCard,
  FiChevronRight,
  FiSearch,
  FiActivity,
  FiBarChart2,
  FiCornerUpLeft,
  FiTrendingUp,
  FiGrid, // ✅ Home Builder icon
} from "react-icons/fi";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { TbCategory } from "react-icons/tb";
import "../styles/SidebarFinal.css";

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
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
    }
  };

  const ChevronIcon = () => (
    <div className="nav-chevron-final">
      <FiChevronRight />
    </div>
  );

  const NavItem = ({
    to,
    icon: Icon,
    label,
    gradient = "blue",
  }: {
    to: string;
    icon: any;
    label: string;
    gradient?: string;
  }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`nav-item-final ${active ? "active" : ""}`}
        onClick={closeSidebar}
        data-gradient={gradient}
      >
        <div className="nav-item-wrapper">
          <div className="nav-icon-wrapper">
            <Icon className="nav-icon-final" />
            {active && <div className="nav-glow" data-gradient={gradient} />}
          </div>
          <span className="nav-label-final">{label}</span>
          {active && <ChevronIcon />}
        </div>
      </Link>
    );
  };

  return (
    <>
      <div
        className={`sidebar-overlay-final ${sidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
      />

      <aside className={`sidebar-final ${sidebarOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header-final">
          <div className="logo-container-final">
            <img
              src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png"
              alt="Bafna Toys"
              className="logo-image-final"
            />
          </div>

          <div className="brand-info-final">
            <h1 className="brand-name-final">Bafna Toys</h1>
            <p className="brand-subtitle-final">
              <span className="status-dot-final online" /> Admin Dashboard
            </p>
          </div>

          <button className="mobile-close-final" onClick={closeSidebar}>
            <FiX />
          </button>
        </div>

        {/* Search Bar */}
        <div className="sidebar-search-final">
          <FiSearch className="search-icon-final" />
          <input
            type="text"
            placeholder="Search modules..."
            className="search-input-final"
          />
        </div>

        {/* Navigation */}
        <div className="sidebar-scroll-final">
          <div className="nav-section-final">
            <h4 className="section-header-final">Dashboard</h4>
            <NavItem
              to="/admin/dashboard"
              icon={MdOutlineSpaceDashboard}
              label="Analytics Overview"
              gradient="purple"
            />

            <NavItem
              to="/admin/analytics"
              icon={FiTrendingUp}
              label="Website Traffic"
              gradient="cyan"
            />

            <NavItem
              to="/admin/orders"
              icon={FiPackage}
              label="Order Management"
              gradient="blue"
            />

            <NavItem
              to="/admin/returns"
              icon={FiCornerUpLeft}
              label="Return Requests"
              gradient="red"
            />
          </div>

          <div className="nav-section-final">
            <h4 className="section-header-final">Inventory</h4>
            <NavItem
              to="/admin/products"
              icon={FiBox}
              label="All Products"
              gradient="green"
            />

            <NavItem
              to="/admin/products/new"
              icon={FiPlus}
              label="Add Product"
              gradient="pink"
            />

            <NavItem
              to="/admin/inventory"
              icon={FiActivity}
              label="Stock & Sales"
              gradient="red"
            />

            <NavItem
              to="/admin/categories"
              icon={TbCategory}
              label="Categories"
              gradient="orange"
            />
          </div>

          <div className="nav-section-final">
            <h4 className="section-header-final">Analytics</h4>
            <NavItem
              to="/admin/sales-report"
              icon={FiBarChart2}
              label="Customer Sales"
              gradient="indigo"
            />
          </div>

          <div className="nav-section-final">
            <h4 className="section-header-final">Marketing</h4>

            {/* ✅ Home Builder */}
            <NavItem
              to="/admin/home-builder"
              icon={FiGrid}
              label="Home Builder"
              gradient="orange"
            />

            <NavItem
              to="/admin/banners"
              icon={FiImage}
              label="Banner Manager"
              gradient="teal"
            />

            <NavItem
              to="/admin/banners/upload"
              icon={FiUploadCloud}
              label="Upload Media"
              gradient="cyan"
            />

            <NavItem
              to="/admin/whatsapp"
              icon={FiMessageSquare}
              label="WhatsApp Campaigns"
              gradient="green"
            />
          </div>

          <div className="nav-section-final">
            <h4 className="section-header-final">Management</h4>
            <NavItem
              to="/admin/registrations"
              icon={FiUsers}
              label="Customer Database"
              gradient="indigo"
            />

            <NavItem
              to="/admin/payment-shipping"
              icon={FiCreditCard}
              label="Finance & Shipping"
              gradient="yellow"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer-final">
          <div className="admin-profile-card">
            <div className="profile-avatar-final">
              <div className="avatar-initials">AT</div>
            </div>

            <div className="profile-info-final">
              <div className="profile-name-final">Admin Team</div>
              <div className="profile-role-final">
                <span className="role-badge">Super Admin</span>
                <span className="version">v2.4.0</span>
              </div>
            </div>

            <button
              className="logout-btn-final"
              onClick={handleLogout}
              title="Sign Out"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
