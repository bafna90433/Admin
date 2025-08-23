import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/AdminLayout.css";

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Sidebar (fixed = rock stable) */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <Sidebar />
      </aside>

      {/* Mobile overlay (click to close) */}
      {sidebarOpen && (
        <button
          className="overlay"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="main-content">
        {/* Simple mobile header for toggle */}
        <div className="mobile-header">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <h2 className="mobile-title">Admin Panel</h2>
        </div>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
