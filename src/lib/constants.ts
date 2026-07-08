export const CATEGORIES = [
  { value: "fruits_vegetables", label: "Fruits & Vegetables", emoji: "🥬" },
  { value: "dairy", label: "Dairy Products", emoji: "🥛" },
  { value: "snacks", label: "Snacks", emoji: "🍪" },
  { value: "beverages", label: "Beverages", emoji: "🥤" },
  { value: "household", label: "Household Items", emoji: "🧴" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

export const DELIVERY_SLOTS = [
  { value: "slot_9_12", label: "9:00 AM – 12:00 PM" },
  { value: "slot_12_3", label: "12:00 PM – 3:00 PM" },
  { value: "slot_3_6", label: "3:00 PM – 6:00 PM" },
] as const;

export const DELIVERY_SLOT_LABEL: Record<string, string> = Object.fromEntries(
  DELIVERY_SLOTS.map((s) => [s.value, s.label]),
);

export const ORDER_STATUS_STEPS = [
  { value: "placed", label: "Placed", emoji: "📝" },
  { value: "packed", label: "Packed", emoji: "📦" },
  { value: "out_for_delivery", label: "Out for Delivery", emoji: "🛵" },
  { value: "delivered", label: "Delivered", emoji: "✅" },
] as const;
