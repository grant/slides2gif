import { NextApiRequest, NextApiResponse } from "next";
import { withIronSessionApiRoute } from "iron-session/next";
import { sessionOptions } from "lib/session";
import { google } from "googleapis";
import { OAuth2Client, Credentials } from "google-auth-library";
import { getCachedSlideUrl } from "lib/storage";

// Load env vars (.env)
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

export default withIronSessionApiRoute(
  presentationsRoute as any,
  sessionOptions,
);

/**
 * Gets a list of Google Slides presentations from the user's Drive.
 */
async function presentationsRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if user is logged in
  if (!req.session.googleTokens?.access_token) {
    console.log("No access token in session. Session data:", {
      hasGoogleTokens: !!req.session.googleTokens,
      hasGoogleOAuth: !!req.session.googleOAuth,
    });
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Setup OAuth2 client
    const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
    const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res
        .status(500)
        .json({ error: "OAuth credentials not configured" });
    }

    const auth = new OAuth2Client({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    // Set credentials from session
    const credentials: Credentials = {
      access_token: req.session.googleTokens.access_token || undefined,
      refresh_token: req.session.googleTokens.refresh_token || undefined,
      expiry_date: req.session.googleTokens.expiry_date || undefined,
    };
    auth.setCredentials(credentials);

    // Refresh token if expired
    if (credentials.expiry_date && credentials.expiry_date <= Date.now()) {
      const { credentials: newCredentials } = await auth.refreshAccessToken();
      auth.setCredentials(newCredentials);

      // Update session with new tokens
      req.session.googleTokens = {
        access_token: newCredentials.access_token || undefined,
        refresh_token:
          newCredentials.refresh_token ||
          credentials.refresh_token ||
          undefined,
        expiry_date: newCredentials.expiry_date || undefined,
      };
      await req.session.save();
    }

    // Get Drive API client
    const drive = google.drive({ version: "v3", auth });

    // List Google Slides presentations
    // MIME type for Google Slides: application/vnd.google-apps.presentation
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.presentation' and trashed=false",
      fields: "files(id, name, thumbnailLink, modifiedTime, createdTime)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });

    const files = response.data.files || [];
    
    // Get Slides API client to fetch first slide info for each presentation
    const slides = google.slides({ version: "v1", auth });
    
    // Get first slide preview from cache for each presentation
    const presentationsWithPreviews = await Promise.all(
      files.map(async (file: any) => {
        const presentationId = file.id || "";
        let firstSlidePreview: string | null = null;
        
        try {
          // Get presentation metadata to find first slide
          const presentation = await slides.presentations.get({
            presentationId,
            fields: "slides(objectId)",
          });
          
          const firstSlide = presentation.data.slides?.[0];
          if (firstSlide?.objectId) {
            // Check if first slide is cached (SMALL size for preview)
            firstSlidePreview = await getCachedSlideUrl(
              presentationId,
              firstSlide.objectId,
              "SMALL"
            );
          }
        } catch (error) {
          // Silently fail - we'll just use Drive thumbnail or no preview
          console.warn(`Could not get first slide preview for ${presentationId}:`, error);
        }
        
        return {
          id: presentationId,
          name: file.name || "",
          thumbnailLink: file.thumbnailLink || undefined,
          firstSlidePreview: firstSlidePreview || undefined,
          modifiedTime: file.modifiedTime || undefined,
          createdTime: file.createdTime || undefined,
        };
      })
    );

    return res.json({ presentations: presentationsWithPreviews });
  } catch (error: any) {
    console.error("Error fetching presentations:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return res.status(500).json({
      error: "Failed to fetch presentations",
      message: error.message,
    });
  }
}
