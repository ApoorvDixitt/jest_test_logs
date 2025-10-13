/**
 * Brahma CLI Configuration
 *
 * Edit the BACKEND_URL below to point to your backend server
 */

module.exports = {
  // Backend URL - Updated to connect to local server
  BACKEND_URL: "https://brahma-backend.onrender.com/chat",

  // Other configuration options
  TIMEOUT: 30000, // 30 seconds
  USER_AGENT: "Brahma-CLI-NPX/1.0",

  // Self-destruct mode: Remove all traces after use
  SELF_DESTRUCT: true, // Set to false to keep NPX cache for performance
};
