# Export Mode Feature Guide

## Overview
Extension ab do export modes support karti hai:
1. **Current Collection** - Sirf current collection ki products export karega
2. **All Products** - Store ki saari products export karega

## How It Works

### Current Collection Mode (Default)
- URL se collection handle detect karta hai
- Sirf us collection ki products fetch karta hai
- Fast aur efficient
- Best for specific collections

**Example URLs:**
- `https://store.myshopify.com/collections/summer-sale`
- `https://store.com/collections/new-arrivals`

### All Products Mode
- Store ki saari products fetch karta hai
- `/products.json` API use karta hai
- Thoda slow ho sakta hai large stores ke liye
- Complete store export ke liye

## UI Changes

### Radio Button Selection
```
📂 Current Collection  (Default)
🌐 All Products
```

- User apni choice select kar sakta hai
- Selected option highlight hota hai
- Hover effect for better UX

## Technical Implementation

### 1. Export Mode Detection
```javascript
const exportMode = document.querySelector('input[name="exportMode"]:checked').value;
```

### 2. Mode Injection
```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (mode) => { window.EXPORT_MODE = mode; },
  args: [exportMode]
});
```

### 3. Collection Detection
```javascript
const urlPath = window.location.pathname;
const collectionMatch = urlPath.match(/\/collections\/([^\/]+)/);
```

### 4. API Endpoints
- **All Products**: `/products.json?limit=250&page=1`
- **Collection**: `/collections/{handle}/products.json?limit=250&page=1`

## Usage Instructions

1. **For Current Collection:**
   - Navigate to any collection page
   - Select "Current Collection" (default)
   - Click "Start Scraping"
   - Only that collection's products will be exported

2. **For All Products:**
   - Navigate to any Shopify store page
   - Select "All Products"
   - Click "Start Scraping"
   - All store products will be exported

## Benefits

### Current Collection Mode
✅ Faster scraping
✅ Targeted export
✅ Less data to process
✅ Perfect for specific collections

### All Products Mode
✅ Complete store backup
✅ Full catalog export
✅ No need to visit each collection
✅ One-click full export

## Error Handling

- If not on collection page + "Current Collection" selected → Falls back to all products
- If API fails → Falls back to DOM scraping
- Progress updates for both modes
- Clear error messages

## Status Messages

- **Current Collection**: "Scraping current collection..."
- **All Products**: "Fetching all products..."

## Testing

1. Test on collection page with "Current Collection"
2. Test on home page with "All Products"
3. Verify correct products are exported
4. Check CSV contains expected data
