// The quarterly profit share — see lib/profitShare.js for how each line is
// counted. GET ?quarter=2026-Q3 computes it; PUT saves who is paid what.
//
// Not cached: it walks one quarter of Stripe, a few times a year, and the
// figures it produces are the ones people get paid on.

import Stripe from "stripe";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { getManualOrders } from "../../../lib/manualOrders";
import {
  LINES,
  PRINT_COSTS,
  getProfitShareConfig,
  saveProfitShareConfig,
  validateConfig,
  quarterBounds,
  quarterSales,
  payouts,
} from "../../../lib/profitShare";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { quarter } = req.query;
    if (!quarterBounds(quarter)) return res.status(400).json({ error: "quarter must look like 2026-Q3" });
    const [config, manualOrders] = await Promise.all([getProfitShareConfig(), getManualOrders()]);
    const sales = await quarterSales({ stripe, manualOrders, quarter });
    return res.status(200).json({
      quarter,
      config,
      lineDefs: LINES,
      printCostDefs: PRINT_COSTS,
      ...payouts(sales, config),
      excluded: sales.excluded,
      notes: sales.notes,
    });
  }

  if (req.method === "PUT") {
    const error = validateConfig(req.body);
    if (error) return res.status(400).json({ error });
    const { unitCosts, payees } = req.body;
    const config = {
      unitCosts: Object.fromEntries(PRINT_COSTS.filter(({ id }) => unitCosts?.[id] !== undefined).map(({ id }) => [id, unitCosts[id]])),
      payees: payees.map((p) => ({ name: p.name.trim(), share: p.share, lines: p.lines })),
    };
    await saveProfitShareConfig(config);
    return res.status(200).json({ config });
  }

  return res.status(405).end();
}
