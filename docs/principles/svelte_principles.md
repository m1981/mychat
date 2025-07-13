* Key Advantages of SvelteKit for This Use Case
* Less Boilerplate: No need for useRef, useState, useCallback, useEffect
* Simpler State Management: Reactive declarations instead of complex state hooks
* Clearer Lifecycle: Predictable component lifecycle without dependency arrays
* Server-Side Processing: Move complex API calls to the server
* Progressive Enhancement: Works without JavaScript, enhanced with JavaScript
* Less Code Overall: Typically 30-40% less code for the same functionality
* No Stale Closures: Avoids the common React issue of stale state in closures
* Automatic Cleanup: Variables go out of scope naturally when component is destroyed
* The core advantage is that SvelteKit's programming model aligns more closely with how we naturally think about UI state and interactions, without the indirection and complexity that React hooks introduce.

# Business Logic in SvelteKit Projects

SvelteKit provides several well-defined places for business logic, each with specific use cases. Here's how business logic is typically organized in commercial SvelteKit projects:

## 1. Server-Side Logic: `+page.server.js` and `+server.js`

Server-side business logic is primarily handled in these files:

```javascript path=examples/page-server.js mode=EDIT
// src/routes/products/+page.server.js
import { db } from '$lib/server/database';
import { fail } from '@sveltejs/kit';

// Load data for the page
export async function load({ params, url, locals }) {
  // Business logic for fetching products
  const category = url.searchParams.get('category');
  const page = parseInt(url.searchParams.get('page') || '1');
  
  try {
    // Database interaction
    const products = await db.products.findMany({
      where: category ? { category } : undefined,
      take: 10,
      skip: (page - 1) * 10,
      orderBy: { createdAt: 'desc' }
    });
    
    const totalProducts = await db.products.count({
      where: category ? { category } : undefined
    });
    
    // Business logic for pagination
    return {
      products,
      pagination: {
        page,
        totalPages: Math.ceil(totalProducts / 10),
        hasNext: page * 10 < totalProducts,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Failed to load products:', error);
    return {
      products: [],
      pagination: { page: 1, totalPages: 0, hasNext: false, hasPrev: false },
      error: 'Failed to load products'
    };
  }
}

// Handle form submissions
export const actions = {
  createProduct: async ({ request, locals }) => {
    // Check authentication
    if (!locals.user || !locals.user.isAdmin) {
      return fail(403, { message: 'Unauthorized' });
    }
    
    const formData = await request.formData();
    const name = formData.get('name');
    const price = parseFloat(formData.get('price'));
    const description = formData.get('description');
    
    // Validation logic
    const errors = {};
    if (!name || name.length < 3) errors.name = 'Name must be at least 3 characters';
    if (isNaN(price) || price <= 0) errors.price = 'Price must be a positive number';
    
    if (Object.keys(errors).length > 0) {
      return fail(400, { errors, values: { name, price, description } });
    }
    
    try {
      // Create product in database
      const product = await db.products.create({
        data: { name, price, description }
      });
      
      return { success: true, product };
    } catch (error) {
      console.error('Failed to create product:', error);
      return fail(500, { message: 'Failed to create product' });
    }
  }
};
```

## 2. API Endpoints: `+server.js`

For REST or custom API endpoints:

```javascript path=examples/api-endpoint.js mode=EDIT
// src/routes/api/inventory/+server.js
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export async function GET({ url, locals }) {
  // Authentication check
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Business logic for inventory management
    const lowStock = await db.products.findMany({
      where: {
        stockLevel: { lt: 10 }
      },
      orderBy: { stockLevel: 'asc' }
    });
    
    // Calculate reorder recommendations
    const recommendations = lowStock.map(product => ({
      id: product.id,
      name: product.name,
      currentStock: product.stockLevel,
      recommendedOrder: calculateRecommendedOrder(product),
      supplier: product.supplierId
    }));
    
    return json({ recommendations });
  } catch (error) {
    console.error('Inventory API error:', error);
    return json({ error: 'Failed to process inventory data' }, { status: 500 });
  }
}

// Business logic helper function
function calculateRecommendedOrder(product) {
  const { stockLevel, averageDailySales, leadTimeInDays, minimumStock } = product;
  const safetyStock = minimumStock || Math.ceil(averageDailySales * 7);
  const expectedConsumption = averageDailySales * leadTimeInDays;
  return Math.max(0, Math.ceil(safetyStock + expectedConsumption - stockLevel));
}
```

## 3. Shared Logic: `$lib` Directory

Reusable business logic goes in the `$lib` directory:

```javascript path=examples/business-service.js mode=EDIT
// src/lib/services/orderService.js
import { db } from '$lib/server/database';
import { sendEmail } from '$lib/server/email';

/**
 * Order processing service with business logic
 */
export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(userId, items, shippingAddress) {
    // Validate order
    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    
    // Start a database transaction
    return await db.$transaction(async (tx) => {
      // Check inventory
      const productIds = items.map(item => item.productId);
      const products = await tx.products.findMany({
        where: { id: { in: productIds } }
      });
      
      // Map for quick lookup
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // Validate all products exist and have sufficient stock
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stockLevel < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
      }
      
      // Calculate order total
      const subtotal = items.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        return sum + (product.price * item.quantity);
      }, 0);
      
      // Apply tax and shipping calculation
      const tax = this.calculateTax(subtotal, shippingAddress.country);
      const shipping = this.calculateShipping(items, shippingAddress);
      const total = subtotal + tax + shipping;
      
      // Create order
      const order = await tx.orders.create({
        data: {
          userId,
          subtotal,
          tax,
          shipping,
          total,
          status: 'PENDING',
          shippingAddress: {
            create: shippingAddress
          },
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: productMap.get(item.productId).price
            }))
          }
        }
      });
      
      // Update inventory
      for (const item of items) {
        await tx.products.update({
          where: { id: item.productId },
          data: {
            stockLevel: {
              decrement: item.quantity
            }
          }
        });
      }
      
      // Send confirmation email
      await sendEmail({
        to: order.user.email,
        subject: `Order Confirmation #${order.id}`,
        template: 'order-confirmation',
        data: { order }
      });
      
      return order;
    });
  }
  
  /**
   * Calculate tax based on subtotal and shipping location
   */
  calculateTax(subtotal, country) {
    // Tax calculation logic
    const taxRates = {
      'US': 0.0725,
      'CA': 0.13,
      'UK': 0.20,
      // Default rate for other countries
      'DEFAULT': 0.10
    };
    
    const rate = taxRates[country] || taxRates.DEFAULT;
    return subtotal * rate;
  }
  
  /**
   * Calculate shipping costs
   */
  calculateShipping(items, address) {
    // Shipping calculation logic
    let baseRate = 10;
    
    // Add weight-based charges
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
    const weightCharge = totalWeight * 0.5;
    
    // Add distance-based charges
    const distanceCharge = this.calculateDistanceCharge(address);
    
    return baseRate + weightCharge + distanceCharge;
  }
  
  calculateDistanceCharge(address) {
    // Distance calculation logic
    return 5; // Simplified for example
  }
}
```

## 4. Client-Side Logic: Svelte Stores

For client-side state management and business logic:

```javascript path=examples/cart-store.js mode=EDIT
// src/lib/stores/cart.js
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize from localStorage if in browser
const storedCart = browser ? JSON.parse(localStorage.getItem('cart') || '[]') : [];

// Create the cart store
export const cart = writable(storedCart);

// Save to localStorage when cart changes
if (browser) {
  cart.subscribe(value => {
    localStorage.setItem('cart', JSON.stringify(value));
  });
}

// Derived store for cart calculations
export const cartSummary = derived(cart, ($cart) => {
  const itemCount = $cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = $cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Apply business logic for discounts
  const discount = calculateDiscount($cart, subtotal);
  const total = subtotal - discount;
  
  return {
    itemCount,
    subtotal,
    discount,
    total,
    isEmpty: $cart.length === 0
  };
});

// Business logic for cart operations
export const cartActions = {
  addItem: (product, quantity = 1) => {
    cart.update(items => {
      const existingItem = items.find(item => item.id === product.id);
      
      if (existingItem) {
        // Update existing item
        return items.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        return [...items, { ...product, quantity }];
      }
    });
  },
  
  removeItem: (productId) => {
    cart.update(items => items.filter(item => item.id !== productId));
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      cartActions.removeItem(productId);
      return;
    }
    
    cart.update(items => 
      items.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  },
  
  clearCart: () => {
    cart.set([]);
  }
};

// Business logic for discount calculation
function calculateDiscount(cartItems, subtotal) {
  // No discount for empty cart
  if (cartItems.length === 0) return 0;
  
  let discount = 0;
  
  // Volume discount: 10% off for orders over $100
  if (subtotal > 100) {
    discount += subtotal * 0.1;
  }
  
  // Bundle discount: If buying 3 or more of the same item
  cartItems.forEach(item => {
    if (item.quantity >= 3) {
      discount += item.price * 0.05 * item.quantity;
    }
  });
  
  return discount;
}
```

## 5. Hooks: `hooks.server.js`

For application-wide server logic:

```javascript path=examples/hooks-server.js mode=EDIT
// src/hooks.server.js
import { db } from '$lib/server/database';
import { sequence } from '@sveltejs/kit/hooks';
import { authenticateUser } from '$lib/server/auth';

// Authentication hook
const auth = async ({ event, resolve }) => {
  // Get session cookie
  const sessionId = event.cookies.get('sessionid');
  
  if (sessionId) {
    // Business logic for authentication
    const user = await authenticateUser(sessionId);
    
    if (user) {
      // Add user to locals for use in routes
      event.locals.user = user;
      
      // Record user activity for analytics
      await db.userActivity.create({
        data: {
          userId: user.id,
          path: event.url.pathname,
          timestamp: new Date()
        }
      });
    }
  }
  
  return resolve(event);
};

// Rate limiting hook
const rateLimit = async ({ event, resolve }) => {
  const ip = event.getClientAddress();
  
  // Business logic for rate limiting
  const recentRequests = await db.requestLog.count({
    where: {
      ip,
      timestamp: {
        gte: new Date(Date.now() - 60 * 1000) // Last minute
      }
    }
  });
  
  // Log this request
  await db.requestLog.create({
    data: {
      ip,
      path: event.url.pathname,
      timestamp: new Date()
    }
  });
  
  // Apply rate limiting
  if (recentRequests > 100) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  return resolve(event);
};

// Combine hooks with sequence
export const handle = sequence(auth, rateLimit);
```

## 6. Utilities and Helpers

For reusable business logic functions:

```javascript path=examples/validation.js mode=EDIT
// src/lib/utils/validation.js

/**
 * Validates a product based on business rules
 */
export function validateProduct(product) {
  const errors = {};
  
  // Name validation
  if (!product.name) {
    errors.name = 'Name is required';
  } else if (product.name.length < 3) {
    errors.name = 'Name must be at least 3 characters';
  } else if (product.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  }
  
  // Price validation
  if (product.price === undefined || product.price === null) {
    errors.price = 'Price is required';
  } else if (isNaN(product.price) || product.price <= 0) {
    errors.price = 'Price must be a positive number';
  }
  
  // SKU validation
  if (product.sku) {
    if (!/^[A-Z0-9]{6,10}$/.test(product.sku)) {
      errors.sku = 'SKU must be 6-10 uppercase letters and numbers';
    }
  }
  
  // Category validation
  if (!product.categoryId) {
    errors.categoryId = 'Category is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates an order based on business rules
 */
export function validateOrder(order) {
  const errors = {};
  
  // Items validation
  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    errors.items = 'Order must contain at least one item';
  } else {
    // Check each item
    const itemErrors = order.items.map((item, index) => {
      const itemError = {};
      
      if (!item.productId) {
        itemError.productId = 'Product ID is required';
      }
      
      if (!item.quantity || item.quantity <= 0) {
        itemError.quantity = 'Quantity must be positive';
      }
      
      return Object.keys(itemError).length > 0 ? itemError : null;
    }).filter(Boolean);
    
    if (itemErrors.length > 0) {
      errors.items = itemErrors;
    }
  }
  
  // Shipping address validation
  if (!order.shippingAddress) {
    errors.shippingAddress = 'Shipping address is required';
  } else {
    const addressErrors = {};
    
    if (!order.shippingAddress.street) addressErrors.street = 'Street is required';
    if (!order.shippingAddress.city) addressErrors.city = 'City is required';
    if (!order.shippingAddress.postalCode) addressErrors.postalCode = 'Postal code is required';
    if (!order.shippingAddress.country) addressErrors.country = 'Country is required';
    
    if (Object.keys(addressErrors).length > 0) {
      errors.shippingAddress = addressErrors;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```


## Key Advantages of SvelteKit for This Use Case

1. **Less Boilerplate**: No need for useRef, useState, useCallback, useEffect
2. **Simpler State Management**: Reactive declarations instead of complex state hooks
3. **Clearer Lifecycle**: Predictable component lifecycle without dependency arrays
4. **Server-Side Processing**: Move complex API calls to the server
5. **Progressive Enhancement**: Works without JavaScript, enhanced with JavaScript
6. **Less Code Overall**: Typically 30-40% less code for the same functionality
7. **No Stale Closures**: Avoids the common React issue of stale state in closures
8. **Automatic Cleanup**: Variables go out of scope naturally when component is destroyed

The core advantage is that SvelteKit's programming model aligns more closely with how we naturally think about UI state and interactions, without the indirection and complexity that React hooks introduce.



## Best Practices for Business Logic in SvelteKit

1. **Separation of Concerns**:
    - Keep UI logic in `.svelte` files
    - Keep data fetching and server logic in `+page.server.js` files
    - Keep reusable business logic in `$lib/services` or similar

2. **Server vs. Client Logic**:
    - Use `$lib/server` for server-only code
    - Use `$lib` for shared code
    - Use stores for client-side state management

3. **Functional vs. Class-Based**:
    - Both approaches are used in SvelteKit projects
    - Classes are useful for complex business logic with state
    - Functional approaches work well for simpler utilities

4. **Type Safety**:
    - Use TypeScript for better type safety in business logic
    - Define interfaces for your data models

5. **Testing**:
    - Keep business logic separate from UI for easier testing
    - Use unit tests for business logic
    - Use integration tests for API endpoints

## Summary

In SvelteKit projects, business logic is typically organized as:

1. **Server-side logic** in `+page.server.js` and `+server.js` files
2. **Shared logic** in the `$lib` directory
3. **Client-side logic** in Svelte stores
4. **Application-wide logic** in hooks
5. **Utility functions** for reusable operations

Both functional and class-based approaches are used depending on the complexity of the business logic. The key is to separate business logic from UI components for better maintainability and testability.