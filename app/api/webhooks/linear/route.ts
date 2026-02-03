import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signatureHeader = headersList.get("linear-signature");
  
  const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("LINEAR_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  if (!signatureHeader) {
    console.error("Missing Linear webhook headers");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hmac = crypto.createHmac("sha256", webhookSecret);
  const digest = hmac.update(body).digest("hex");

  const expectedBuffer = Buffer.from(digest, "hex");
  const providedSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const providedBuffer = Buffer.from(providedSignature, "hex");

  const isValid =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(body);
    const webhookTimestamp = payload?.webhookTimestamp;
    const now = Date.now();
    if (
      !Number.isFinite(webhookTimestamp) ||
      Math.abs(now - webhookTimestamp) > 60 * 1000
    ) {
      console.error("Stale or invalid webhook timestamp");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { action, type, data } = payload;

    console.log(`Received Linear Webhook: ${type} - ${action}`);
    
    // TODO: Handle specific events here
    // Example: Update local database when an issue is updated
    if (type === "Issue" && action === "update") {
      // syncIssue(data);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Processing error" }, { status: 400 });
  }
}
