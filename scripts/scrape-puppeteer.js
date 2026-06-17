const puppeteer = require('puppeteer');

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scrape-puppeteer.js <url>');
    process.exit(2);
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Make headless less detectable
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // mock plugins
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // capture console messages to stderr to help debugging
    page.on('console', (msg) => {
      try {
        const txt = msg.text();
        if (txt) console.error('puppeteer:console:', txt);
      } catch (e) {
        /* ignore */
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

    // additional wait to allow any client rendering
    await page.waitForTimeout(2000);

    try {
      await page.waitForSelector('div[data-hook="review"]', { timeout: 10000 });
    } catch (e) {
      // not found — we'll still return the rendered HTML for inspection
    }

    // diagnostics: output final URL and title to stderr (keeps stdout for HTML)
    try {
      const finalUrl = page.url();
      const title = await page.title();
      console.error('puppeteer:finalUrl:', finalUrl);
      console.error('puppeteer:title:', title);
    } catch (e) {
      // ignore
    }

    const html = await page.content();
    // print the full HTML to stdout for the caller to parse
    console.log(html);
    await page.close();
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('scrape-puppeteer error', err && err.stack ? err.stack : err);
    process.exit(3);
  }
}

run();
