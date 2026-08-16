// When an order becomes eligible for the review request.
//
// The question is "has this reached the customer", not "has this been paid
// for", and the two came apart badly: an order that was never shipped still got
// a mail ten days later saying it had landed on the doorstep. A physical order
// now has to earn a delivery date before it qualifies at all.
//
// Separate from the cron that uses it so the arithmetic can be run against real
// orders without sending anything — see scripts/review-due.mjs.

const DAY_MS = 86400000;

// Long enough to have read some of it, short enough that the book is still the
// thing they'd talk about if asked.
export const REVIEW_DELAY_DAYS = 10;

// How long past that we're still willing to send. Enough to ride out a few
// missed cron runs or an arrival confirmed late; not enough for the mail to
// turn into a lie. It also bounds the damage of selecting on a delivery date
// rather than an order date: the eligible set now reaches back as far as the
// lookback, and orders predating the Redis sent-set aren't recorded in it, so
// without this a deploy could mail two months of customers at once.
export const REVIEW_GRACE_DAYS = 14;

// An arrived_at far enough past the ship date is not a delivery date.
// scripts/backfill-arrived.mjs stamped a batch of July orders with the day it
// ran — all eleven identical — and taken at face value that puts their arrival
// nineteen days after they shipped and makes month-old orders read as freshly
// delivered. Same bounds as the polling windows in lib/shipments.js: past these
// a domestic or international parcel is lost rather than in transit, so a stamp
// arriving later than this is bookkeeping, not delivery.
const PLAUSIBLE_TRANSIT_DAYS = { domestic: 14, international: 25 };

// When the arrival cron never confirmed delivery — Shippo tracking unavailable,
// or the parcel missing from the carrier's feed — assume it got there in about
// the usual time rather than never asking at all. Deliberately shorter than the
// windows in lib/shipments.js, which are about when to stop paying to poll.
const ASSUMED_TRANSIT_DAYS = { domestic: 5, international: 12 };

// When this order reached the customer, in ms — or null if it demonstrably
// hasn't yet, which is the one case that must not produce an email.
export function deliveredAt(session, kind) {
  // A download arrives with the receipt; a studio session is delivered by
  // happening. Neither waits on a label.
  if (kind !== "physical") return session.created * 1000;

  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const meta = intent?.metadata || {};

  // No ship date: the order isn't late for a review, it's late for a label,
  // which is api/drip/unshipped's problem.
  if (!meta.shipped_at) return null;

  const shipped = new Date(meta.shipped_at).getTime();
  if (!Number.isFinite(shipped)) return null;

  // Unknown destination gets the longer figures — better a review ask that
  // arrives a week late than one that beats the parcel.
  const domestic = session.shipping_details?.address?.country === "US";

  if (meta.arrived_at) {
    const arrived = new Date(meta.arrived_at).getTime();
    const plausible =
      (domestic ? PLAUSIBLE_TRANSIT_DAYS.domestic : PLAUSIBLE_TRANSIT_DAYS.international) * DAY_MS;
    // Arriving before it shipped is as broken as arriving three weeks late;
    // both mean the stamp is recording something other than a delivery.
    if (Number.isFinite(arrived) && arrived >= shipped && arrived - shipped <= plausible) {
      return arrived;
    }
  }

  const transit =
    (domestic ? ASSUMED_TRANSIT_DAYS.domestic : ASSUMED_TRANSIT_DAYS.international) * DAY_MS;
  return shipped + transit;
}

// status is one of: "due", "not-delivered", "too-early", "too-late".
export function reviewStatus(session, kind, now = Date.now()) {
  const delivered = deliveredAt(session, kind);
  if (delivered === null) return { status: "not-delivered", eligibleAt: null };

  const eligibleAt = delivered + REVIEW_DELAY_DAYS * DAY_MS;
  if (now < eligibleAt) return { status: "too-early", eligibleAt };
  if (now > eligibleAt + REVIEW_GRACE_DAYS * DAY_MS) return { status: "too-late", eligibleAt };
  return { status: "due", eligibleAt };
}
