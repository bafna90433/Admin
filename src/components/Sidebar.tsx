import React, { useEffect, useState } from "react";
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
  FiCreditCard,
  FiChevronRight,
  FiSearch,
  FiActivity,
  FiCornerUpLeft,
  FiTrendingUp,
  FiGrid,
  FiSettings,
  FiStar,
  FiShield,
  FiUserPlus,
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
  const [adminData, setAdminData] = useState<any>(null);

  // ✅ 1. Get user data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem("adminData");
    if (storedData) {
      setAdminData(JSON.parse(storedData));
    }
  }, []);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminData");
      navigate("/admin/login");
    }
  };

  // ✅ 2. Role and Permission Checker Helper
  const hasAccess = (requiredPermission: string) => {
    if (!adminData) return false;
    if (adminData.role === "superadmin") return true; 
    return adminData.permissions?.includes(requiredPermission);
  };

  // ✅ 3. Section Visibility Checkers (Poore 16 permissions ke liye update kar diya)
  const showDashboard = hasAccess("dashboard") || hasAccess("analytics") || hasAccess("orders") || hasAccess("returns");
  const showInventory = hasAccess("products") || hasAccess("add_product") || hasAccess("inventory") || hasAccess("categories");
  const showMarketing = hasAccess("home_builder") || hasAccess("banners") || hasAccess("trust_banners") || hasAccess("whatsapp");
  const showManagement = hasAccess("customers") || hasAccess("reviews") || hasAccess("finance") || hasAccess("settings") || adminData?.role === "superadmin";

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
          
          {/* DASHBOARD SECTION */}
          {showDashboard && (
            <div className="nav-section-final">
              <h4 className="section-header-final">Dashboard</h4>
              
              {hasAccess("dashboard") && (
                <NavItem
                  to="/admin/dashboard"
                  icon={MdOutlineSpaceDashboard}
                  label="Analytics Overview"
                  gradient="purple"
                />
              )}
              
              {hasAccess("analytics") && (
                <NavItem
                  to="/admin/analytics"
                  icon={FiTrendingUp}
                  label="Website Traffic"
                  gradient="cyan"
                />
              )}

              {hasAccess("orders") && (
                <NavItem
                  to="/admin/orders"
                  icon={FiPackage}
                  label="Order Management"
                  gradient="blue"
                />
              )}

              {hasAccess("returns") && (
                <NavItem
                  to="/admin/returns"
                  icon={FiCornerUpLeft}
                  label="Return Requests"
                  gradient="red"
                />
              )}
            </div>
          )}

          {/* INVENTORY SECTION */}
          {showInventory && (
            <div className="nav-section-final">
              <h4 className="section-header-final">Inventory</h4>
              
              {hasAccess("products") && (
                <NavItem
                  to="/admin/products"
                  icon={FiBox}
                  label="All Products"
                  gradient="green"
                />
              )}
              
              {hasAccess("add_product") && (
                <NavItem
                  to="/admin/products/new"
                  icon={FiPlus}
                  label="Add Product"
                  gradient="pink"
                />
              )}
              
              {hasAccess("inventory") && (
                <NavItem
                  to="/admin/inventory"
                  icon={FiActivity}
                  label="Stock & Sales"
                  gradient="red"
                />
              )}

              {hasAccess("categories") && (
                <NavItem
                  to="/admin/categories"
                  icon={TbCategory}
                  label="Categories"
                  gradient="orange"
                />
              )}
            </div>
          )}

          {/* MARKETING SECTION */}
          {showMarketing && (
            <div className="nav-section-final">
              <h4 className="section-header-final">Marketing</h4>
              
              {hasAccess("home_builder") && (
                <NavItem
                  to="/admin/home-builder"
                  icon={FiGrid}
                  label="Home Builder"
                  gradient="orange"
                />
              )}
              
              {hasAccess("banners") && (
                <NavItem
                  to="/admin/banners"
                  icon={FiImage}
                  label="Banner Management"
                  gradient="teal"
                />
              )}
              
              {hasAccess("trust_banners") && (
                <NavItem
                  to="/admin/trust-settings"
                  icon={FiShield}
                  label="Trust & Factory Banners"
                  gradient="blue"
                />
              )}
              
              {hasAccess("whatsapp") && (
                <NavItem
                  to="/admin/whatsapp"
                  icon={FiMessageSquare}
                  label="WhatsApp Campaigns"
                  gradient="green"
                />
              )}
            </div>
          )}

          {/* MANAGEMENT SECTION */}
          {showManagement && (
            <div className="nav-section-final">
              <h4 className="section-header-final">Management</h4>
              
              {hasAccess("customers") && (
                <NavItem
                  to="/admin/registrations"
                  icon={FiUsers}
                  label="Customer Database"
                  gradient="indigo"
                />
              )}
              
              {hasAccess("reviews") && (
                <NavItem
                  to="/admin/reviews"
                  icon={FiStar}
                  label="Product Reviews"
                  gradient="yellow"
                />
              )}

              {hasAccess("finance") && (
                <NavItem
                  to="/admin/payment-shipping"
                  icon={FiCreditCard}
                  label="Finance & Shipping"
                  gradient="yellow"
                />
              )}
              
              {hasAccess("settings") && (
                <NavItem
                  to="/admin/settings"
                  icon={FiSettings}
                  label="Settings & Config"
                  gradient="gray"
                />
              )}

              {/* ONLY SUPERADMIN CAN SEE THIS */}
              {adminData?.role === "superadmin" && (
                <NavItem
                  to="/admin/create-admin"
                  icon={FiUserPlus}
                  label="Manage Admins"
                  gradient="purple"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer-final">
          <div className="admin-profile-card">
            <div className="profile-avatar-final">
              <div className="avatar-initials">
                {adminData?.username ? adminData.username.substring(0, 2).toUpperCase() : "AT"}
              </div>
            </div>

            <div className="profile-info-final">
              <div className="profile-name-final" style={{ textTransform: 'capitalize' }}>
                {adminData?.username || "Admin Team"}
              </div>
              <div className="profile-role-final">
                <span className="role-badge" style={{ textTransform: 'capitalize' }}>
                  {adminData?.role === "superadmin" ? "Super Admin" : "Sub Admin"}
                </span>
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