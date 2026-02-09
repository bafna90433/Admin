import React, { useEffect, useState } from "react";
import "../styles/CODSettings.css";

const API_BASE: string | undefined = (import.meta as any).env?.VITE_API_URL;

if (!API_BASE) {
  throw new Error("VITE_API_URL missing in production env.");
}

const CODSettings: React.FC = () => {
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/settings/cod`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setAdvanceAmount(Number(data?.advanceAmount || 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/settings/cod`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ advanceAmount: Number(advanceAmount) }),
      });

      if (!res.ok) throw new Error("Save failed");
      setMessage("✅ COD advance amount saved");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to save COD advance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cod-settings">
      <h2>💰 COD Settings</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <label>Advance Amount (₹)</label>
          <input
            type="number"
            min={0}
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            placeholder="Enter advance amount"
          />

          <button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {message && (
            <p className={`status ${message.startsWith("✅") ? "success" : "error"}`}>
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CODSettings;
