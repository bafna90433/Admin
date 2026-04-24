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
  FiActivity,
  FiCornerUpLeft,
  FiTrendingUp,
  FiGrid,
  FiSettings,
  FiStar,
  FiShield,
  FiUserPlus,
  FiSmartphone,
  FiShoppingCart,
  FiDollarSign,
  FiTruck,
  FiSend,
} from "react-icons/fi";
import { MdOutlineSpaceDashboard } from "react-icons/md";
import { TbCategory } from "react-icons/tb";
import api from "../utils/api";
import "../styles/SidebarFinal.css";

interface SidebarProps {
  sidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, closeSidebar }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState<any>(null);
  const [summary, setSummary] = useState<any>({
    pendingOrders: 0,
    pendingReturns: 0,
    unapprovedCustomers: 0,
    activeAbandonedCarts: 0,
    lowStock: 0,
    visitorsToday: 0,
    newReviewsToday: 0,
  });

  const [seenCounts, setSeenCounts] = useState<any>(() => {
    const saved = localStorage.getItem("sidebarSeenCounts");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const storedData = localStorage.getItem("adminData");
    if (storedData) {
      setAdminData(JSON.parse(storedData));
    }

    const fetchSummary = async () => {
      try {
        const { data } = await api.get("/admin/summary");
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch sidebar summary:", err);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 60000); // Refresh every 60s
    return () => clearInterval(interval);
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

  const hasAccess = (requiredPermission: string) => {
    if (!adminData) return false;
    if (adminData.role === "superadmin") return true; 
    return adminData.permissions?.includes(requiredPermission);
  };

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
    badge = 0,
    badgeKey,
  }: {
    to: string;
    icon: any;
    label: string;
    gradient?: string;
    badge?: number;
    badgeKey?: string;
  }) => {
    const active = isActive(to);

    // Calculate effective badge count (only show if current > seen)
    const effectiveBadge = badgeKey && badge > (seenCounts[badgeKey] || 0) 
      ? badge - (seenCounts[badgeKey] || 0) 
      : 0;

    const handleClick = () => {
      closeSidebar();
      if (badgeKey) {
        const newSeen = { ...seenCounts, [badgeKey]: badge };
        setSeenCounts(newSeen);
        localStorage.setItem("sidebarSeenCounts", JSON.stringify(newSeen));
      }
    };

    return (
      <Link
        to={to}
        className={`nav-item-final ${active ? "active" : ""}`}
        onClick={handleClick}
        data-gradient={gradient}
      >
        <div className="nav-item-wrapper">
          <div className="nav-icon-wrapper">
            <Icon className="nav-icon-final" />
          </div>
          <span className="nav-label-final">{label}</span>
          {effectiveBadge > 0 && (
            <div className="nav-badge-final">
              {effectiveBadge > 99 ? "99+" : effectiveBadge}
            </div>
          )}
          {active && effectiveBadge === 0 && <ChevronIcon />}
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
              src="https://ik.imagekit.io/rishii/bafnatoys/Copy%20of%20Super_Car___05_vrkphh.webp?updatedAt=1775309336739&tr=w-120,h-120,f-auto,q-80"
              alt="Bafna Toys Logo"
              className="logo-image-final"
            />
          </div>

          <div className="brand-info-final">
            <p className="brand-subtitle-final">
              <span className="status-dot-final online" /> Admin Dashboard
            </p>
          </div>

          <button className="mobile-close-final" onClick={closeSidebar}>
            <FiX />
          </button>
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
                  badge={summary.visitorsToday}
                  badgeKey="visitorsToday"
                />
              )}

              {hasAccess("orders") && (
                <NavItem
                  to="/admin/orders"
                  icon={FiPackage}
                  label="Order Management"
                  gradient="blue"
                  badge={summary.pendingOrders}
                  badgeKey="pendingOrders"
                />
              )}

              {hasAccess("returns") && (
                <NavItem
                  to="/admin/returns"
                  icon={FiCornerUpLeft}
                  label="Return Requests"
                  gradient="red"
                  badge={summary.pendingReturns}
                  badgeKey="pendingReturns"
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
                  badge={summary.lowStock}
                  badgeKey="lowStock"
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
                  label="WhatsApp Widget"
                  gradient="green"
                />
              )}

              {hasAccess("whatsapp") && (
                <NavItem
                  to="/admin/campaigns"
                  icon={FiSend}
                  label="Bulk WhatsApp Campaigns"
                  gradient="green"
                />
              )}

              <NavItem
                to="/admin/mobile-control"
                icon={FiSmartphone}
                label="Mobile App UI"
                gradient="purple"
              />

              <NavItem
                to="/admin/meta-pixel"
                icon={FiTrendingUp}
                label="Meta Pixel (FB Ads)"
                gradient="blue"
              />

              <NavItem
                to="/admin/abandoned-carts"
                icon={FiShoppingCart}
                label="Abandoned Carts"
                gradient="pink"
                badge={summary.activeAbandonedCarts}
                badgeKey="activeAbandonedCarts"
              />
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
                  badge={summary.unapprovedCustomers}
                  badgeKey="unapprovedCustomers"
                />
              )}
              
              {hasAccess("reviews") && (
                <NavItem
                  to="/admin/reviews"
                  icon={FiStar}
                  label="Product Reviews"
                  gradient="yellow"
                  badge={summary.newReviewsToday}
                  badgeKey="newReviewsToday"
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

              {hasAccess("finance") && (
                <NavItem
                  to="/admin/transactions"
                  icon={FiDollarSign}
                  label="Razorpay Transactions"
                  gradient="green"
                />
              )}

              {hasAccess("finance") && (
                <NavItem
                  to="/admin/delhivery"
                  icon={FiTruck}
                  label="Delhivery Panel"
                  gradient="blue"
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