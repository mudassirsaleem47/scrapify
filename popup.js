document.addEventListener('DOMContentLoaded', async function () {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const statusBox = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // Display last updated time function
  function displayLastUpdated() {
    const updateTimeElement = document.getElementById('updateTime');

    if (!updateTimeElement) return;

    // Store install time in storage if not exists
    chrome.storage.local.get(['installTime'], (result) => {
      let savedInstallTime = result.installTime;

      if (!savedInstallTime) {
        // First time - save current time
        savedInstallTime = Date.now();
        chrome.storage.local.set({ installTime: savedInstallTime });
      }

      // Update the display
      function updateTimeAgo() {
        const now = Date.now();
        const diff = now - savedInstallTime;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let timeAgo;
        if (days > 0) {
          timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
          timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
          timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
          timeAgo = 'just now';
        }

        updateTimeElement.textContent = timeAgo;
      }

      // Update immediately
      updateTimeAgo();

      // Update every minute
      setInterval(updateTimeAgo, 60000);
    });
  }

  // Display last updated time
  displayLastUpdated();

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

              // Check if on product page
              const productMatch = window.location.pathname.match(/\/products\/([^\/\?]+)/);
              const productHandle = productMatch ? productMatch[1] : null;

              // Return info for async fetch
              return {
                isShopify: true,
                baseUrl: window.location.origin,
                collectionHandle: collectionHandle,
                productHandle: productHandle,
                isProductPage: !!productHandle
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
        // Check export mode on status update
        const getSelectedMode = () => {
          const selected = document.querySelector('input[name="exportMode"]:checked');
          return selected ? selected.value : 'collection';
        };

        // Add listener to update status when mode changes
        document.querySelectorAll('input[name="exportMode"]').forEach(radio => {
          radio.addEventListener('change', () => {
            const mode = getSelectedMode();
            updateStatusMessage(result, mode);
          });
        });

        // Initial status update
        updateStatusMessage(result, getSelectedMode());
        scrapeBtn.disabled = false;
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

  function updateStatusMessage(result, mode) {
    if (mode === 'single') {
      if (result.isProductPage && result.productHandle) {
        updateStatus(`✓ Product Page Detected | Ready to export: ${result.productHandle.replace(/-/g, ' ')}`, 'success');
      } else {
        updateStatus('⚠ Please navigate to a product page to export single product', 'warning');
      }
    } else if (result.collectionHandle) {
      updateStatus(`✓ Shopify Store Detected | Collection: ${result.collectionHandle}`, 'success');
    } else if (result.isProductPage) {
      updateStatus(`✓ Shopify Store Detected | On product page`, 'success');
    } else {
      updateStatus(`✓ Shopify Store Detected | Ready to scrape`, 'success');
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
    // Shopify CSV headers - EXACT format from official Shopify export
    const headers = [
      'Handle',
      'Title',
      'Body (HTML)',
      'Vendor',
      'Product Category',
      'Type',
      'Tags',
      'Published',
      'Option1 Name',
      'Option1 Value',
      'Option1 Linked To',
      'Option2 Name',
      'Option2 Value',
      'Option2 Linked To',
      'Option3 Name',
      'Option3 Value',
      'Option3 Linked To',
      'Variant SKU',
      'Variant Grams',
      'Variant Inventory Tracker',
      'Variant Inventory Qty',
      'Variant Inventory Policy',
      'Variant Fulfillment Service',
      'Variant Price',
      'Variant Compare At Price',
      'Variant Requires Shipping',
      'Variant Taxable',
      'Unit Price Total Measure',
      'Unit Price Total Measure Unit',
      'Unit Price Base Measure',
      'Unit Price Base Measure Unit',
      'Variant Barcode',
      'Image Src',
      'Image Position',
      'Image Alt Text',
      'Gift Card',
      'SEO Title',
      'SEO Description',
      'Variant Image',
      'Variant Weight Unit',
      'Variant Tax Code',
      'Cost per item',
      'Status'
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
            // Handle - only on first variant
            isFirstVariant ? escapeCSV(handle) : escapeCSV(handle),
            // Title - only on first variant
            isFirstVariant ? escapeCSV(product.title) : '',
            // Body (HTML) - only on first variant
            isFirstVariant ? escapeCSV(product.description || '') : '',
            // Vendor - only on first variant
            isFirstVariant ? escapeCSV(product.vendor || '') : '',
            // Product Category - empty
            '',
            // Type - only on first variant
            isFirstVariant ? escapeCSV(product.type || '') : '',
            // Tags - only on first variant (includes collections)
            isFirstVariant ? escapeCSV(allTags) : '',
            // Published - only on first variant
            isFirstVariant ? 'true' : '',
            // Option1 Name - only on first variant
            isFirstVariant && variant.option1Name ? escapeCSV(variant.option1Name) : '',
            // Option1 Value
            escapeCSV(variant.option1Value || ''),
            // Option1 Linked To - empty
            '',
            // Option2 Name - only on first variant
            isFirstVariant && variant.option2Name ? escapeCSV(variant.option2Name) : '',
            // Option2 Value
            escapeCSV(variant.option2Value || ''),
            // Option2 Linked To - empty
            '',
            // Option3 Name - only on first variant
            isFirstVariant && variant.option3Name ? escapeCSV(variant.option3Name) : '',
            // Option3 Value
            escapeCSV(variant.option3Value || ''),
            // Option3 Linked To - empty
            '',
            // Variant SKU
            escapeCSV(variant.sku || ''),
            // Variant Grams
            escapeCSV(variant.weight || '0.0'),
            // Variant Inventory Tracker
            'shopify',
            // Variant Inventory Qty
            '10',
            // Variant Inventory Policy
            'deny',
            // Variant Fulfillment Service
            'manual',
            // Variant Price
            escapeCSV(variant.price || product.price || ''),
            // Variant Compare At Price
            escapeCSV(variant.compareAtPrice || ''),
            // Variant Requires Shipping
            'true',
            // Variant Taxable
            'false',
            // Unit Price Total Measure - empty
            '',
            // Unit Price Total Measure Unit - empty
            '',
            // Unit Price Base Measure - empty
            '',
            // Unit Price Base Measure Unit - empty
            '',
            // Variant Barcode
            escapeCSV(variant.barcode || ''),
            // Image Src - only first variant gets first image
            isFirstVariant && product.images && product.images[0] ? escapeCSV(product.images[0]) : '',
            // Image Position - only first variant
            isFirstVariant && product.images && product.images[0] ? '1' : '',
            // Image Alt Text - empty
            '',
            // Gift Card
            'false',
            // SEO Title - only on first variant
            isFirstVariant ? escapeCSV(product.title) : '',
            // SEO Description - only on first variant
            isFirstVariant ? escapeCSV(seoDescription) : '',
            // Variant Image
            variant.image ? escapeCSV(variant.image) : '',
            // Variant Weight Unit
            'g',
            // Variant Tax Code - empty
            '',
            // Cost per item - empty
            '',
            // Status - only on first variant
            isFirstVariant ? 'active' : ''
          ];
          
          csvContent += row.join(',') + '\n';
        });
        
        // Add additional product images (if any)
        if (product.images && product.images.length > 1) {
          for (let i = 1; i < product.images.length; i++) {
            const imageRow = new Array(headers.length).fill('');
            imageRow[0] = escapeCSV(handle); // Handle
            imageRow[32] = escapeCSV(product.images[i]); // Image Src
            imageRow[33] = (i + 1).toString(); // Image Position
            csvContent += imageRow.join(',') + '\n';
          }
        }
      } else {
        // Product without variants
        const row = [
          // Handle
          escapeCSV(handle),
          // Title
          escapeCSV(product.title),
          // Body (HTML)
          escapeCSV(product.description || ''),
          // Vendor
          escapeCSV(product.vendor || ''),
          // Product Category - empty
          '',
          // Type
          escapeCSV(product.type || ''),
          // Tags (includes collections)
          escapeCSV(allTags),
          // Published
          'true',
          // Option1 Name - empty
          '',
          // Option1 Value - empty
          '',
          // Option1 Linked To - empty
          '',
          // Option2 Name - empty
          '',
          // Option2 Value - empty
          '',
          // Option2 Linked To - empty
          '',
          // Option3 Name - empty
          '',
          // Option3 Value - empty
          '',
          // Option3 Linked To - empty
          '',
          // Variant SKU - empty
          '',
          // Variant Grams
          '0.0',
          // Variant Inventory Tracker
          'shopify',
          // Variant Inventory Qty
          '10',
          // Variant Inventory Policy
          'deny',
          // Variant Fulfillment Service
          'manual',
          // Variant Price
          escapeCSV(product.price || ''),
          // Variant Compare At Price
          escapeCSV(product.compareAtPrice || ''),
          // Variant Requires Shipping
          'true',
          // Variant Taxable
          'false',
          // Unit Price Total Measure - empty
          '',
          // Unit Price Total Measure Unit - empty
          '',
          // Unit Price Base Measure - empty
          '',
          // Unit Price Base Measure Unit - empty
          '',
          // Variant Barcode - empty
          '',
          // Image Src
          product.images && product.images[0] ? escapeCSV(product.images[0]) : '',
          // Image Position
          product.images && product.images[0] ? '1' : '',
          // Image Alt Text - empty
          '',
          // Gift Card
          'false',
          // SEO Title
          escapeCSV(product.title),
          // SEO Description
          escapeCSV(seoDescription),
          // Variant Image - empty
          '',
          // Variant Weight Unit
          'g',
          // Variant Tax Code - empty
          '',
          // Cost per item - empty
          '',
          // Status
          'active'
        ];
        
        csvContent += row.join(',') + '\n';
        
        // Add additional product images (if any)
        if (product.images && product.images.length > 1) {
          for (let i = 1; i < product.images.length; i++) {
            const imageRow = new Array(headers.length).fill('');
            imageRow[0] = escapeCSV(handle); // Handle
            imageRow[32] = escapeCSV(product.images[i]); // Image Src
            imageRow[33] = (i + 1).toString(); // Image Position
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