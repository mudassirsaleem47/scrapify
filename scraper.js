// This script will be injected into the page to scrape Shopify products
(async function() {
  try {
    console.log('Shopify Scraper started...');
    
    // Check if this is a Shopify store
    if (!window.Shopify && !document.querySelector('meta[name="shopify-digital-wallet"]')) {
      chrome.runtime.sendMessage({
        action: 'scrapingError',
        error: 'This does not appear to be a Shopify store'
      });
      return;
    }

    const products = [];
    let scrapedCount = 0;

    // Method 1: Try to get products from Shopify API
    try {
      const allProducts = await fetchAllProductsFromAPI();
      if (allProducts && allProducts.length > 0) {
        console.log(`Found ${allProducts.length} products via API`);
        chrome.runtime.sendMessage({
          action: 'scrapingComplete',
          products: allProducts
        });
        return;
      }
    } catch (apiError) {
      console.log('API method failed, trying DOM scraping...', apiError);
    }

    // Method 2: Scrape from DOM
    const productElements = document.querySelectorAll('[data-product-id], .product-item, .product-card, .product, [class*="product"]');
    
    if (productElements.length === 0) {
      chrome.runtime.sendMessage({
        action: 'scrapingError',
        error: 'No products found on this page. Please navigate to a products or collection page.'
      });
      return;
    }

    const totalProducts = productElements.length;

    for (const element of productElements) {
      try {
        const product = await scrapeProductFromElement(element);
        if (product && product.title) {
          products.push(product);
          scrapedCount++;
          
          chrome.runtime.sendMessage({
            action: 'updateProgress',
            current: scrapedCount,
            total: totalProducts
          });
        }
      } catch (error) {
        console.error('Error scraping product:', error);
      }
    }

    if (products.length === 0) {
      chrome.runtime.sendMessage({
        action: 'scrapingError',
        error: 'Could not extract product data. The page structure may not be supported.'
      });
      return;
    }

    chrome.runtime.sendMessage({
      action: 'scrapingComplete',
      products: products
    });

  } catch (error) {
    console.error('Scraping error:', error);
    chrome.runtime.sendMessage({
      action: 'scrapingError',
      error: error.message
    });
  }
})();

// Fetch all products using Shopify's products.json API
async function fetchAllProductsFromAPI() {
  const allProducts = [];
  let page = 1;
  const limit = 250; // Shopify's max limit per page

  while (true) {
    try {
      const url = `/products.json?limit=${limit}&page=${page}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        break;
      }

      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        break;
      }

      // Process each product
      for (const product of data.products) {
        const processedProduct = {
          title: product.title,
          description: product.body_html || '',
          vendor: product.vendor || '',
          type: product.product_type || '',
          tags: product.tags ? product.tags.join(', ') : '',
          handle: product.handle,
          images: product.images ? product.images.map(img => img.src) : [],
          variants: product.variants ? product.variants.map(variant => ({
            option1Name: product.options[0] ? product.options[0].name : '',
            option1Value: variant.option1 || '',
            option2Name: product.options[1] ? product.options[1].name : '',
            option2Value: variant.option2 || '',
            option3Name: product.options[2] ? product.options[2].name : '',
            option3Value: variant.option3 || '',
            price: variant.price,
            compareAtPrice: variant.compare_at_price || '',
            sku: variant.sku || '',
            barcode: variant.barcode || '',
            weight: variant.weight || '',
            image: variant.image_id ? product.images.find(img => img.id === variant.image_id)?.src : ''
          })) : []
        };

        // If no variants, add product price
        if (processedProduct.variants.length === 0 && product.variants && product.variants[0]) {
          processedProduct.price = product.variants[0].price;
          processedProduct.compareAtPrice = product.variants[0].compare_at_price || '';
        }

        allProducts.push(processedProduct);
      }

      chrome.runtime.sendMessage({
        action: 'updateProgress',
        current: allProducts.length,
        total: allProducts.length + limit
      });

      // If we got less than the limit, we're done
      if (data.products.length < limit) {
        break;
      }

      page++;
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('Error fetching page:', page, error);
      break;
    }
  }

  return allProducts;
}

// Scrape product data from a DOM element
async function scrapeProductFromElement(element) {
  const product = {
    title: '',
    description: '',
    vendor: '',
    type: '',
    tags: '',
    price: '',
    compareAtPrice: '',
    images: [],
    variants: []
  };

  // Try to get product title
  const titleSelectors = [
    '.product-title',
    '.product__title',
    '[class*="product-title"]',
    'h2',
    'h3',
    'a[href*="/products/"]'
  ];

  for (const selector of titleSelectors) {
    const titleElement = element.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      product.title = titleElement.textContent.trim();
      break;
    }
  }

  // Try to get product link for more details
  const linkElement = element.querySelector('a[href*="/products/"]');
  if (linkElement) {
    const productUrl = linkElement.href;
    try {
      const detailedProduct = await fetchProductDetails(productUrl);
      if (detailedProduct) {
        return detailedProduct;
      }
    } catch (error) {
      console.log('Could not fetch detailed product info:', error);
    }
  }

  // Get price
  const priceSelectors = [
    '.price',
    '.product-price',
    '[class*="price"]',
    '[data-price]'
  ];

  for (const selector of priceSelectors) {
    const priceElement = element.querySelector(selector);
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        product.price = priceMatch[0].replace(',', '');
      }
      break;
    }
  }

  // Get images
  const imgElements = element.querySelectorAll('img');
  for (const img of imgElements) {
    const src = img.src || img.dataset.src;
    if (src && !src.includes('data:image') && !src.includes('placeholder')) {
      // Get high-res version
      const highResSrc = src.replace(/_small|_compact|_medium|_grande/, '_2048x2048');
      product.images.push(highResSrc);
    }
  }

  return product;
}

// Fetch detailed product information
async function fetchProductDetails(productUrl) {
  try {
    // Convert product URL to JSON endpoint
    const jsonUrl = productUrl.replace(/\?.*$/, '') + '.json';
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const product = data.product;

    return {
      title: product.title,
      description: product.body_html || '',
      vendor: product.vendor || '',
      type: product.product_type || '',
      tags: product.tags ? product.tags.join(', ') : '',
      handle: product.handle,
      images: product.images ? product.images.map(img => img.src) : [],
      variants: product.variants ? product.variants.map(variant => ({
        option1Name: product.options[0] ? product.options[0].name : '',
        option1Value: variant.option1 || '',
        option2Name: product.options[1] ? product.options[1].name : '',
        option2Value: variant.option2 || '',
        option3Name: product.options[2] ? product.options[2].name : '',
        option3Value: variant.option3 || '',
        price: variant.price,
        compareAtPrice: variant.compare_at_price || '',
        sku: variant.sku || '',
        barcode: variant.barcode || '',
        weight: variant.weight || '',
        image: variant.image_id ? product.images.find(img => img.id === variant.image_id)?.src : ''
      })) : []
    };
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}
