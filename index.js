/**
 * Brahma CLI - NPX Package Entry Point
 *
 * This file serves as the main entry point when the package is imported
 * as a module (though this is primarily a CLI tool)
 */

const BrahmaClient = require("./lib/client");

module.exports = BrahmaClient;
