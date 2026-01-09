document.addEventListener('DOMContentLoaded', async function () {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const statusBox = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // Auto-detect Shopify store on popup open
  await detectShopifyStore();

  // Set up message listener BEFORE button click
  let messageListener = null;

  scrapeBtn.addEventListener('click', async function() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url) {
        updateStatus('Please navigate to a Shopify store first', 'error');
        return;
      }

      // Get selected export mode
      const exportMode = document.querySelector('input[name="exportMode"]:checked').value;

      // Disable button
      scrapeBtn.disabled = true;
      scrapeBtn.innerHTML = '<span class="btn-icon">⏳</span> Scraping...';
      
      // Show progress
      progressContainer.style.display = 'block';
      updateStatus(exportMode === 'all' ? 'Fetching all products...' : 'Scraping current collection...', 'warning');

      // Remove old listener if exists
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }

      // Set up listener BEFORE injecting script
      messageListener = function(request, sender, sendResponse) {
        console.log('Received message:', request);
        
        if (request.action === 'updateProgress') {
          updateProgress(request.current, request.total);
        } else if (request.action === 'scrapingComplete') {
          chrome.runtime.onMessage.removeListener(messageListener);
          messageListener = null;
          handleScrapingComplete(request.products);
        } else if (request.action === 'scrapingError') {
          chrome.runtime.onMessage.removeListener(messageListener);
          messageListener = null;
          handleScrapingError(request.error);
        }
        return true; // Keep channel open for async response
      };

      chrome.runtime.onMessage.addListener(messageListener);

      // Small delay to ensure listener is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Inject export mode as a global variable first
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (mode) => { window.EXPORT_MODE = mode; },
        args: [exportMode]
      });

      // Now inject and execute scraper
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scraper.js']
      });

    } catch (error) {
      console.error('Error:', error);
      updateStatus('Error: ' + error.message, 'error');
      resetButton();
      if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
        messageListener = null;
      }
    }
  });

  function handleScrapingError(error) {
    updateStatus('Error: ' + error, 'error');
    resetButton();
  }

  function resetButton() {
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Start Export
    `;
    scrapeBtn.onclick = null;
    progressContainer.style.display = 'none';
  }

  async function detectShopifyStore() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        updateStatus('Please navigate to a website first', 'warning');
        scrapeBtn.disabled = true;
        return;
      }

      // Inject detection script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Check if Shopify
          const isShopify = window.Shopify ||
            document.querySelector('meta[name="shopify-checkout-api-token"]') ||
            document.querySelector('script[src*="shopify"]') ||
            window.ShopifyAnalytics;

          // Try to get product count from Shopify API
          let productCount = 0;
          if (isShopify) {
            try {
              const pathParts = window.location.pathname.split('/');
              const collectionHandle = pathParts.includes('collections') ?
                pathParts[pathParts.indexOf('collections') + 1] : null;

              // Return info for async fetch
              return {
                isShopify: true,
                baseUrl: window.location.origin,
                collectionHandle: collectionHandle
              };
            } catch (e) {
              return { isShopify: true, baseUrl: window.location.origin };
            }
          }

          return { isShopify: false };
        }
      });

      const result = results[0].result;

      if (result.isShopify) {
        // Try to fetch product count
        try {
          let url = `${result.baseUrl}/products.json?limit=1`;
          if (result.collectionHandle) {
            url = `${result.baseUrl}/collections/${result.collectionHandle}/products.json?limit=1`;
          }

          const response = await fetch(url);
          const data = await response.json();

          // Get total count from headers or estimate
          const productCount = data.products ? data.products.length : 0;

          if (result.collectionHandle) {
            updateStatus(`✓ Shopify Store Detected | Collection: ${result.collectionHandle}`, 'success');
          } else {
            updateStatus(`✓ Shopify Store Detected | Ready to scrape`, 'success');
          }
          scrapeBtn.disabled = false;
        } catch (e) {
          updateStatus('✓ Shopify Store Detected | Ready to scrape', 'success');
          scrapeBtn.disabled = false;
        }
      } else {
        updateStatus('⚠ Not a Shopify store - Please visit a Shopify store', 'error');
        scrapeBtn.disabled = true;
      }
    } catch (error) {
      console.error('Detection error:', error);
      updateStatus('Ready to export products', '');
      scrapeBtn.disabled = false;
    }
  }

  function updateStatus(message, type = '') {
    statusBox.className = 'status-box ' + type;
    const indicator = type ? '<div class="status-indicator"></div>' : '';
    statusBox.innerHTML = indicator + '<p>' + message + '</p>';
  }

  function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = percentage + '%';
    progressText.textContent = `${current} / ${total} products`;
    updateStatus(`Scraping products... ${current} of ${total}`, 'warning');
  }

  let scrapedCSV = null;
  let scrapedFilename = null;

  function handleScrapingComplete(products) {
    updateStatus(`Successfully scraped ${products.length} products!`, 'success');
    progressFill.style.width = '100%';
    
    // Generate CSV but don't download yet
    scrapedCSV = generateShopifyCSV(products);
    scrapedFilename = `shopify-products-${Date.now()}.csv`;
    
    // Change button to download button
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Download CSV
    `;
    scrapeBtn.onclick = function () {
      if (scrapedCSV) {
        downloadCSV(scrapedCSV, scrapedFilename);
        updateStatus('CSV downloaded successfully!', 'success');
        setTimeout(() => {
          resetButton();
          scrapedCSV = null;
          scrapedFilename = null;
        }, 2000);
      }
    };
  }

  function handleScrapingError(error) {
    updateStatus('Error: ' + error, 'error');
    resetButton();
  }

  function resetButton() {
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Start Export
    `;
    scrapeBtn.onclick = null;
    progressContainer.style.display = 'none';
  }

  function generateShopifyCSV(products) {
    // Shopify CSV headers - EXACT format from official template
    const headers = [
      'Title',
      'URL handle',
      'Description',
      'Vendor',
      'Product category',
      'Type',
      'Tags',
      'Published on online store',
      'Status',
      'SKU',
      'Barcode',
      'Option1 name',
      'Option1 value',
      'Option2 name',
      'Option2 value',
      'Option3 name',
      'Option3 value',
      'Price',
      'Price / International',
      'Compare-at price',
      'Compare-at price / International',
      'Cost per item',
      'Charge tax',
      'Tax code',
      'Unit price total measure',
      'Unit price total measure unit',
      'Unit price base measure',
      'Unit price base measure unit',
      'Inventory tracker',
      'Inventory quantity',
      'Continue selling when out of stock',
      'Weight value (grams)',
      'Weight unit for display',
      'Requires shipping',
      'Fulfillment service',
      'Product image URL',
      'Image position',
      'Image alt text',
      'Variant image URL',
      'Gift card',
      'SEO title',
      'SEO description',
      'Google Shopping / Google product category',
      'Google Shopping / Gender',
      'Google Shopping / Age group',
      'Google Shopping / MPN',
      'Google Shopping / AdWords Grouping',
      'Google Shopping / AdWords labels',
      'Google Shopping / Condition',
      'Google Shopping / Custom product',
      'Google Shopping / Custom label 0',
      'Google Shopping / Custom label 1',
      'Google Shopping / Custom label 2',
      'Google Shopping / Custom label 3',
      'Google Shopping / Custom label 4'
    ];

    let csvContent = headers.join(',') + '\n';

    products.forEach(product => {
      const handle = generateHandle(product.title);
      const cleanDescription = (product.description || '').replace(/<[^>]*>/g, '').trim();
      const seoDescription = cleanDescription.substring(0, 320);
      
      // Add collection names to tags with "Collection:" prefix
      let allTags = product.tags || '';
      if (product.collections && product.collections.length > 0) {
        const collectionTags = product.collections.map(c => `Collection:${c}`).join(', ');
        allTags = allTags ? `${allTags}, ${collectionTags}` : collectionTags;
      }

      // If product has variants
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant, variantIndex) => {
          const isFirstVariant = variantIndex === 0;
          
          const row = [
            // Title - only on first variant
            isFirstVariant ? escapeCSV(product.title) : '',
            // URL handle - only on first variant
            isFirstVariant ? escapeCSV(handle) : '',
            // Description - only on first variant
            isFirstVariant ? escapeCSV(cleanDescription) : '',
            // Vendor - only on first variant
            isFirstVariant ? escapeCSV(product.vendor || '') : '',
            // Product category - empty (Shopify only accepts Google taxonomy)
            '',
            // Type - only on first variant
            isFirstVariant ? escapeCSV(product.type || '') : '',
            // Tags - only on first variant (includes collections)
            isFirstVariant ? escapeCSV(allTags) : '',
            // Published on online store - only on first variant
            isFirstVariant ? 'TRUE' : '',
            // Status - only on first variant
            isFirstVariant ? 'active' : '',
            // SKU
            escapeCSV(variant.sku || ''),
            // Barcode
            escapeCSV(variant.barcode || ''),
            // Option1 name - only on first variant
            isFirstVariant && variant.option1Name ? escapeCSV(variant.option1Name) : '',
            // Option1 value
            escapeCSV(variant.option1Value || ''),
            // Option2 name - only on first variant
            isFirstVariant && variant.option2Name ? escapeCSV(variant.option2Name) : '',
            // Option2 value
            escapeCSV(variant.option2Value || ''),
            // Option3 name - only on first variant
            isFirstVariant && variant.option3Name ? escapeCSV(variant.option3Name) : '',
            // Option3 value
            escapeCSV(variant.option3Value || ''),
            // Price
            escapeCSV(variant.price || product.price || ''),
            // Price / International - empty
            '',
            // Compare-at price
            escapeCSV(variant.compareAtPrice || ''),
            // Compare-at price / International - empty
            '',
            // Cost per item - empty
            '',
            // Charge tax
            'TRUE',
            // Tax code - empty
            '',
            // Unit price total measure - empty
            '',
            // Unit price total measure unit - empty
            '',
            // Unit price base measure - empty
            '',
            // Unit price base measure unit - empty
            '',
            // Inventory tracker - empty (can be 'shopify' if needed)
            '',
            // Inventory quantity
            '0',
            // Continue selling when out of stock
            'deny',
            // Weight value (grams)
            escapeCSV(variant.weight || ''),
            // Weight unit for display
            'g',
            // Requires shipping
            'TRUE',
            // Fulfillment service
            'manual',
            // Product image URL - only first variant gets first image
            isFirstVariant && product.images && product.images[0] ? escapeCSV(product.images[0]) : '',
            // Image position - only first variant
            isFirstVariant && product.images && product.images[0] ? '1' : '',
            // Image alt text - empty
            '',
            // Variant image URL
            variant.image ? escapeCSV(variant.image) : '',
            // Gift card
            'FALSE',
            // SEO title - only on first variant
            isFirstVariant ? escapeCSV(product.title) : '',
            // SEO description - only on first variant
            isFirstVariant ? escapeCSV(seoDescription) : '',
            // Google Shopping fields - all empty
            '', '', '', '', '', '', '', '', '', '', '', '', ''
          ];
          
          csvContent += row.join(',') + '\n';
        });
        
        // Add additional product images (if any)
        if (product.images && product.images.length > 1) {
          for (let i = 1; i < product.images.length; i++) {
            const imageRow = new Array(headers.length).fill('');
            imageRow[0] = ''; // Title - empty
            imageRow[1] = escapeCSV(handle); // URL handle
            imageRow[35] = escapeCSV(product.images[i]); // Product image URL
            imageRow[36] = (i + 1).toString(); // Image position
            csvContent += imageRow.join(',') + '\n';
          }
        }
      } else {
        // Product without variants
        const row = [
          // Title
          escapeCSV(product.title),
          // URL handle
          escapeCSV(handle),
          // Description
          escapeCSV(cleanDescription),
          // Vendor
          escapeCSV(product.vendor || ''),
          // Product category - empty (Shopify only accepts Google taxonomy)
          '',
          // Type
          escapeCSV(product.type || ''),
          // Tags (includes collections)
          escapeCSV(allTags),
          // Published on online store
          'TRUE',
          // Status
          'active',
          // SKU - empty
          '',
          // Barcode - empty
          '',
          // Option1 name - empty
          '',
          // Option1 value - empty
          '',
          // Option2 name - empty
          '',
          // Option2 value - empty
          '',
          // Option3 name - empty
          '',
          // Option3 value - empty
          '',
          // Price
          escapeCSV(product.price || ''),
          // Price / International - empty
          '',
          // Compare-at price
          escapeCSV(product.compareAtPrice || ''),
          // Compare-at price / International - empty
          '',
          // Cost per item - empty
          '',
          // Charge tax
          'TRUE',
          // Tax code - empty
          '',
          // Unit price total measure - empty
          '',
          // Unit price total measure unit - empty
          '',
          // Unit price base measure - empty
          '',
          // Unit price base measure unit - empty
          '',
          // Inventory tracker - empty
          '',
          // Inventory quantity
          '0',
          // Continue selling when out of stock
          'deny',
          // Weight value (grams) - empty
          '',
          // Weight unit for display
          'g',
          // Requires shipping
          'TRUE',
          // Fulfillment service
          'manual',
          // Product image URL
          product.images && product.images[0] ? escapeCSV(product.images[0]) : '',
          // Image position
          product.images && product.images[0] ? '1' : '',
          // Image alt text - empty
          '',
          // Variant image URL - empty
          '',
          // Gift card
          'FALSE',
          // SEO title
          escapeCSV(product.title),
          // SEO description
          escapeCSV(seoDescription),
          // Google Shopping fields - all empty
          '', '', '', '', '', '', '', '', '', '', '', '', ''
        ];
        
        csvContent += row.join(',') + '\n';
        
        // Add additional product images (if any)
        if (product.images && product.images.length > 1) {
          for (let i = 1; i < product.images.length; i++) {
            const imageRow = new Array(headers.length).fill('');
            imageRow[0] = ''; // Title - empty
            imageRow[1] = escapeCSV(handle); // URL handle
            imageRow[35] = escapeCSV(product.images[i]); // Product image URL
            imageRow[36] = (i + 1).toString(); // Image position
            csvContent += imageRow.join(',') + '\n';
          }
        }
      }
    });

    return csvContent;
  }

  function escapeCSV(str) {
    if (str === null || str === undefined) return '';
    str = str.toString().trim();
    
    // Always quote if contains comma, quote, newline, or carriage return
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      // Escape quotes by doubling them
      str = str.replace(/"/g, '""');
      // Remove any carriage returns
      str = str.replace(/\r/g, '');
      return '"' + str + '"';
    }
    
    return str;
  }

  function generateHandle(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  }
});
