/**
 * Brahma CLI Configuration
 *
 * Edit the BACKEND_URL below to point to your backend server
 */

module.exports = {
  // Backend URL - Updated to connect to local server
  BACKEND_URL: "http://localhost:3000/chat",

  // Other configuration options
  TIMEOUT: 300000, // 5 minutes (300 seconds) - Increased for AI processing
  RETRY_ATTEMPTS: 3, // Number of retry attempts on timeout
  RETRY_DELAY: 5000, // 5 seconds delay between retries
  USER_AGENT: "Brahma-CLI-NPX/1.0",

  // Self-destruct mode: Remove all traces after use
  SELF_DESTRUCT: true, // Set to false to keep NPX cache for performance
};
