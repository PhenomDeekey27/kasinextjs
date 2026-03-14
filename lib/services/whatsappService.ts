import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn(
    "Twilio credentials not configured - WhatsApp messages will be skipped",
  );
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<void> {
  if (!client) {
    console.warn("Twilio not configured. Skipping WhatsApp message.");
    return;
  }

  try {
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+91${phone}`,
      body: message,
    });

    console.log("WhatsApp message sent");
  } catch (error) {
    console.error("WhatsApp error:", error);
  }
}
