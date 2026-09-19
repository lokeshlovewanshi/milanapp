const badge = (background, color) => ({
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background,
  color,
  fontSize: "11px",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

/** A compact, explicit account-state summary for admin list tables. */
export default function AccountStatus({ profile }) {
  const deleted = Boolean(profile.deleted || profile.deletedAt);
  const blocked = Boolean(profile.blocked);
  const approved = Boolean(profile.verified);
  const emailVerified = Boolean(profile.emailVerified);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
      <span style={deleted ? badge("#FEE2E2", "#991B1B") : blocked ? badge("#FEF3C7", "#92400E") : badge("#DCFCE7", "#166534")}>
        {deleted ? "Deleted" : blocked ? "Blocked" : "Active"}
      </span>
      <span style={approved ? badge("#DBEAFE", "#1D4ED8") : badge("#FEF3C7", "#92400E")}>
        {approved ? "Profile approved" : "Under review"}
      </span>
      <span style={emailVerified ? badge("#DCFCE7", "#166534") : badge("#F3F4F6", "#4B5563")}>
        {emailVerified ? "Email verified" : "Email unverified"}
      </span>
    </div>
  );
}
