# 🛍️ Scrapify

A powerful Chrome extension that scrapes all products from any Shopify store and exports them to a Shopify-compatible CSV file.

## ✨ Features

- **Complete Product Data**: Extracts all product details including:
  - Product title and description
  - Price and compare-at price
  - Vendor and product type
  - Tags
  - All product images
  - Variants (size, color, etc.)
  - SKU and barcodes

- **Shopify-Ready CSV**: CSV file is in Shopify's exact import format, ready for direct import

- **Multiple Scraping Methods**: 
  - Fetches data from Shopify API (fastest method)
  - Falls back to DOM scraping if API is unavailable

- **Progress Tracking**: Real-time progress bar shows how many products have been scraped

- **Beautiful UI**: Modern gradient design with smooth animations

## 📦 Installation

### Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "Scrapify"
3. Click "Add to Chrome"
4. Extension is now installed!

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome browser
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked" button
5. Select the downloaded folder

## 🚀 Usage

1. Open any Shopify store
2. Navigate to a products page or collection page
3. Click the Scrapify extension icon
4. Click "Start Scraping" button
5. Wait while all products are scraped
6. CSV file will download automatically

## 📝 CSV Format

The CSV file includes all these fields:
- Handle
- Title
- Body (HTML)
- Vendor
- Type
- Tags
- Published status
- Options (Size, Color, etc.)
- Variant details
- Pricing
- Images
- SEO information
- And much more!

## 🎯 Best Practices

1. **Collection Pages**: Use collection pages for best results
2. **Internet Speed**: Faster internet speeds result in faster scraping
3. **Large Stores**: Stores with many products may take some time to scrape

## 🔧 Technical Details

- **Manifest Version**: 3 (latest)
- **Permissions**: Active tab, scripting, downloads
- **API Support**: Shopify products.json API
- **Fallback**: DOM scraping if API is unavailable

## 🐛 Troubleshooting

**"This does not appear to be a Shopify store"**
- Make sure you're on a Shopify store
- Check the URL

**"No products found"**
- Navigate to a products page or collection page
- Scraping won't work on the home page

**"Could not extract product data"**
- Some stores use custom themes
- Try a different collection page

## 💡 Tips

- Make sure the page is fully loaded before scraping
- Be patient if there are many products
- Upload the CSV file in Shopify admin via Products → Import

## 🙏 Support

If you have any issues or suggestions, feel free to reach out!

## 📄 License

Free to use for personal and commercial purposes.

---

**Made with ❤️ by Scrapify Team**

**Scrapify** - The easiest way to export Shopify products
