interface Passenger {
  name: string;
  phone: string;
}

/**
 * Send coordinator alert for bookings that need manual review
 * Can be integrated with WhatsApp, SMS, Telegram, or Email
 */
export function sendCoordinatorAlert(
  passenger: Passenger,
  reason: string,
  groupSize: number,
): void {
  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  const message = `
═══════════════════════════════════════
⚠ BOOKING NEEDS COORDINATOR REVIEW ⚠
═══════════════════════════════════════

📋 BOOKING DETAILS
──────────────────
  Passenger: ${passenger.name}
  Phone: ${passenger.phone}
  Group Size: ${groupSize} passenger(s)
  Timestamp: ${timestamp}

🔍 REVIEW REASON
──────────────────
  ${reason}

📞 ACTION REQUIRED
──────────────────
  Please call the passenger to confirm
  final seat allocation.

═══════════════════════════════════════
`;

  console.log("═════════════════════════════════════════");
  console.log("📢 COORDINATOR ALERT");
  console.log("═════════════════════════════════════════");
  console.log(message);

  // Log to structured object for potential external system integration
  const alertStructured = {
    type: "BOOKING_REVIEW_NEEDED",
    severity: "MEDIUM",
    passenger: {
      name: passenger.name,
      phone: passenger.phone,
    },
    group_size: groupSize,
    reason,
    timestamp: new Date().toISOString(),
  };

  console.log("📊 Structured Alert:", JSON.stringify(alertStructured, null, 2));

  // FUTURE INTEGRATION POINTS:
  // ──────────────────────────
  // 1. WhatsApp Integration:
  //    - Send to coordinator WhatsApp group
  //    - Use Twilio or WhatsApp Business API
  //    - Include clickable action buttons
  //
  // 2. SMS Integration:
  //    - Send SMS notification to coordinator mobile
  //    - Include critical booking details
  //
  // 3. Telegram Bot Integration:
  //    - Send alert to Telegram channel
  //    - Format with inline buttons for quick actions
  //
  // 4. Email Integration:
  //    - Send detailed email to coordinator inbox
  //    - Include downloadable booking summary
  //
  // 5. Database Logging:
  //    - Store alert in alerts/coordinator_alerts table
  //    - Track acknowledgement and resolution
  //
  // 6. Dashboard Integration:
  //    - Real-time updates on admin dashboard
  //    - Sound notification for urgency
  //
  // Example WhatsApp implementation:
  // ────────────────────────────────
  // const twilio = require('twilio');
  // const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
  //
  // await client.messages.create({
  //   body: message.trim(),
  //   from: 'whatsapp:+1234567890',
  //   to: `whatsapp:+${passenger.phone}`,
  // });
}
