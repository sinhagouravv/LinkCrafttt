import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import urlRoutes from "./routes/urls.js";
import { prisma } from "./db.js";
import { connectRedis, getCache, setCache } from "./redis.js";

// Try loading from current working directory (e.g., if run from root)
dotenv.config();
// Fallback if run directly from apps/server directory
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Connect Cache
connectRedis();

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Short URL Redirect Endpoint
app.get("/:code", async (req, res): Promise<any> => {
  const { code } = req.params;

  try {
    // 1. Check Redis cache first
    let originalUrl = await getCache(`url:${code}`);

    let urlRecord = null;

    if (!originalUrl) {
      // 2. Fallback to database
      urlRecord = await prisma.shortURL.findUnique({
        where: { shortCode: code },
      });

      if (!originalUrl && urlRecord) {
        originalUrl = urlRecord.originalUrl;
        // Populate cache
        await setCache(`url:${code}`, originalUrl, 86400);
      }
    }

    if (!originalUrl) {
      return res.status(404).send("<h1>URL Not Found</h1><p>The shortened link you followed does not exist.</p>");
    }

    // 3. Increment click count and record analytics (non-blocking)
    const ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || null) as string | null;
    const userAgent = req.headers["user-agent"] || null;
    const referer = req.headers["referer"] || null;

    // Fetch the URL record ID if we don't have it already
    if (!urlRecord) {
      prisma.shortURL.findUnique({ where: { shortCode: code } }).then((record) => {
        if (record) {
          Promise.all([
            prisma.shortURL.update({
              where: { id: record.id },
              data: { clicks: { increment: 1 } },
            }),
            prisma.analytics.create({
              data: {
                urlId: record.id,
                ipAddress,
                userAgent,
                referer,
              },
            }),
          ]).catch((err) => console.error("Failed to update analytics:", err));
        }
      });
    } else {
      Promise.all([
        prisma.shortURL.update({
          where: { id: urlRecord.id },
          data: { clicks: { increment: 1 } },
        }),
        prisma.analytics.create({
          data: {
            urlId: urlRecord.id,
            ipAddress,
            userAgent,
            referer,
          },
        }),
      ]).catch((err) => console.error("Failed to update analytics:", err));
    }

    // 4. Redirect client to original URL
    return res.redirect(originalUrl);
  } catch (error) {
    console.error("Redirect error:", error);
    return res.status(500).send("An error occurred while redirecting.");
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
