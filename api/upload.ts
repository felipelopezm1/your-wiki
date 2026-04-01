import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const filename = req.query.filename as string;
    if (!filename) {
      return res.status(400).json({ error: "Missing filename query parameter" });
    }

    if (!req.body) {
      return res.status(400).json({ error: "Missing file body" });
    }

    const blob = await put(`weeeeki/${filename}`, req.body, {
      access: "public",
    });

    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
