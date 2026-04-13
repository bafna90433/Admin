import React, { useEffect, useState } from "react";
import api from "../utils/api";
import "../styles/CODSettings.css";

const CODSettings: React.FC = () => {
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= FETCH SETTINGS ================= */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/settings/cod`);
        setAdvanceAmount(res.data?.advanceAmount || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  /* ================= SAVE SETTINGS ================= */
  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");

      await api.put(`/settings/cod`, { advanceAmount });

      setMessage("✅ COD advance amount saved");
    } catch (err) {
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
            <p
              className={`status ${
                message.startsWith("✅") ? "success" : "error"
              }`}
            >
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CODSettings;