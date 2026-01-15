import type { NextApiRequest, NextApiResponse } from "next";
import { getIronSession } from "iron-session";
import { sessionOptions } from "../../lib/session";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import { OAuth2Client, Credentials } from "google-auth-library";
import { cacheSlideThumbnail, getCachedSlideUrl } from "../../lib/storage";

interface GenerateGifRequest {
  presentationId: string;
  slideList: string; // Comma-delimited list of objectIds
  delay?: number; // Delay between frames in milliseconds
  quality?: number; // Quality (1-20, lower is better quality but slower)
  repeat?: number; // Number of times to repeat (0 = no repeat)
  thumbnailSize?: "SMALL" | "MEDIUM" | "LARGE"; // Thumbnail size for GIF generation
}

interface GenerateGifResponse {
  gifUrl?: string;
  error?: string;
}

/**
 * Generates a GIF from selected slides by calling the png2gif Cloud Run service
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateGifResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check authentication - user must be logged in
    const session = await getIronSession(req, res, sessionOptions);
    console.log("Session check:", {
      hasUser: !!session.user,
      isLoggedIn: session.isLoggedIn,
      hasGoogleTokens: !!session.googleTokens,
      hasGoogleOAuth: !!session.googleOAuth,
    });

    // Check if user is authenticated via Google OAuth tokens
    if (!session.googleTokens?.access_token && !session.googleOAuth) {
      console.error("User not authenticated - no Google tokens");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { presentationId, slideList, delay, quality, repeat, thumbnailSize = "MEDIUM" } = req.body as GenerateGifRequest;

    console.log("[www] Received generate-gif request:", {
      presentationId,
      slideList,
      slideListType: typeof slideList,
      slideListLength: slideList?.length,
    });

    if (!presentationId) {
      return res.status(400).json({ error: "presentationId is required" });
    }

    if (!slideList) {
      return res.status(400).json({ error: "slideList is required" });
    }

    // Fetch and cache high-resolution thumbnails for selected slides
    console.log(`[www] Fetching ${thumbnailSize} thumbnails for GIF generation`);
    const slideObjectIds = slideList.split(",").map((id) => id.trim());
    
    try {
      // Setup OAuth2 client for Google Slides API
      const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
      const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
      if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ error: "OAuth credentials not configured" });
      }

      const auth = new OAuth2Client({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      });

      // Set credentials from session
      const credentials: Credentials = {
        access_token: session.googleTokens.access_token || undefined,
        refresh_token: session.googleTokens.refresh_token || undefined,
        expiry_date: session.googleTokens.expiry_date || undefined,
      };
      auth.setCredentials(credentials);

      // Refresh token if expired
      if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
        const { credentials: newCredentials } = await auth.refreshAccessToken();
        auth.setCredentials(newCredentials);
      }

      // Get Slides API client
      const slides = google.slides({ version: "v1", auth });

      // Fetch high-res thumbnails for each selected slide
      const thumbnailPromises = slideObjectIds.map(async (objectId) => {
        // Check if already cached
        const cachedUrl = await getCachedSlideUrl(presentationId, objectId, thumbnailSize);
        if (cachedUrl) {
          console.log(`[www] Using cached ${thumbnailSize} thumbnail for ${objectId}`);
          return { objectId, cached: true };
        }

        // Fetch from API
        try {
          const thumbnail = await slides.presentations.pages.getThumbnail({
            presentationId,
            pageObjectId: objectId,
            "thumbnailProperties.thumbnailSize": thumbnailSize,
          });

          const thumbnailUrl = thumbnail.data.contentUrl;
          if (thumbnailUrl) {
            // Cache the high-res thumbnail
            await cacheSlideThumbnail(presentationId, objectId, thumbnailUrl, thumbnailSize);
            console.log(`[www] Cached ${thumbnailSize} thumbnail for ${objectId}`);
            return { objectId, cached: false };
          }
        } catch (error: any) {
          console.error(`[www] Error fetching ${thumbnailSize} thumbnail for ${objectId}:`, error);
          // Continue with other slides even if one fails
          return { objectId, error: error.message };
        }
      });

      // Wait for all thumbnails to be fetched/cached
      await Promise.all(thumbnailPromises);
      console.log(`[www] Finished fetching/caching ${thumbnailSize} thumbnails`);
    } catch (error: any) {
      console.error("[www] Error fetching high-res thumbnails:", error);
      // Continue anyway - png2gif will use whatever is available
    }

    // Get the png2gif service URL
    // In production (Cloud Run), use the service URL
    // In local development, use localhost
    const png2gifServiceUrl =
      process.env.PNG2GIF_SERVICE_URL ||
      process.env.NEXT_PUBLIC_PNG2GIF_SERVICE_URL ||
      "http://localhost:3001";

    // For Cloud Run, we need to authenticate the request
    // In local development, skip authentication (png2gif will also skip it)
    let authHeaders: Record<string, string> = {};
    const isCloudRun = !!process.env.GOOGLE_CLOUD_PROJECT;

    if (isCloudRun) {
      // We're in Cloud Run, use service-to-service authentication
      console.log("Authenticating request to png2gif service (Cloud Run)");
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getIdTokenClient(png2gifServiceUrl);
      const idToken = await client.idTokenProvider.fetchIdToken(
        png2gifServiceUrl,
      );
      authHeaders = {
        Authorization: `Bearer ${idToken}`,
      };
    } else {
      console.log("Skipping authentication (local development)");
    }

    // Build the request URL with query parameters
    // Ensure the URL includes the /createGif endpoint
    const baseUrl = png2gifServiceUrl.endsWith("/")
      ? png2gifServiceUrl.slice(0, -1)
      : png2gifServiceUrl;
    const url = new URL(`${baseUrl}/createGif`);
    url.searchParams.set("presentationId", presentationId);
    url.searchParams.set("slideList", slideList);
    url.searchParams.set("thumbnailSize", thumbnailSize);
    // Add optional GIF configuration parameters
    if (delay !== undefined) {
      url.searchParams.set("delay", delay.toString());
    }
    if (quality !== undefined) {
      url.searchParams.set("quality", quality.toString());
    }
    if (repeat !== undefined) {
      url.searchParams.set("repeat", repeat.toString());
    }
    // url.searchParams.set("quality", "10");
    // url.searchParams.set("repeat", "0");

    console.log(`[www] Calling png2gif service with options:`, {
      url: url.toString(),
      thumbnailSize,
      delay,
      quality,
      repeat,
      slideList,
    });

    // Call the png2gif service
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        // Add timeout for local development (5 minutes)
        signal: AbortSignal.timeout(300000),
      });
    } catch (error: any) {
      console.error("[www] Error calling png2gif service:", error);
      if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "png2gif service is not available. Please ensure it's running on port 3001.",
        });
      }
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return res.status(504).json({
          error: "Request to png2gif service timed out.",
        });
      }
      throw error; // Re-throw other errors
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`png2gif service error: ${errorText}`);
      return res.status(response.status).json({
        error: `Failed to generate GIF: ${errorText}`,
      });
    }

    const result = await response.json();

    if (result.result === "SUCCESS" && result.file) {
      // The file path is a GCS path (gs://bucket-name/filename or just filename)
      let gifUrl: string;
      if (result.file.startsWith("gs://")) {
        // Extract bucket and filename from gs:// path
        const gsPath = result.file.replace("gs://", "");
        const [bucket, ...pathParts] = gsPath.split("/");
        const filename = pathParts.join("/");
        gifUrl = `https://storage.googleapis.com/${bucket}/${filename}`;
      } else {
        // Assume it's just a filename, use the bucket from env or default
        const bucketName =
          process.env.GCS_CACHE_BUCKET || "slides2gif-upload-test";
        gifUrl = `https://storage.googleapis.com/${bucketName}/${result.file}`;
      }

      return res.status(200).json({ gifUrl });
    } else {
      return res.status(500).json({
        error: result.result || "Failed to generate GIF",
      });
    }
  } catch (error: any) {
    console.error("Error generating GIF:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
}
