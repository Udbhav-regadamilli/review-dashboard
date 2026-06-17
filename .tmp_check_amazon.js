const fetch = require('node-fetch');
const urls = ['https://amzn.in/d/07vKnqI2','https://amzn.in/d/01qnlA6F','https://amzn.in/d/03eooMZA'];
(async () => {
  for (const url of urls) {
    console.log('URL:', url);
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' } });
    console.log('status', res.status);
    console.log('final URL', res.url);
    const text = await res.text();
    console.log('contains review attr', text.includes('data-hook="review"'));
    console.log('first 400 chars around marker:');
    const idx = text.indexOf('data-hook="review"');
    if (idx !== -1) {
      console.log(text.slice(idx, idx + 400).replace(/\n/g, ' '));
    }
    console.log('---');
  }
})();
