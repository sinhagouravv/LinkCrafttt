import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { isValidUrl, generateShortCode } from "@url-shortener/utils";
import { setCache, invalidateCache } from "../redis.js";

const router = Router();

// Create a short URL (public or private)
router.post("/", async (req: AuthRequest, res: Response): Promise<any> => {
  const { originalUrl, customCode } = req.body;
  const authHeader = req.headers.authorization;
  let userId: string | undefined;

  // Extract optional user auth token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (e) {
      // Ignore invalid token and treat as anonymous shortener
    }
  }

  if (!originalUrl) {
    return res.status(400).json({ success: false, error: "Original URL is required." });
  }

  if (!isValidUrl(originalUrl)) {
    return res.status(400).json({ success: false, error: "Invalid URL format." });
  }

  let code = customCode ? customCode.trim() : "";

  if (code) {
    // Check if custom code is taken
    const existing = await prisma.shortURL.findUnique({ where: { shortCode: code } });
    if (existing) {
      return res.status(400).json({ success: false, error: "Custom short code is already taken." });
    }
  } else {
    // Generate unique short code
    let attempts = 0;
    while (attempts < 5) {
      code = generateShortCode();
      const existing = await prisma.shortURL.findUnique({ where: { shortCode: code } });
      if (!existing) break;
      attempts++;
    }
  }

  try {
    const url = await prisma.shortURL.create({
      data: {
        originalUrl,
        shortCode: code,
        userId: userId || null,
      },
    });

    // Populate Redis Cache
    await setCache(`url:${code}`, originalUrl, 86400); // cache for 24h

    return res.status(201).json({ success: true, data: url });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// List authenticated user's URLs
router.get("/", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const urls = await prisma.shortURL.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: urls });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a short URL
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const url = await prisma.shortURL.findUnique({ where: { id } });

    if (!url) {
      return res.status(404).json({ success: false, error: "URL not found." });
    }

    if (url.userId !== req.userId) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this URL." });
    }

    await prisma.shortURL.delete({ where: { id } });

    // Invalidate Cache
    await invalidateCache(`url:${url.shortCode}`);

    return res.json({ success: true, data: { message: "URL deleted successfully." } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get analytics for a URL
router.get("/:id/analytics", authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const { id } = req.params;

  try {
    const url = await prisma.shortURL.findUnique({
      where: { id },
      include: {
        analytics: {
          orderBy: { clickedAt: "desc" },
          take: 100,
        },
      },
    });

    if (!url) {
      return res.status(404).json({ success: false, error: "URL not found." });
    }

    if (url.userId !== req.userId) {
      return res.status(403).json({ success: false, error: "Not authorized to view analytics." });
    }

    return res.json({ success: true, data: url });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
