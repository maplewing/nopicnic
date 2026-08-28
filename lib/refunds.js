// Stripe records a refund as an amount, not a flag, and the two kinds of refund
// mean opposite things. A charge refunded in full is a cancelled order: it does
// not ship, does not count as revenue, and must never ask the customer how they
// liked it. A partial refund is a price adjustment on an order that still
// stands — it still ships, still counts, still earns a review request.
//
// Testing `amount_refunded > 0` conflates the two, which is how a $1 adjustment
// on an $86 order dropped that order out of the admin panel, the unshipped
// alert, and the revenue figures all at once, while its confirmation email had
// already gone out.

function chargeFor(session) {
  const intent = typeof session?.payment_intent === "object" ? session.payment_intent : null;
  const latest = intent?.latest_charge;
  // Unexpanded, latest_charge is an id string and there is nothing to read. Say
  // "not refunded" rather than guess — the same answer the old check gave.
  return typeof latest === "object" && latest !== null ? latest : null;
}

// Dollars taken back off the charge, 0 when nothing was refunded.
export function refundedAmount(session) {
  return (chargeFor(session)?.amount_refunded || 0) / 100;
}

// True only for a charge refunded down to nothing — the cancelled-order case.
export function isFullyRefunded(session) {
  const charge = chargeFor(session);
  if (!charge) return false;
  return charge.amount_refunded > 0 && charge.amount_refunded >= charge.amount;
}
