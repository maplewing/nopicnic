import { getManualOrder } from "../../../lib/manualOrders";
import { checkAdminAuth } from "../../../lib/adminAuth";

export async function getServerSideProps({ req, params }) {
  if (!checkAdminAuth(req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const order = await getManualOrder(params.id);
  if (!order) return { notFound: true };
  return { props: { order } };
}

function fmt(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function fmtDate(iso) {
  // Append noon UTC to avoid date shifting across timezones
  const d = new Date(iso + "T12:00:00Z");
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export default function InvoicePage({ order }) {
  const { id, date, recipient, items, tracking, carrier, via, shippingCost } = order;

  const itemSubtotals = (items || []).map((item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = item.discount > 0 ? base * (1 - item.discount / 100) : base;
    return disc;
  });
  const subtotal = itemSubtotals.reduce((a, b) => a + b, 0);
  const total = subtotal + (shippingCost || 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Courier New", Courier, monospace; font-size: 13px; line-height: 1.6; color: #000; background: #fff; }
        .page { max-width: 640px; margin: 60px auto; padding: 0 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .invoice-title { text-decoration: underline; font-weight: bold; font-size: 13px; }
        .logo { width: 72px; opacity: 0.85; }
        .block { margin-bottom: 24px; }
        .section-label { font-weight: bold; }
        .underline { text-decoration: underline; }
        .print-btn {
          display: inline-block;
          margin-top: 40px;
          padding: 8px 20px;
          background: #162114;
          color: #FFEDD2;
          border: none;
          cursor: pointer;
          font-family: "Courier New", Courier, monospace;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .signature { margin-top: 32px; }
        .sig-logo { width: 60px; display: block; margin-bottom: 4px; }
        @media print {
          .print-btn { display: none; }
          body { margin: 0; }
          .page { margin: 40px; }
        }
      ` }} />

      <div className="page">
        <div className="header">
          <div>
            <div className="invoice-title">INVOICE</div>
            <div>{fmtDate(date)}</div>
          </div>
          <img src="/images/npp-logo.png" className="logo" alt="" />
        </div>

        <div className="block">
          <div>To:</div>
          <div style={{ whiteSpace: "pre-line" }}>{recipient.name}</div>
          {recipient.address && (
            <div style={{ whiteSpace: "pre-line" }}>{recipient.address}</div>
          )}
          {recipient.eori && <div>EORI {recipient.eori}</div>}
          {recipient.vatId && <div>VAT ID: {recipient.vatId}</div>}
        </div>

        <div className="block">
          <div>: Order {id}</div>
        </div>

        {(items || []).map((item, i) => (
          <div className="block" key={i}>
            <div>{item.name}</div>
            <div>qty: {item.qty} @ {fmt(item.unitPrice)} ea</div>
            {item.discount > 0 && (
              <div>
                x {item.discount}% (wholesale discount) = {fmt(itemSubtotals[i])} USD
              </div>
            )}
          </div>
        ))}

        {(tracking || shippingCost > 0) && (
          <div className="block">
            <div>
              : Shipping{carrier ? ` ${carrier}` : ""}{tracking ? ` ${tracking}` : ""}{via ? ` via ${via}` : ""}
            </div>
            {shippingCost > 0 && <div>{fmt(shippingCost)}</div>}
          </div>
        )}

        <div className="block">
          <div>: Total</div>
          <div className="underline">{fmt(total)} USD</div>
        </div>

        <div className="block">
          <div>: Payment terms</div>
          <div>Payment is due upon receipt</div>
        </div>

        <div className="block">
          <div>Make check payable to :</div>
          <div>Eli Altman</div>
          <div>1715 9th St</div>
          <div>Berkeley, CA 94710</div>
        </div>

        <div className="block">
          <div>Or Paypal at hi@elialtman.com</div>
        </div>

        <div className="signature">
          <img src="/images/npp-logo.png" className="sig-logo" alt="" />
          <div>Many thanks.</div>
        </div>

        <button className="print-btn" onClick={() => window.print()}>
          PRINT / SAVE PDF
        </button>
      </div>
    </>
  );
}

InvoicePage.noLayout = true;
