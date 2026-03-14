interface Passenger {
  name: string;
  phone: string;
}

export function sendCoordinatorAlert(
  passenger: Passenger,
  reason: string,
  groupSize: number,
): void {
  const message = `
⚠ Booking Needs Review

Passenger: ${passenger.name}
Phone: ${passenger.phone}
Group Size: ${groupSize}

Reason:
${reason}
`;

  console.log("ALERT FOR COORDINATOR:");
  console.log(message);

  // FUTURE INTEGRATION
  // Here we can connect:
  // - WhatsApp API
  // - SMS gateway
  // - Telegram bot
  //
  // Example:
  // sendWhatsApp(message)
}
