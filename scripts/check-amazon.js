(async () => {
  try {
    const url = process.argv[2] || 'https://www.amazon.in/product-reviews/B07RQW6SD5?sortBy=recent&formatType=all_reviews&pageNumber=1';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log('url:', url);
    console.log('status:', res.status);
    console.log('length:', text.length);
    const markers = ['data-hook="review"', "data-hook='review'", 'cm_cr-review_list', 'customer_review-', 'reviewText', 'review-title', 'cr-lp-review', 'reviewBody', 'data-review-id', 'a-section review'];
    for (const m of markers) {
      console.log(m + ':', text.includes(m));
    }
    console.log('snippet:');
    console.log(text.slice(0, 16000));
  } catch (e) {
    console.error('error', e);
    process.exit(2);
  }
})();
