import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiTrash2, FiUserPlus, FiShield, FiUsers, FiEdit } from 'react-icons/fi'; // ✅ FiEdit add kiya hai

const CreateAdmin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ✅ Edit state track karne ke liye
  const [editId, setEditId] = useState<string | null>(null); 

  const API_BASE = "http://localhost:5000/api";

  const availablePermissions = [
    // Dashboard
    { id: 'dashboard', label: 'Analytics Overview' },
    { id: 'analytics', label: 'Website Traffic' },
    { id: 'orders', label: 'Order Management' },
    { id: 'returns', label: 'Return Requests' },
    
    // Inventory
    { id: 'products', label: 'All Products' },
    { id: 'add_product', label: 'Add Product' },
    { id: 'inventory', label: 'Stock & Sales' },
    { id: 'categories', label: 'Categories' },
    
    // Marketing
    { id: 'home_builder', label: 'Home Builder' },
    { id: 'banners', label: 'Banner Management' },
    { id: 'trust_banners', label: 'Trust & Factory Banners' },
    { id: 'whatsapp', label: 'WhatsApp Campaigns' },
    
    // Management
    { id: 'customers', label: 'Customer Database' },
    { id: 'reviews', label: 'Product Reviews' },
    { id: 'finance', label: 'Finance & Shipping' },
    { id: 'settings', label: 'Settings & Config' }
  ];

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE}/adminAuth/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(response.data);
    } catch (err) {
      console.error("Failed to fetch admins");
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCheckboxChange = (id: string) => {
    setPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // ✅ Edit button click handler
  const handleEditClick = (admin: any) => {
    setEditId(admin._id);
    setUsername(admin.username);
    setPermissions(admin.permissions || []);
    setPassword(''); // Edit mode mein password khali rakhenge
    setMessage('');
    setError('');
  };

  // ✅ Cancel Edit handler
  const cancelEdit = () => {
    setEditId(null);
    setUsername('');
    setPassword('');
    setPermissions([]);
    setMessage('');
    setError('');
  };

  // ✅ Submit Handler (Create aur Update dono ke liye)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      
      if (editId) {
        // 🔹 UPDATE LOGIC
        const updateData: any = { username, permissions };
        if (password) updateData.password = password; // Agar naya password dala hai tabhi bhejo

        await axios.put(
          `${API_BASE}/adminAuth/${editId}`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('Admin updated successfully!');
      } else {
        // 🔹 CREATE LOGIC
        await axios.post(
          `${API_BASE}/adminAuth/create`,
          { username, password, permissions },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('Sub-Admin created successfully!');
      }

      // Success ke baad form reset karo
      setTimeout(() => {
        cancelEdit(); 
        fetchAdmins(); 
      }, 1000);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving admin data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this admin?")) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE}/adminAuth/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdmins();
    } catch (err) {
      alert("Failed to delete admin");
    }
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      
      {/* Header Section */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ backgroundColor: '#4f46e5', padding: '12px', borderRadius: '12px', color: '#fff' }}>
          <FiShield size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Admin Management</h2>
          <p style={{ color: '#64748b', margin: '5px 0 0' }}>Create and manage access for your sub-admin team</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: Creation/Edit Form */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
            {editId ? <FiEdit color="#4f46e5" /> : <FiUserPlus color="#4f46e5" />}
            <h3 style={{ margin: 0, fontSize: '20px' }}>
              {editId ? 'Edit Sub-Admin' : 'Add New Sub-Admin'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                placeholder="Staff name"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Password {editId && <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>(Optional)</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={!editId} // Create ke time required, update ke time optional
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px' }}
                placeholder={editId ? "Leave blank to keep current password" : "••••••••"}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>Assign Permissions</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
                {availablePermissions.map(perm => (
                  <div 
                    key={perm.id} 
                    onClick={() => handleCheckboxChange(perm.id)}
                    style={{ 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid', 
                      borderColor: permissions.includes(perm.id) ? '#4f46e5' : '#e2e8f0',
                      backgroundColor: permissions.includes(perm.id) ? '#f5f3ff' : '#fff',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <input type="checkbox" checked={permissions.includes(perm.id)} readOnly />
                    {perm.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons UI change based on Edit Mode */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{ flex: 1, padding: '15px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
              >
                {loading ? 'Processing...' : (editId ? 'Update Admin' : 'Create Admin')}
              </button>

              {editId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  style={{ flex: 1, padding: '15px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                >
                  Cancel
                </button>
              )}
            </div>

            {message && <p style={{ color: '#059669', fontSize: '14px', textAlign: 'center' }}>{message}</p>}
            {error && <p style={{ color: '#dc2626', fontSize: '14px', textAlign: 'center' }}>{error}</p>}
          </form>
        </div>

        {/* Right Side: Existing Admins Table */}
        <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
            <FiUsers color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: '20px' }}>Current Admin Team</h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '12px', color: '#64748b', fontSize: '14px' }}>Username</th>
                <th style={{ padding: '12px', color: '#64748b', fontSize: '14px' }}>Permissions</th>
                <th style={{ padding: '12px', color: '#64748b', fontSize: '14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: editId === admin._id ? '#f8fafc' : 'transparent' }}>
                  <td style={{ padding: '15px', fontWeight: '600' }}>{admin.username}</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {admin.permissions.map((p: string) => (
                        <span key={p} style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '12px', textTransform: 'capitalize' }}>
                          {p.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      {/* ✅ Edit Button */}
                      <button 
                        onClick={() => handleEditClick(admin)}
                        title="Edit Admin"
                        style={{ background: '#e0e7ff', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <FiEdit size={16} />
                      </button>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDelete(admin._id)}
                        title="Delete Admin"
                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No sub-admins found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default CreateAdmin;