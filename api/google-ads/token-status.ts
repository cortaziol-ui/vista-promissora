import type { VercelRequest, VercelResponse } from "@vercel/node";
import { hasValidRefreshToken } from "../_lib/google-auth";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const connected = await hasValidRefreshToken();
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || null;

    res.status(200).json({
      connected,
      customerId: connected ? customerId : null,
    });
  } catch (e: any) {
    res.status(200).json({
      connected: false,
      error: e.message || "Erro ao verificar status.",
    });
  }
}
