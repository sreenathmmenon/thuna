# Real Swiggy Food MCP integration

Thuna connects to the official Streamable HTTP endpoint at `https://mcp.swiggy.com/food` through the Model Context Protocol TypeScript SDK.

The localhost flow is:

```text
elder request
→ Sarvam structured interpretation
→ deterministic Thuna food flow
→ FoodCommerceAdapter
→ Swiggy OAuth
→ saved address
→ restaurant and menu
→ update_food_cart
→ authoritative get_food_cart
→ exact total read-back
→ explicit confirmation
```

Set `THUNA_FOOD_ADAPTER=swiggy` to enable it. Mock remains the safe default and there is no automatic provider fallback.

The implemented official tools are:

- `get_addresses`
- `search_restaurants`
- `get_restaurant_menu`
- `search_menu`
- `update_food_cart`
- `get_food_cart`
- `get_food_orders`
- `track_food_order`
- `place_food_order`, guarded by the disabled-by-default placement flag and two confirmations

The client discovers the live input schemas. This is important because Swiggy’s current recipe and tool-reference pages differ on whether the cart item array is named `items` or `cartItems`; Thuna uses only the name advertised by the connected MCP server.

During the verified localhost run, the server advertised `cartItems` with
`menu_item_id` and returned already-unwrapped tool data in MCP
`structuredContent`. The client adapts to that observed schema while retaining
support for the documented `{ success, data }` envelope.

Normal tests mock the MCP session and never contact Swiggy. Once authenticated locally, run:

```bash
THUNA_RUN_LIVE_SWIGGY=true \
THUNA_FOOD_ADAPTER=swiggy \
THUNA_ENABLE_REAL_SWIGGY_ORDER=false \
npm run validate:swiggy
```

The validator reads one saved address without printing it, searches for an open restaurant, selects a simple available menu item, updates the real cart, reads it back, and never places an order.

Sources: [build an agent](https://mcp.swiggy.com/builders/docs/start/developer/build-an-agent/), [Food tools](https://mcp.swiggy.com/builders/docs/reference/food/), and [end-to-end recipe](https://mcp.swiggy.com/builders/docs/build/recipes/order-food/).
