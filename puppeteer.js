// Puppeteer automation module for AniStream
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { ipcMain, dialog } = require('electron');
const axios = require('axios');
const cheerio = require('cheerio');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Keep track of browser instances
let browser = null;
let pendingCloudflarePromise = null;

// Setup IPC handlers
function setupPuppeteerHandlers() {
  // Browse a URL
  ipcMain.handle('browse', handleBrowse);
  
  // Extract anime info
  ipcMain.handle('extract-anime-info', handleExtractAnimeInfo);
  
  // Download episode
  ipcMain.handle('download-episode', handleDownloadEpisode);
}

// Initialize puppeteer
async function initPuppeteer() {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-size=1366,768',
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null
    });
    
    console.log('Browser launched');
    
    // Handle browser disconnection
    browser.on('disconnected', () => {
      console.log('Browser disconnected');
      browser = null;
    });
    
    return browser;
  } catch (error) {
    console.error('Error launching browser:', error);
    browser = null;
    throw error;
  }
}

// Handle browse request
async function handleBrowse(event, url, options = {}) {
  try {
    // If this is a continuation after Cloudflare, resolve the pending promise
    if (url === 'continue' && options.continueNavigation && pendingCloudflarePromise) {
      pendingCloudflarePromise.resolve();
      return true;
    }
    
    // Initialize browser if needed
    if (!browser) {
      await initPuppeteer();
    }
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Block ads if enabled
    if (options.adBlock) {
      await setupAdBlocking(page);
    }
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check for Cloudflare challenge
    const isCloudflare = await checkForCloudflare(page);
    if (isCloudflare) {
      // Create a promise that will be resolved when the Cloudflare challenge is completed
      const cloudflarePromise = new Promise((resolve) => {
        pendingCloudflarePromise = { resolve };
      });
      
      // Send the Cloudflare URL to the renderer
      event.sender.send('cloudflare-challenge', page.url());
      
      // Wait for the challenge to be completed
      await cloudflarePromise;
      
      // Reset the pending promise
      pendingCloudflarePromise = null;
      
      // Reload the page
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    }
    
    // If auto-detection is enabled, try to extract anime info
    if (options.autoDetect) {
      const animeInfo = await extractAnimeInfo(page);
      
      // If we found anime info, send it to the renderer
      if (animeInfo) {
        event.sender.send('anime-detected', animeInfo);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error browsing:', error);
    return false;
  }
}

// Handle anime info extraction
async function handleExtractAnimeInfo(event, url) {
  try {
    // Initialize browser if needed
    if (!browser) {
      await initPuppeteer();
    }
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check for Cloudflare challenge
    const isCloudflare = await checkForCloudflare(page);
    if (isCloudflare) {
      // Create a promise that will be resolved when the Cloudflare challenge is completed
      const cloudflarePromise = new Promise((resolve) => {
        pendingCloudflarePromise = { resolve };
      });
      
      // Send the Cloudflare URL to the renderer
      event.sender.send('cloudflare-challenge', page.url());
      
      // Wait for the challenge to be completed
      await cloudflarePromise;
      
      // Reset the pending promise
      pendingCloudflarePromise = null;
      
      // Reload the page
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    }
    
    // Extract anime info
    const animeInfo = await extractAnimeInfo(page);
    
    // Close the page
    await page.close();
    
    return animeInfo;
  } catch (error) {
    console.error('Error extracting anime info:', error);
    return null;
  }
}

// Handle episode download
async function handleDownloadEpisode(event, url, filename) {
  try {
    // Initialize browser if needed
    if (!browser) {
      await initPuppeteer();
    }
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check for Cloudflare challenge
    const isCloudflare = await checkForCloudflare(page);
    if (isCloudflare) {
      // Create a promise that will be resolved when the Cloudflare challenge is completed
      const cloudflarePromise = new Promise((resolve) => {
        pendingCloudflarePromise = { resolve };
      });
      
      // Send the Cloudflare URL to the renderer
      event.sender.send('cloudflare-challenge', page.url());
      
      // Wait for the challenge to be completed
      await cloudflarePromise;
      
      // Reset the pending promise
      pendingCloudflarePromise = null;
      
      // Reload the page
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    }
    
    // Extract video URL
    const videoUrl = await extractVideoUrl(page);
    
    if (!videoUrl) {
      await page.close();
      return false;
    }
    
    // Download the video
    const success = await downloadVideo(videoUrl, filename);
    
    // Close the page
    await page.close();
    
    return success;
  } catch (error) {
    console.error('Error downloading episode:', error);
    return false;
  }
}

// Extract anime info from page
async function extractAnimeInfo(page) {
  try {
    // Get page title and URL
    const pageTitle = await page.title();
    const pageUrl = page.url();
    
    // Extract hostname for site-specific patterns
    const hostname = new URL(pageUrl).hostname;
    
    // Use cheerio to parse the HTML
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // Get common selectors for anime sites
    const commonPatterns = {
      titleSelectors: [
        'h1.anime-title',
        'h1.title',
        '.anime-title',
        '.title',
        'meta[property="og:title"]',
        'title'
      ],
      episodeSelectors: [
        '.episode-number',
        '.episode',
        '.ep-num',
        'span:contains("Episode")',
        'title'
      ],
      episodeRegex: /episode\s*(\d+)/i
    };
    
    // Site-specific patterns
    const sitePatterns = {
      'animepahe.ru': {
        titleSelectors: ['.anime-title', 'title'],
        episodeSelectors: ['.episode-title', 'title'],
        episodeRegex: /episode\s*(\d+)/i
      },
      'hianime.to': {
        titleSelectors: ['.anime-name', 'title'],
        episodeSelectors: ['.episode-info', 'title'],
        episodeRegex: /episode\s*(\d+)/i
      },
      'gogoanime.cl': {
        titleSelectors: ['.anime_info_body_bg h1', 'title'],
        episodeSelectors: ['.episode_page .active a', 'title'],
        episodeRegex: /episode\s*(\d+)/i
      }
    };
    
    // Get patterns for this site
    const patterns = sitePatterns[hostname] || commonPatterns;
    
    // Extract anime title
    let animeTitle = null;
    for (const selector of patterns.titleSelectors) {
      const element = selector === 'title' 
        ? pageTitle 
        : $(selector).attr('content') || $(selector).text();
      
      if (element) {
        animeTitle = element.trim();
        break;
      }
    }
    
    // Clean anime title (remove episode number)
    if (animeTitle) {
      animeTitle = animeTitle.replace(patterns.episodeRegex, '').trim();
    }
    
    // Extract episode number
    let episodeNumber = null;
    
    // First try from selectors
    for (const selector of patterns.episodeSelectors) {
      const element = selector === 'title' 
        ? pageTitle 
        : $(selector).text();
      
      if (element) {
        const match = element.match(patterns.episodeRegex);
        if (match && match[1]) {
          episodeNumber = parseInt(match[1]);
          break;
        }
      }
    }
    
    // If not found, try from URL
    if (!episodeNumber) {
      const urlMatch = pageUrl.match(/episode[-_](\d+)/i);
      if (urlMatch && urlMatch[1]) {
        episodeNumber = parseInt(urlMatch[1]);
      }
    }
    
    // Extract image
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('.poster img').attr('src') || 
                  $('.anime-poster img').attr('src') || 
                  $('.anime-image img').attr('src');
    
    // Create anime info object
    const animeInfo = {
      title: animeTitle,
      episode: episodeNumber,
      url: pageUrl,
      image: image
    };
    
    return animeInfo;
  } catch (error) {
    console.error('Error extracting anime info:', error);
    return null;
  }
}

// Extract video URL from page
async function extractVideoUrl(page) {
  try {
    // Try common video selectors
    const videoSelectors = [
      'video source',
      '.video-js source',
      '.player video source',
      'video'
    ];
    
    for (const selector of videoSelectors) {
      const videoElement = await page.$(selector);
      if (videoElement) {
        const src = await page.evaluate(el => el.src || el.getAttribute('src'), videoElement);
        if (src && src.startsWith('http')) {
          return src;
        }
      }
    }
    
    // Try to find m3u8 or mp4 URLs in page
    const urls = await page.evaluate(() => {
      const urlRegex = /(https?:\/\/[^\s"']+\.(?:m3u8|mp4))/g;
      const html = document.documentElement.outerHTML;
      return Array.from(html.matchAll(urlRegex)).map(match => match[1]);
    });
    
    if (urls && urls.length > 0) {
      return urls[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video URL:', error);
    return null;
  }
}

// Download video
async function downloadVideo(url, filename) {
  try {
    // Create the downloads directory if it doesn't exist
    const downloadDir = path.resolve('./downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^\w\s.-]/g, '');
    const filePath = path.join(downloadDir, sanitizedFilename);
    
    // Download the file
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });
    
    // Create write stream
    const writer = fs.createWriteStream(filePath);
    
    // Pipe the response to the file
    response.data.pipe(writer);
    
    // Return a promise that resolves when the download is complete
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading video:', error);
    return false;
  }
}

// Check for Cloudflare challenge
async function checkForCloudflare(page) {
  try {
    // Check for common Cloudflare elements
    const cloudflareElements = [
      '#cf-challenge-running',
      '.cf-browser-verification',
      '.cf-im-under-attack',
      'iframe[src*="cloudflare"]'
    ];
    
    for (const selector of cloudflareElements) {
      const element = await page.$(selector);
      if (element) {
        return true;
      }
    }
    
    // Check for Cloudflare text
    const pageText = await page.evaluate(() => document.body.innerText);
    const cloudflareTexts = [
      'Checking your browser',
      'Please wait while we verify',
      'Just a moment',
      'Please turn JavaScript on',
      'Please enable Cookies',
      'Please stand by, while we are checking your browser'
    ];
    
    for (const text of cloudflareTexts) {
      if (pageText.includes(text)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for Cloudflare:', error);
    return false;
  }
}

// Setup ad blocking
async function setupAdBlocking(page) {
  try {
    // Block common ad domains
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url().toLowerCase();
      const adDomains = [
        'googlesyndication.com',
        'adservice.google.com',
        'doubleclick.net',
        'googleadservices.com',
        'adnxs.com',
        'taboola.com',
        'outbrain.com',
        'exoclick.com',
        'mgid.com',
        'popads.net',
        'advertising.com',
        'popunder',
        'banner'
      ];
      
      const adTypes = [
        'image/gif',
        'image/jpeg',
        'image/png'
      ];
      
      // Block requests to ad domains or ad types
      if (adDomains.some(domain => url.includes(domain)) || 
          (request.resourceType() === 'image' && adTypes.includes(request.headers()['content-type']))) {
        request.abort();
      } else {
        request.continue();
      }
    });
  } catch (error) {
    console.error('Error setting up ad blocking:', error);
  }
}

// Clean up resources
async function cleanupPuppeteer() {
  if (browser) {
    try {
      await browser.close();
      browser = null;
      console.log('Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

module.exports = {
  setupPuppeteerHandlers,
  initPuppeteer,
  cleanupPuppeteer
}; 