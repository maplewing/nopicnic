import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return "$" + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShort(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const PALETTE = {
  sacramento: "#162114",
  pine: "#294122",
  salmon: "#FFBBA6",
  tangerine: "#EB3D00",
  chiffon: "#FFEDD2",
};

// Per-stage funnel colors (fill + text colors)
// Dark fills (sacramento, pine, tangerine) → chiffon text
// Light fills (salmon, chiffon) → sacramento text
const FUNNEL_COLORS = [
  { fill: PALETTE.sacramento, text: PALETTE.chiffon,    sub: "rgba(255,237,210,0.5)" },
  { fill: PALETTE.pine,       text: PALETTE.chiffon,    sub: "rgba(255,237,210,0.5)" },
  { fill: PALETTE.salmon,     text: PALETTE.sacramento, sub: "rgba(22,33,20,0.5)" },
  { fill: PALETTE.tangerine,  text: PALETTE.chiffon,    sub: "rgba(255,237,210,0.5)" },
  { fill: PALETTE.chiffon,    text: PALETTE.sacramento, sub: "rgba(22,33,20,0.5)" },
];

// ─── Funnel Chart ────────────────────────────────────────────────────────────

function FunnelChart({ stages }) {
  if (!stages.length) {
    return (
      <p style={{ color: "#999", fontSize: 13 }}>
        No data yet — funnel appears after your first tracked visitor.
      </p>
    );
  }
  const maxCount = stages[0].count || 1;
  const W = 700;
  const H = 120;
  const LABEL_H = 28;
  const stageW = W / stages.length;
  const heightFor = (n) => Math.max(0.15, n / maxCount) * H;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H + LABEL_H}`}
      style={{ display: "block" }}
    >
      {stages.map((stage, i) => {
        const leftH = heightFor(stage.count);
        const rightH =
          i < stages.length - 1 ? heightFor(stages[i + 1].count) : leftH * 0.82;
        const x = i * stageW;
        const topLeft  = H / 2 - leftH  / 2;
        const botLeft  = H / 2 + leftH  / 2;
        const topRight = H / 2 - rightH / 2;
        const botRight = H / 2 + rightH / 2;
        const pts = `${x},${topLeft} ${x + stageW},${topRight} ${x + stageW},${botRight} ${x},${botLeft}`;
        const pct =
          i > 0 && maxCount > 0
            ? Math.round((stage.count / maxCount) * 100) + "%"
            : null;
        const { fill, text } = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        const cx = x + stageW / 2;

        return (
          <g key={stage.label}>
            <polygon points={pts} fill={fill} />
            <text
              x={cx}
              y={H / 2 + 6}
              textAnchor="middle"
              fill={text}
              fontSize={15}
              fontFamily="var(--font-body),'Courier New',monospace"
            >
              {stage.count.toLocaleString()}
              {pct ? `  ${pct}` : ""}
            </text>
            <text
              x={cx}
              y={H + 18}
              textAnchor="middle"
              fill={PALETTE.sacramento}
              fontSize={7}
              fontWeight={700}
              fontFamily="var(--font-display),'Helvetica Neue',sans-serif"
              letterSpacing="1.5"
            >
              {stage.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Chart Components ────────────────────────────────────────────────────────

function BarChart({ data, valueKey, color = "#111", height = 100 }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return <div style={{ height, lineHeight: height + "px", textAlign: "center", color: "#aaa", fontSize: 12 }}>No data yet</div>;

  const values = data.map((d) => d[valueKey] || 0);
  const max = Math.max(...values, 0.01);
  const W = 600;
  const barW = Math.max(4, Math.floor(W / data.length) - 2);

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${height}`}
        style={{ display: "block", overflow: "visible" }}
      >
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const barH = (val / max) * (height - 4);
          const x = i * (W / data.length);
          const y = height - barH;
          return (
            <rect
              key={d.date}
              x={x + 1}
              y={y}
              width={barW}
              height={barH}
              fill={color}
              opacity={0.85}
              style={{ cursor: "default" }}
              onMouseEnter={() => setTooltip({ i, d, val })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </svg>
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${(tooltip.i / data.length) * 100}%`,
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            fontSize: 11,
            padding: "4px 8px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {fmtShort(tooltip.d.date)}: {valueKey === "revenue" ? fmt(tooltip.val) : tooltip.val}
        </div>
      )}
      {/* X-axis labels every ~7 days */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
          .map((d) => (
            <span key={d.date} style={{ fontSize: 10, color: "#999" }}>
              {fmtShort(d.date)}
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      <div style={s.cardValue}>{value}</div>
      {sub && <div style={s.cardSub}>{sub}</div>}
    </div>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

function OrdersTable({ orders }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("90");

  const cutoff = Date.now() - parseInt(filter) * 86400000;
  const filtered = orders.filter((o) => new Date(o.date).getTime() >= cutoff);

  if (orders.length === 0) {
    return <p style={{ color: "#999", fontSize: 13 }}>No orders found in this period.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span style={s.sectionLabel}>Show:</span>
        {[["30", "30 days"], ["90", "90 days"], ["365", "1 year"]].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{ ...s.filterBtn, ...(filter === v ? s.filterBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
          {filtered.length} order{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              {["Order #", "Date", "Customer", "Items", "Subtotal", "Tax", "Ship", "Total"].map((h) => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <>
                <tr
                  key={order.stripeSessionId}
                  style={{ ...s.tr, cursor: "pointer" }}
                  onClick={() =>
                    setExpanded(expanded === order.stripeSessionId ? null : order.stripeSessionId)
                  }
                >
                  <td style={s.td}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {order.orderNumber ? `#${order.orderNumber}` : "—"}
                    </span>
                  </td>
                  <td style={s.td}>{fmtDate(order.date)}</td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 500 }}>{order.customer.name || "—"}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{order.customer.email}</div>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12, color: "#444" }}>
                      {order.items.map((it) => `${it.name}${it.quantity > 1 ? ` ×${it.quantity}` : ""}`).join(", ") || "—"}
                    </span>
                  </td>
                  <td style={s.tdNum}>{fmt(order.subtotal)}</td>
                  <td style={s.tdNum}>{order.tax > 0 ? fmt(order.tax) : "—"}</td>
                  <td style={s.tdNum}>{order.shippingCost > 0 ? fmt(order.shippingCost) : "—"}</td>
                  <td style={{ ...s.tdNum, fontWeight: 600 }}>{fmt(order.total)}</td>
                </tr>
                {expanded === order.stripeSessionId && (
                  <tr key={order.stripeSessionId + "-detail"}>
                    <td colSpan={8} style={s.expandedCell}>
                      <div style={s.expandedContent}>
                        <div>
                          <div style={s.expandLabel}>Ship to</div>
                          {order.shipping.address ? (
                            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                              {order.shipping.name && <div>{order.shipping.name}</div>}
                              <div>{order.shipping.address.line1}</div>
                              {order.shipping.address.line2 && <div>{order.shipping.address.line2}</div>}
                              <div>
                                {order.shipping.address.city}, {order.shipping.address.state}{" "}
                                {order.shipping.address.postal_code}
                              </div>
                              <div>{order.shipping.address.country}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "#999" }}>No address (digital)</span>
                          )}
                        </div>
                        <div>
                          <div style={s.expandLabel}>Line items</div>
                          {order.items.map((it, i) => (
                            <div key={i} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 32 }}>
                              <span>{it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ""}</span>
                              <span style={{ fontFamily: "monospace" }}>{fmt(it.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={s.expandLabel}>Stripe</div>
                          <a
                            href={`https://dashboard.stripe.com/payments/${order.stripeSessionId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: "#5469d4" }}
                          >
                            View in Stripe ↗
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Inventory Table ──────────────────────────────────────────────────────────

function InventoryTable({ products, onToggle }) {
  const [pending, setPending] = useState({});

  async function handleToggle(id, currentVal) {
    setPending((p) => ({ ...p, [id]: true }));
    await onToggle(id, !currentVal);
    setPending((p) => ({ ...p, [id]: false }));
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
        Stock changes commit to GitHub and redeploy in ~30 seconds.
      </p>
      <table style={s.table}>
        <thead>
          <tr>
            {["Product", "Price", "Weight", "Type", "In Stock"].map((h) => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} style={s.tr}>
              <td style={s.td}>
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{p.id}</div>
              </td>
              <td style={s.td}>{fmt(p.price)}</td>
              <td style={s.td}>
                {p.productWeightOz ? `${p.productWeightOz} oz` : "—"}
              </td>
              <td style={s.td}>
                <span style={{ fontSize: 11, color: "#888" }}>
                  {p.isDigital ? "Digital" : p.isService ? "Service" : "Physical"}
                </span>
              </td>
              <td style={s.td}>
                <button
                  onClick={() => handleToggle(p.id, p.inStock)}
                  disabled={pending[p.id]}
                  style={{
                    ...s.toggleBtn,
                    background: p.inStock ? PALETTE.pine : "#e0e0e0",
                    color: p.inStock ? PALETTE.chiffon : "#666",
                    opacity: pending[p.id] ? 0.5 : 1,
                  }}
                >
                  {pending[p.id] ? "…" : p.inStock ? "In Stock" : "Out of Stock"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sales by Product Table ───────────────────────────────────────────────────

function SalesByProductTable({ orders }) {
  const [period, setPeriod] = useState("month");

  const cutoffMs = { week: 7, month: 30, year: 365, all: Infinity }[period] * 86400000;
  const now = Date.now();
  const filtered = orders.filter((o) =>
    period === "all" ? true : now - new Date(o.date).getTime() <= cutoffMs
  );

  const byProduct = {};
  for (const order of filtered) {
    for (const item of order.items) {
      if (!byProduct[item.name]) byProduct[item.name] = { units: 0, revenue: 0 };
      byProduct[item.name].units += item.quantity || 1;
      byProduct[item.name].revenue += item.amount || 0;
    }
  }
  const rows = Object.entries(byProduct)
    .map(([name, { units, revenue }]) => ({ name, units, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {[["week", "Week"], ["month", "Month"], ["year", "Year"], ["all", "All time"]].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setPeriod(v)}
            style={{ ...s.filterBtn, ...(period === v ? s.filterBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p style={{ color: "#999", fontSize: 13 }}>No orders in this period.</p>
      ) : (
        <table style={{ ...s.table, tableLayout: "auto" }}>
          <thead>
            <tr>
              <th style={s.th}>Product</th>
              <th style={{ ...s.th, textAlign: "right" }}>Units sold</th>
              <th style={{ ...s.th, textAlign: "right" }}>Revenue</th>
              <th style={{ ...s.th, width: 200 }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, units, revenue }) => (
              <tr key={name} style={s.tr}>
                <td style={s.td}>{name}</td>
                <td style={s.tdNum}>{units}</td>
                <td style={s.tdNum}>{fmt(revenue)}</td>
                <td style={s.td}>
                  <div style={{
                    height: 6,
                    background: PALETTE.tangerine,
                    width: `${totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0}%`,
                    minWidth: 2,
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Top Pages Table ──────────────────────────────────────────────────────────

function TopPagesTable({ pages }) {
  if (!pages || pages.length === 0) {
    return <p style={{ color: "#999", fontSize: 13 }}>No page view data yet. Data will appear after your first tracked visit.</p>;
  }
  const max = pages[0]?.views || 1;
  return (
    <table style={{ ...s.table, tableLayout: "auto" }}>
      <thead>
        <tr>
          <th style={s.th}>Page</th>
          <th style={{ ...s.th, textAlign: "right" }}>Views</th>
          <th style={{ ...s.th, width: 200 }}>Share</th>
        </tr>
      </thead>
      <tbody>
        {pages.map(({ page, views }) => (
          <tr key={page} style={s.tr}>
            <td style={{ ...s.td, fontFamily: "monospace", fontSize: 12 }}>{page}</td>
            <td style={{ ...s.tdNum }}>{views}</td>
            <td style={s.td}>
              <div
                style={{
                  height: 6,
                  background: PALETTE.pine,
                  width: `${(views / max) * 100}%`,
                  minWidth: 2,
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ordersRes, analyticsRes, inventoryRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/orders?days=365"),
        fetch("/api/admin/analytics?days=30"),
        fetch("/api/admin/inventory"),
      ]);
      if (!statsRes.ok || !ordersRes.ok) throw new Error("Failed to load data");
      const [statsData, ordersData, analyticsData, inventoryData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
        analyticsRes.ok ? analyticsRes.json() : { daily: [], topPages: [], totalViews: 0 },
        inventoryRes.ok ? inventoryRes.json() : { products: [] },
      ]);
      setStats(statsData);
      setOrders(ordersData.orders);
      setAnalytics(analyticsData);
      setInventory(inventoryData.products);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" }).catch(() => {});
    document.cookie = "npp-admin-session=; Path=/; Max-Age=0";
    router.push("/admin/login");
  }

  async function handleInventoryToggle(productId, newValue) {
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, inStock: newValue }),
    });
    if (res.ok) {
      setInventory((inv) =>
        inv.map((p) => (p.id === productId ? { ...p, inStock: newValue } : p))
      );
    } else {
      const err = await res.json();
      alert("Error: " + err.error);
    }
  }

  return (
    <>
      <Head>
        <title>Admin — No Picnic Press</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div style={s.root}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img
                src="/images/npp-logo.png"
                alt="No Picnic Press"
                style={{ height: 22, filter: "invert(1)", display: "block" }}
              />
              <span style={s.headerAdmin}>Admin</span>
            </div>
            <button onClick={handleLogout} style={s.logoutBtn}>Sign out</button>
          </div>
        </header>

        <div style={s.body}>
          {/* Tab nav */}
          <nav style={s.tabNav}>
            {[["overview", "Overview"], ["orders", "Orders"], ["inventory", "Inventory"]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{ ...s.tabBtn, ...(tab === id ? s.tabBtnActive : {}) }}
              >
                {label}
              </button>
            ))}
          </nav>

          {loading && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#999", fontSize: 13 }}>
              Loading…
            </div>
          )}

          {error && (
            <div style={{ background: "#fff0f0", border: "1px solid #f5c0c0", padding: 16, fontSize: 13, color: "#c00", marginBottom: 24 }}>
              Error: {error}
              <button onClick={fetchAll} style={{ marginLeft: 12, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "#c00", fontSize: 13 }}>
                Retry
              </button>
            </div>
          )}

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {!loading && stats && tab === "overview" && (
            <div>
              {/* KPI row */}
              <div style={s.kpiGrid}>
                <StatCard
                  label="Revenue today"
                  value={fmt(stats.periods.today.revenue)}
                  sub={`${stats.periods.today.orders} order${stats.periods.today.orders !== 1 ? "s" : ""}`}
                />
                <StatCard
                  label="Revenue this week"
                  value={fmt(stats.periods.week.revenue)}
                  sub={`${stats.periods.week.orders} orders`}
                />
                <StatCard
                  label="Revenue this month"
                  value={fmt(stats.periods.month.revenue)}
                  sub={`${stats.periods.month.orders} orders`}
                />
                <StatCard
                  label="Avg order value"
                  value={fmt(stats.totals.avgOrderValue)}
                  sub="30 days"
                />
                <StatCard
                  label="Checkout conv. rate"
                  value={`${stats.funnel.conversionRate}%`}
                  sub={`${stats.funnel.checkoutsCompleted} / ${stats.funnel.checkoutsStarted} sessions`}
                />
                <StatCard
                  label="Add to cart (30 days)"
                  value={analytics?.totalAddToCart ?? "—"}
                  sub="tracked events"
                />
              </div>

              {/* Conversion funnel */}
              {(() => {
                const visitors = analytics?.totalSessions || 0;
                const bounced = analytics?.bouncedSessions || 0;
                const addToCart = analytics?.totalAddToCart || 0;
                const started = stats.funnel.checkoutsStarted;
                const completed = stats.funnel.checkoutsCompleted;
                const stages = [
                  visitors > 0 && { label: "Visitors", count: visitors },
                  visitors > 0 && { label: "Non-bounced", count: visitors - bounced },
                  addToCart > 0 && { label: "Add to cart", count: addToCart },
                  started > 0 && { label: "Checkout started", count: started },
                  { label: "Completed", count: completed },
                ].filter(Boolean);
                return (
                  <div style={s.funnelCard}>
                    <div style={s.chartTitle}>Conversion funnel — 30 days</div>
                    <FunnelChart stages={stages} />
                    {parseFloat(stats.funnel.conversionRate) < 40 && started > 3 && (
                      <p style={s.funnelTip}>
                        Tip: A checkout conv. rate under 40% often indicates shipping cost surprise or checkout friction.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Charts */}
              <div style={s.chartsGrid}>
                <div style={s.chartCard}>
                  <div style={s.chartTitle}>Revenue — last 30 days</div>
                  <BarChart data={stats.daily} valueKey="revenue" color={PALETTE.tangerine} />
                </div>
                <div style={s.chartCard}>
                  <div style={s.chartTitle}>Page views — last 30 days</div>
                  {analytics && analytics.daily.length > 0 ? (
                    <BarChart data={analytics.daily} valueKey="totalViews" color={PALETTE.pine} />
                  ) : (
                    <div style={{ fontSize: 12, color: "#aaa", paddingTop: 8 }}>
                      No data yet — tracking will start after your next visit to the site.
                    </div>
                  )}
                </div>
              </div>

              {/* Top pages */}
              <div style={s.section}>
                <h2 style={s.sectionHeading}>Top pages (30 days)</h2>
                {analytics && <TopPagesTable pages={analytics.topPages} />}
              </div>

              {/* Sales by product */}
              <div style={s.section}>
                <h2 style={s.sectionHeading}>Sales by product</h2>
                {orders && orders.length > 0 ? (
                  <SalesByProductTable orders={orders} />
                ) : (
                  <p style={{ color: "#999", fontSize: 13 }}>No orders yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS TAB ──────────────────────────────────────────────── */}
          {!loading && orders && tab === "orders" && (
            <div style={s.section}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <h2 style={s.sectionHeading}>Orders</h2>
                {orders.some((o) => o.orderNumber === null) && (
                  <span style={{ fontSize: 12, color: "#999" }}>
                    Orders without a # were placed before the dashboard was installed. New orders auto-number from #{" "}
                    {Math.max(...orders.filter((o) => o.orderNumber !== null).map((o) => o.orderNumber), 2683) + 1}.
                  </span>
                )}
              </div>
              <OrdersTable orders={orders} />
            </div>
          )}

          {/* ── INVENTORY TAB ────────────────────────────────────────────── */}
          {!loading && inventory && tab === "inventory" && (
            <div style={s.section}>
              <h2 style={s.sectionHeading}>Inventory</h2>
              <InventoryTable products={inventory} onToggle={handleInventoryToggle} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

AdminDashboard.noLayout = true;

// ─── Styles ──────────────────────────────────────────────────────────────────

const DISPLAY = "var(--font-display),'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "var(--font-body),'Courier New',Courier,monospace";

const s = {
  root: {
    minHeight: "100vh",
    background: "#f5f5f5",
    fontFamily: DISPLAY,
    color: "#111",
  },
  header: {
    background: "#111",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerAdmin: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    fontFamily: DISPLAY,
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 11,
    padding: "5px 12px",
    cursor: "pointer",
    fontFamily: DISPLAY,
    letterSpacing: "0.06em",
  },
  body: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 24px 80px",
  },
  tabNav: {
    display: "flex",
    gap: 0,
    marginBottom: 28,
    borderBottom: "1px solid #ddd",
  },
  tabBtn: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 18px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: DISPLAY,
    color: "#888",
    fontWeight: 500,
    marginBottom: -1,
    letterSpacing: "0.03em",
  },
  tabBtnActive: {
    color: "#111",
    borderBottomColor: PALETTE.tangerine,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    padding: "18px 20px",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#999",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 26,
    fontWeight: 400,
    fontFamily: MONO,
    letterSpacing: "-0.01em",
    lineHeight: 1,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  funnelCard: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    padding: "20px 24px",
    marginBottom: 24,
  },
  funnelTip: {
    fontSize: 12,
    color: "#666",
    background: "#fffbea",
    border: "1px solid #f5e7a0",
    padding: "8px 12px",
    marginTop: 16,
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "3fr 2fr",
    gap: 16,
    marginBottom: 24,
  },
  chartCard: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    padding: "18px 20px",
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#999",
    marginBottom: 12,
  },
  section: { marginBottom: 32 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#999",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#888",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    background: "#fff",
    border: "1px solid #e0e0e0",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#888",
    borderBottom: "1px solid #e0e0e0",
    background: "#fafafa",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "11px 14px",
    verticalAlign: "top",
    lineHeight: 1.4,
  },
  tdNum: {
    padding: "11px 14px",
    fontFamily: "monospace",
    textAlign: "right",
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  expandedCell: {
    padding: "0",
    background: "#fafafa",
    borderBottom: "1px solid #e0e0e0",
  },
  expandedContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 24,
    padding: "16px 20px",
  },
  expandLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#999",
    marginBottom: 6,
  },
  filterBtn: {
    background: "none",
    border: "1px solid #ddd",
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: DISPLAY,
    color: "#666",
  },
  filterBtnActive: {
    background: PALETTE.pine,
    color: PALETTE.chiffon,
    borderColor: PALETTE.pine,
  },
  toggleBtn: {
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    border: "none",
    cursor: "pointer",
    fontFamily: DISPLAY,
    transition: "opacity 0.15s",
  },
};
