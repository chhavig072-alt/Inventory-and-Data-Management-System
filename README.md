# Inventory-and-Data-Management-System

A RESTful backend for managing a store or warehouse product catalogue, built with Node.js, Express.js, MongoDB and Mongoose.

## Features

- Mongoose schema with field-level validation
- Full CRUD for products
- Filtering, sorting and pagination
- Atomic restock and sale operations (stock never goes below zero)
- Low-stock alert report and category-wise summary using aggregation pipelines
- Centralized error handling and input validation middleware
- Environment variables managed with dotenv

## Tech Stack

Node.js, Express.js, MongoDB, Mongoose, dotenv

## Setup

1. Clone the repository and install dependencies:
```
   npm install
```
2. Create a `.env` file in the project root (see `.env.example`):
```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
```
3. Make sure MongoDB is running, then start the server:
```
   npm start
```
   The API runs at `http://localhost:5000`.

## Product Schema

| Field | Type | Rules |
|---|---|---|
| name | String | required, 2-100 characters |
| sku | String | required, unique, uppercase, letters/digits/hyphens only |
| category | String | required |
| price | Number | required, >= 0 |
| quantity | Number | required, integer, >= 0 |
| reorderLevel | Number | default 10, >= 0 |
| supplier | String | optional |

`stockValue` (price x quantity) is a computed virtual field included in every response.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/products` | Create a product |
| GET | `/api/products` | List products (filter, sort, paginate) |
| GET | `/api/products/:id` | Get a single product |
| PUT | `/api/products/:id` | Update product details |
| PATCH | `/api/products/:id/stock` | Restock or sell (adjust quantity) |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/products/low-stock` | Products where quantity <= reorderLevel |
| GET | `/api/products/summary` | Category-wise inventory summary |

### Query parameters for `GET /api/products`

| Param | Example | Description |
|---|---|---|
| category | `?category=Electronics` | Filter by category (case-insensitive) |
| supplier | `?supplier=IKEA India` | Filter by supplier |
| search | `?search=pen` | Name contains text |
| minPrice / maxPrice | `?minPrice=100&maxPrice=5000` | Price range |
| inStock | `?inStock=true` | Only items with quantity > 0 (`false` for out of stock) |
| sort | `?sort=-price,name` | Sort fields, prefix `-` for descending |
| page / limit | `?page=2&limit=5` | Pagination (default page 1, limit 10, max 100) |

## Example Requests

**Create a product**
```
POST /api/products
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

**Restock**
```
PATCH /api/products/:id/stock
{ "change": 10 }
```

**Sale** (returns 400 if stock is insufficient)
```
PATCH /api/products/:id/stock
{ "change": -3 }
```

## Error Responses

| Status | When |
|---|---|
| 400 | Validation failure, invalid ID, invalid query value, insufficient stock |
| 404 | Product or route not found |
| 409 | Duplicate SKU |
| 500 | Unexpected server error |

## Project Structure

```
inventory-api/
├── config/db.js
├── controllers/productController.js
├── middleware/errorHandler.js
├── middleware/validateId.js
├── models/Product.js
├── routes/productRoutes.js
├── .env.example
├── .gitignore
├── package.json
└── server.js
```
