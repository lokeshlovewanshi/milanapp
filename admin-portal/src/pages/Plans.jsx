import { useState, useEffect } from "react";
import { api } from "../api";

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: "",
    durationMonths: 3,
    priceRupees: 0,
    discountPriceRupees: "",
    freeOnSignup: false,
    active: true,
    offerStartsAt: "",
    offerEndsAt: "",
    sortOrder: 0,
    features: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [plansData, membershipsData] = await Promise.all([
        api.listPlans(),
        api.listMemberships(0, 15).catch(() => ({ content: [] })),
      ]);
      setPlans(plansData || []);
      setMemberships(membershipsData?.content || []);
    } catch (err) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleEditClick(plan) {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || "",
      durationMonths: plan.durationMonths || 3,
      priceRupees: plan.priceRupees ?? 0,
      discountPriceRupees:
        plan.discountPriceRupees !== null &&
        plan.discountPriceRupees !== undefined
          ? plan.discountPriceRupees
          : "",
      freeOnSignup: Boolean(plan.freeOnSignup),
      active: Boolean(plan.active),
      offerStartsAt: plan.offerStartsAt ? plan.offerStartsAt.slice(0, 16) : "",
      offerEndsAt: plan.offerEndsAt ? plan.offerEndsAt.slice(0, 16) : "",
      sortOrder: plan.sortOrder ?? 0,
      features: plan.features || "",
    });
  }

  async function handleSavePlan(e) {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const payload = {
        name: formData.name,
        durationMonths: Number(formData.durationMonths),
        priceRupees: Number(formData.priceRupees),
        discountPriceRupees:
          formData.discountPriceRupees === "" ||
          formData.discountPriceRupees === null
            ? -1
            : Number(formData.discountPriceRupees),
        freeOnSignup: Boolean(formData.freeOnSignup),
        active: Boolean(formData.active),
        offerStartsAt: formData.offerStartsAt ? formData.offerStartsAt : null,
        offerEndsAt: formData.offerEndsAt ? formData.offerEndsAt : null,
        sortOrder: Number(formData.sortOrder),
        features: formData.features,
      };

      await api.updatePlan(editingPlan.id, payload);
      setSuccessMsg(`Successfully updated ${formData.name} plan!`);
      setEditingPlan(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetFreeSignup(plan) {
    if (
      !window.confirm(
        `Are you sure you want to set the ${plan.name} (${plan.durationMonths} Months) plan as the active FREE Signup Offer for new users?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");
      await api.setFreeSignupOffer(plan.id);
      setSuccessMsg(
        `Set ${plan.name} Plan as the active Free Signup welcome offer!`,
      );
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to set free signup offer");
    } finally {
      setLoading(false);
    }
  }

  const tierColors = {
    bronze: {
      bg: "#FFF4ED",
      border: "#FDBA74",
      text: "#9A3412",
      badge: "🥉 BRONZE",
    },
    silver: {
      bg: "#F8FAFC",
      border: "#CBD5E1",
      text: "#334155",
      badge: "🥈 SILVER",
    },
    gold: {
      bg: "#FEFCE8",
      border: "#FDE047",
      text: "#854D0E",
      badge: "🥇 GOLD",
    },
  };

  return (
    <div className="plans-page">
      <div className="page-header">
        <div>
          <h2>Membership Plans & Offers Management</h2>
          <p className="muted">
            Configure Bronze, Silver, and Gold plans, pricing, promotional
            discounts, and the active Free Signup Welcome Offer.
          </p>
        </div>
        <button className="secondary" onClick={loadData} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {error && <div className="card error-banner">{error}</div>}
      {successMsg && <div className="card success-banner">{successMsg}</div>}

      {/* 3 Plans Overview Cards */}
      <h3 style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        Available Plans (All grant equal full access)
      </h3>

      {loading && !plans.length ? (
        <div className="card">Loading plans...</div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => {
            const tierStyle = tierColors[plan.tier] || tierColors.gold;
            const isFree = plan.freeOnSignup && plan.isOfferActive;
            const hasDiscount =
              plan.discountPriceRupees !== null &&
              plan.discountPriceRupees !== undefined &&
              plan.discountPriceRupees < plan.priceRupees;

            return (
              <div
                key={plan.id}
                className={`card plan-card ${isFree ? "active-offer-card" : ""}`}
                style={{ borderColor: isFree ? "#A8442F" : tierStyle.border }}
              >
                <div className="plan-card-header">
                  <span
                    className="tier-badge"
                    style={{
                      backgroundColor: tierStyle.bg,
                      color: tierStyle.text,
                      borderColor: tierStyle.border,
                    }}
                  >
                    {tierStyle.badge}
                  </span>
                  {isFree && (
                    <span className="free-signup-badge">
                      🎁 Active Free Signup Offer
                    </span>
                  )}
                  {!plan.active && (
                    <span className="inactive-badge">Inactive</span>
                  )}
                </div>

                <h3 className="plan-name">{plan.name} Plan</h3>
                <div className="plan-duration">
                  ⏱️ {plan.durationMonths} Months Duration
                </div>

                {/* Price block */}
                <div className="plan-pricing">
                  {isFree ? (
                    <div>
                      <span className="price-free">FREE ₹0</span>
                      <span className="price-strikethrough">
                        ₹{plan.priceRupees}
                      </span>
                    </div>
                  ) : hasDiscount ? (
                    <div>
                      <span className="price-current">
                        ₹{plan.discountPriceRupees}
                      </span>
                      <span className="price-strikethrough">
                        ₹{plan.priceRupees}
                      </span>
                      {plan.savingsPercentage > 0 && (
                        <span className="savings-tag">
                          Save {plan.savingsPercentage}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="price-current">₹{plan.priceRupees}</span>
                    </div>
                  )}
                  <div className="per-month-text">
                    ₹
                    {Math.round(
                      (isFree
                        ? 0
                        : (plan.discountPriceRupees ?? plan.priceRupees)) /
                        (plan.durationMonths || 1),
                    )}
                    /month
                  </div>
                </div>

                {/* Access privilege note */}
                <div className="plan-access-note">
                  ✅ <strong>Full Access:</strong> Direct Mobile & WhatsApp
                  Contact Numbers, 36 Guna Kundali Milan, Unlimited Connections.
                </div>

                {/* Actions */}
                <div className="plan-actions">
                  <button
                    className={isFree ? "secondary" : "primary"}
                    disabled={isFree || !plan.active}
                    onClick={() => handleSetFreeSignup(plan)}
                    title="Set this plan as the automatic free welcome plan on signup"
                  >
                    {isFree ? "✓ Active Signup Offer" : "Make Free on Signup"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleEditClick(plan)}
                  >
                    ✏️ Edit Pricing
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                Edit {editingPlan.name} Plan ({editingPlan.durationMonths}M)
              </h3>
              <button
                className="close-btn"
                onClick={() => setEditingPlan(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="modal-form">
              <div className="form-grid">
                <label>
                  <span>Plan Name</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Duration (Months)</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={formData.durationMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMonths: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Base Price (₹ INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.priceRupees}
                    onChange={(e) =>
                      setFormData({ ...formData, priceRupees: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Discounted / Offer Price (₹ INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Leave blank for no discount (0 for Free)"
                    value={formData.discountPriceRupees}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountPriceRupees: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Offer Start Date</span>
                  <input
                    type="datetime-local"
                    value={formData.offerStartsAt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        offerStartsAt: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Offer End Date</span>
                  <input
                    type="datetime-local"
                    value={formData.offerEndsAt}
                    onChange={(e) =>
                      setFormData({ ...formData, offerEndsAt: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="checkbox-row" style={{ marginTop: "1rem" }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.freeOnSignup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        freeOnSignup: e.target.checked,
                      })
                    }
                  />
                  <span>
                    <strong>
                      🎁 Automatically grant Free on New User Signup
                    </strong>
                  </span>
                </label>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                  />
                  <span>Active &amp; Offered to Users</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Member Subscriptions Table */}
      <h3 style={{ marginTop: "2.5rem", marginBottom: "0.75rem" }}>
        Recent Member Subscriptions &amp; Activations
      </h3>
      <div className="card table-container">
        {memberships.length === 0 ? (
          <p className="muted">No recent memberships found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lodha ID</th>
                <th>Member Name</th>
                <th>Email / Mobile</th>
                <th>Plan Activated</th>
                <th>Source</th>
                <th>Status</th>
                <th>Activated Date</th>
                <th>Expires Date</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.userGmId || `GM${m.userProfileId}`}</strong>
                  </td>
                  <td>{m.userName || "Member"}</td>
                  <td>
                    <div className="small">{m.userEmail}</div>
                    {m.userMobile && (
                      <div className="small muted">📞 {m.userMobile}</div>
                    )}
                  </td>
                  <td>
                    <span className="tier-tag">
                      {m.planName || "Membership"} ({m.durationMonths || 12}M)
                    </span>
                  </td>
                  <td>
                    <span className="source-tag">{m.source}</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${m.current ? "status-active" : "status-expired"}`}
                    >
                      {m.current ? "Active" : m.status}
                    </span>
                  </td>
                  <td className="small">
                    {m.startsAt
                      ? new Date(m.startsAt).toLocaleDateString("en-IN")
                      : "-"}
                  </td>
                  <td className="small">
                    {m.expiresAt
                      ? new Date(m.expiresAt).toLocaleDateString("en-IN")
                      : "Lifetime"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
