// Content script - runs on all pages
console.log('Shopify Scraper content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkShopify') {
    const isShopify = checkIfShopify();
    sendResponse({ isShopify: isShopify });
  }
  return true;
});

function checkIfShopify() {
  // Check if page is a Shopify store
  return !!(
    window.Shopify ||
    document.querySelector('meta[name="shopify-digital-wallet"]') ||
    document.querySelector('[data-shopify]') ||
    document.body.innerHTML.includes('cdn.shopify.com')
  );
}
