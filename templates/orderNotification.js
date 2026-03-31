/**
 * Generates the HTML email body for a new order notification sent to the admin.
 *
 * @param {Object} params
 * @param {Object} params.order          - The saved order document (Mongoose)
 * @param {Object} params.customer       - { username, email }
 * @param {Array}  params.cartItems      - cart.items array: [{ productId, quantity }]
 * @param {Object} params.productMap     - Map of productId (string) → { product_title, part_number, price }
 * @returns {string} HTML string
 */
export const buildOrderNotificationEmail = ({ order, customer, cartItems, productMap }) => {
  const addr = order.deliveryAddress;

  const formattedAddress = [
    addr.house_number,
    addr.street,
    addr.address,
    addr.city,
    addr.district,
    addr.state,
    addr.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const itemRows = cartItems
    .map((item) => {
      const p = productMap[item.productId.toString()] || {};
      const subtotal = ((p.price || 0) * item.quantity).toFixed(2);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;">${p.product_title || "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;color:#666;">${p.part_number || "—"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;text-align:right;">₹${(p.price || 0).toFixed(2)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-weight:600;">₹${subtotal}</td>
        </tr>`;
    })
    .join("");

  const paymentBadgeBg = order.paymentStatus === "pending" ? "#fff4e5" : "#e8f5e9";
  const paymentBadgeColor = order.paymentStatus === "pending" ? "#b76e00" : "#2e7d32";
  const orderDate = new Date(order.createdAt).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:30px 0;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.5px;">🛒 New Order Received</h1>
            <p style="margin:6px 0 0;color:#a0a0c0;font-size:13px;">Order #${order.orderNumber}</p>
          </td>
        </tr>

        <!-- Order Meta -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-bottom:20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;">Customer</p>
                  <p style="margin:0;font-size:14px;color:#222;">${customer?.username || "—"}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#555;">${customer?.email || "—"}</p>
                </td>
                <td width="50%" style="padding-bottom:20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;">Order Date</p>
                  <p style="margin:0;font-size:14px;color:#222;">${orderDate}</p>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding-bottom:20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;">Payment</p>
                  <p style="margin:0;font-size:14px;color:#222;text-transform:capitalize;">${order.paymentMethod} &nbsp;
                    <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:${paymentBadgeBg};color:${paymentBadgeColor};">${order.paymentStatus.toUpperCase()}</span>
                  </p>
                </td>
                <td width="50%" style="padding-bottom:20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;">Contact</p>
                  <p style="margin:0;font-size:14px;color:#222;">${addr.phone_number || "—"}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-bottom:24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;">Delivery Address</p>
                  <p style="margin:0;font-size:14px;color:#222;">${addr.name}</p>
                  <p style="margin:2px 0 0;font-size:13px;color:#555;">${formattedAddress}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
              <thead>
                <tr style="background:#f8f8fb;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#999;border-bottom:2px solid #e8e8e8;">Product</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#999;border-bottom:2px solid #e8e8e8;">Part No.</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;text-transform:uppercase;color:#999;border-bottom:2px solid #e8e8e8;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;color:#999;border-bottom:2px solid #e8e8e8;">Price</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;color:#999;border-bottom:2px solid #e8e8e8;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:0 32px 32px;text-align:right;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">Total: ₹${order.totalAmount.toFixed(2)}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8fb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">This is an automated notification from your Sparepart Store backend.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};
