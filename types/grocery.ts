/** Types for the Smart Grocery Proximity System */

export interface GroceryStore {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  openingHours?: string; // e.g. "07:00-22:00"
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  checked: boolean;
  addedAt: number;
}

export interface RecurringGroceryItem {
  id: string;
  name: string;
  intervalDays: number;
  lastPurchased: string; // ISO date
  nextDue: string; // ISO date
  preferredStore?: string; // store id
  avgPrice?: number;
  avgPricePerUnit?: number;
  unit?: string;
  estimatedWeightKg?: number;
  category?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface GroceryShoppingBriefItem {
  name: string;
  quantity?: number;
  unit?: string;
  estimatedPrice?: number;
  pricePerUnit?: number;
  isOnSale?: boolean;
  salePrice?: number;
  isRecurring?: boolean;
  daysOverdue?: number;
  estimatedWeightKg?: number;
}

export interface GroceryNotification {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  distance: number; // meters
  items: GroceryShoppingBriefItem[];
  totalEstimatedPrice: number;
  totalEstimatedWeightKg: number;
  score: number;
  createdAt: number;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface TripScore {
  total: number;
  urgencyScore: number;
  availabilityScore: number;
  convenienceScore: number;
  dealBonus: number;
  timePenalty: number;
}

export interface StorePriceHistory {
  store: string;
  product: string;
  prices: Array<{
    price: number;
    pricePerUnit?: number;
    date: string;
    unit?: string;
  }>;
  avgPrice: number;
  avgPricePerUnit?: number;
}

export interface LocationUpdate {
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp: number;
}
