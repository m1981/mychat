/** @type {import("puppeteer").Configuration} */
module.exports = {
  // Skip downloading Chrome since we're using the system-installed Chromium
  skipDownload: true,
  // Tell Puppeteer where to find the executable
  executablePath: '/usr/bin/chromium',
  // Change the cache location for Puppeteer
  cacheDirectory: '/app/.cache/puppeteer',
};