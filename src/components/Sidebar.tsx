import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IconType } from "react-icons";
import {
  FiLayout,
  FiGrid,
  FiBox,
  FiUser,
  FiPlusSquare,
  FiImage,
  FiLogOut,
  FiShoppingCart,
  FiMessageSquare,
} from "react-icons/fi";
import "../styles/Sidebar.css";

interface SidebarItem {
  path: string;
  name: string;
  icon: IconType;
  exact?: boolean;
}

interface SidebarProps {
  sidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, closeSidebar }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const sidebarItems: SidebarItem[] = [
    { path: "/admin/dashboard", name: "Dashboard", icon: FiLayout, exact: true },
    { path: "/admin/categories", name: "Categories", icon: FiGrid },
    { path: "/admin/products", name: "Products", icon: FiBox },
    { path: "/admin/products/new", name: "Add Product", icon: FiPlusSquare },
    { path: "/admin/banners", name: "Banner List", icon: FiImage },
    { path: "/admin/banners/upload", name: "Add Banner", icon: FiImage },
    { path: "/admin/orders", name: "Orders", icon: FiShoppingCart },
    { path: "/admin/registrations", name: "User Registrations", icon: FiUser },
    { path: "/admin/whatsapp", name: "WhatsApp", icon: FiMessageSquare },
  ];

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("adminToken");
      navigate("/admin/login");
    }
    closeSidebar(); // auto-close on logout too
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        {/* ✅ Cloudinary Logo */}
        <img
          src="https://res.cloudinary.com/dpdecxqb9/image/upload/v1758783697/bafnatoys/lwccljc9kkosfv9wnnrq.png"
          alt="Bafna Toys Logo"
          className="sidebar-logo"
        />
      </div>

      <nav className="sidebar-nav">
        {sidebarItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${isActive(item.path, item.exact) ? "active" : ""}`}
            onClick={closeSidebar}   // ✅ auto-close on link click
          >
            <item.icon className="sidebar-icon" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-button" onClick={handleLogout}>
          <FiLogOut className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
