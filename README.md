# 🛍️ Shopify Product Scraper

Ek powerful Chrome extension jo kisi bhi Shopify store se saari products ko scrape karke Shopify-compatible CSV file mein export karta hai.

## ✨ Features

- **Complete Product Data**: Saari product details extract karta hai including:
  - Product title, description
  - Price aur compare-at price
  - Vendor aur product type
  - Tags
  - Product images (saari images)
  - Variants (size, color, etc.)
  - SKU aur barcodes

- **Shopify-Ready CSV**: CSV file bilkul Shopify ke import format mein hoti hai, seedha import kar sakte hain

- **Multiple Scraping Methods**: 
  - Shopify API se data fetch karta hai (fastest)
  - Agar API available nahi hai to DOM scraping use karta hai

- **Progress Tracking**: Real-time progress bar dikhata hai kitne products scrape ho chuke hain

- **Beautiful UI**: Modern gradient design with smooth animations

## 📦 Installation

1. Is repository ko download ya clone karein
2. Chrome browser mein `chrome://extensions/` open karein
3. "Developer mode" enable karein (top right corner)
4. "Load unpacked" button click karein
5. `shopify scraper` folder select karein
6. Extension install ho jayega!

## 🚀 Usage

1. Kisi bhi Shopify store ko open karein
2. Products page ya collection page par jaayein
3. Extension icon click karein
4. "Start Scraping" button click karein
5. Wait karein jab tak saari products scrape ho jayein
6. CSV file automatically download ho jayegi

## 📝 CSV Format

CSV file mein yeh saari fields hongi:
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
- Aur bhi bohot kuch!

## 🎯 Best Practices

1. **Collection Pages**: Best results ke liye collection pages use karein
2. **Internet Speed**: Achi internet speed se scraping fast hogi
3. **Large Stores**: Agar store mein bohot zyada products hain to thoda time lagega

## 🔧 Technical Details

- **Manifest Version**: 3 (latest)
- **Permissions**: Active tab, scripting, downloads
- **API Support**: Shopify products.json API
- **Fallback**: DOM scraping agar API available nahi hai

## 🐛 Troubleshooting

**"This does not appear to be a Shopify store"**
- Make sure aap Shopify store par hain
- URL check karein

**"No products found"**
- Products page ya collection page par jaayein
- Home page par scraping nahi hogi

**"Could not extract product data"**
- Kuch stores custom themes use karte hain
- Try karein different collection page

## 💡 Tips

- Scraping se pehle make sure karein ke page fully load ho gaya hai
- Agar bohot saari products hain to patience rakhein
- CSV file ko Shopify admin mein Products > Import se upload karein

## 🙏 Support

Agar koi issue ho ya suggestion ho to feel free to reach out!

## 📄 License

Free to use for personal and commercial purposes.

---

**Made with ❤️ for Shopify merchants**
