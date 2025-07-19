import express from "express";
import { google } from "googleapis";

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 1. Start OAuth flow
router.get("/auth/gmail", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid"
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });
  res.json({ authUrl: url });
});

// 2. Handle OAuth callback
router.get("/auth/gmail/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send("Missing code");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // For demo: store tokens in session (or in-memory, or DB)
    req.session = req.session || {};
    req.session.gmailTokens = tokens;

    res.send("Gmail connected! You can close this window.");
  } catch (err) {
    res.status(500).send("Failed to get tokens");
  }
});

// Endpoint to get connected Gmail accounts for the current session
router.get("/gmail/accounts", async (req, res) => {
  if (req.session && req.session.gmailTokens) {
    // Optionally, use googleapis to get the user's email address
    // For demo, just return a mock account
    res.json([{ id: 1, email: "user@gmail.com" }]);
  } else {
    res.json([]);
  }
});

// Fetch emails from Gmail
router.get("/gmail/emails", async (req, res) => {
  if (!req.session || !req.session.gmailTokens) {
    return res.status(401).json({ error: "Not connected to Gmail" });
  }

  const folder = req.query.folder as string || "inbox";
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(req.session.gmailTokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    // List messages in the specified folder/label
    const label = folder === "sent" ? "SENT" : "INBOX";
    const listRes = await gmail.users.messages.list({
      userId: "me",
      labelIds: [label],
      maxResults: 20,
    });

    // Fetch message details for each message
    const messages = await Promise.all(
      (listRes.data.messages || []).map(async (msg) => {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "To", "Date"],
        });
        return {
          id: msg.id,
          snippet: msgRes.data.snippet,
          headers: msgRes.data.payload?.headers,
        };
      })
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

export default router; 