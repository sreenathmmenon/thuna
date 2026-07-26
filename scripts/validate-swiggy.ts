import 'dotenv/config';
import { createSwiggyRuntime } from '../lib/integrations/swiggy/runtime';

function stop(message: string): never {
  console.error(JSON.stringify({ verified: false, blocker: message }, null, 2));
  process.exit(1);
}

async function main(): Promise<void> {
if (process.env.THUNA_RUN_LIVE_SWIGGY !== 'true') {
  stop('Set THUNA_RUN_LIVE_SWIGGY=true to opt into real Swiggy reads and a cart mutation.');
}

if (process.env.THUNA_ENABLE_REAL_SWIGGY_ORDER === 'true') {
  stop('Live validation refuses to run while real order placement is enabled.');
}

const runtime = createSwiggyRuntime({
  ...process.env,
  THUNA_FOOD_ADAPTER: 'swiggy',
  THUNA_ENABLE_REAL_SWIGGY_ORDER: 'false',
});
const status = await runtime.connection.status();
if (!status.connected) stop('No authenticated local Swiggy session. Connect through Thuna first.');

const tools = await runtime.client.listTools();
const advertised = new Set(tools.map((tool) => tool.name));
const required = [
  'get_addresses',
  'search_restaurants',
  'get_restaurant_menu',
  'update_food_cart',
  'get_food_cart',
];
const missing = required.filter((tool) => !advertised.has(tool));
if (missing.length) stop(`Authenticated Swiggy server did not advertise: ${missing.join(', ')}`);

const addresses = await runtime.adapter.getAddresses();
if (!addresses.ok || addresses.value.length === 0) stop('get_addresses returned no usable saved address.');
const address = addresses.value[0];
const requestedQuery = process.env.THUNA_SWIGGY_LIVE_QUERY?.trim();
const queries = requestedQuery ? [requestedQuery] : ['dosa', 'biryani', 'pizza'];
let restaurant;
let query = queries[0];
for (const candidateQuery of queries) {
  const restaurants = await runtime.adapter.searchRestaurants(address.id, candidateQuery);
  if (!restaurants.ok) stop(restaurants.error.message);
  restaurant = restaurants.value.find((candidate) => candidate.available);
  query = candidateQuery;
  if (restaurant) break;
}
if (!restaurant) stop(`No open restaurant was returned for the safe validation queries.`);

const menu = await runtime.adapter.getRestaurantMenu(address.id, restaurant.id);
if (!menu.ok) stop(menu.error.message);
const item = menu.value.find(
  (candidate) => candidate.available && !candidate.hasVariants && !candidate.hasAddons,
);
if (!item) stop('No safe, available menu item without unresolved variants/add-ons was returned.');

const prepared = await runtime.adapter.prepareCart({
  addressId: address.id,
  addressLabel: 'Saved address',
  restaurantId: restaurant.id,
  restaurant: restaurant.name,
  item: { name: item.name, quantity: 1 },
  providerCartItems: [{ itemId: item.id, quantity: 1 }],
});
if (!prepared.ok) stop(prepared.error.message);
const verified = await runtime.adapter.readCart(prepared.value.cartId);
if (!verified.ok || !verified.value.providerVerified) {
  stop('The authoritative Swiggy cart could not be verified.');
}

console.log(JSON.stringify({
  verified: true,
  realProvider: 'Swiggy Food MCP',
  toolsCalled: runtime.client.toolAudit().map(({ tool, status: callStatus }) => ({
    tool,
    status: callStatus,
  })),
  restaurant: verified.value.restaurant,
  items: verified.value.lines.map(({ name, quantity }) => ({ name, quantity })),
  totalRupees: verified.value.grandTotalRupees,
  address: '[REDACTED]',
  cartPrepared: true,
  authoritativeCartRead: true,
  orderPlacementAttempted: false,
}, null, 2));

await runtime.client.close();
}

void main().catch((error: unknown) => {
  stop(error instanceof Error ? error.message : 'Unexpected live-validation failure.');
});
