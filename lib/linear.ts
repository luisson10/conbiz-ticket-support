import { LinearClient } from "@linear/sdk";

// Initialize the Linear Client with the API key from environment variables
// Defaulting to a placeholder if not set, to avoid crash on build time if env is missing
export const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY || "dummy-key",
  headers: {
    // Request signed, temporary URLs for uploads.linear.app so images can load in the browser.
    "public-file-urls-expire-in": process.env.LINEAR_FILE_URL_EXPIRES_IN || "300",
  },
});
