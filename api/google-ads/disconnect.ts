import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteTokens } from "../_lib/google-auth";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await deleteTokens();
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(200).json({ success: false, error: e.message || "Erro ao desconectar." });
  }
}
