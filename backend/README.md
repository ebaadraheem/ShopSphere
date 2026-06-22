# ShopSphere — Backend

REST API server for ShopSphere, built with **Node.js**, **Express**, and **MongoDB (Mongoose)**. It handles product data, favourites, orders, order history, contact messages, image uploads to AWS S3, and Stripe checkout sessions.

## 🧰 Tech Stack

- Express 4 (ESM modules)
- Mongoose / MongoDB
- Stripe (checkout sessions)
- AWS SDK v3 (`@aws-sdk/client-s3`) for product image storage
- Multer for handling file uploads
- CORS, dotenv

## 📁 Project Structure

```
backend/
├── server.js              # App entry point — Express setup, DB connection, route mounting
├── Aws/
│   └── upload.js          # S3 upload/delete helpers + Multer middleware
├── Requests/               # Database access functions used by the routes
├── Schema/                # Mongoose schemas/models
│   ├── Schema.js          # Product ("Cards") schema
│   ├── Orders.js          # Active order schema
│   ├── OrderHistory.js    # Completed order history schema
│   ├── Favourite.js       # Per-user favourites schema
│   └── Contact.js         # Contact/message schema
└── routes/
    ├── dataRoutes.js      # Product CRUD (/data)
    ├── favoriteRoutes.js  # Favourites (/favorites)
    ├── orderRoutes.js     # Orders (/orders)
    ├── historyRoutes.js   # Order history (/history)
    ├── imageRoutes.js     # Image upload/delete (/images)
    ├── messageRoutes.js   # Contact messages (/contact)
    └── checkoutRoutes.js  # Stripe checkout (/checkout_session)
```

## ⚙️ Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
DB_CONNECTION_STRING=your_mongodb_connection_url
STRIPE_SECRET_KEY=your_stripe_secret_key
Frontend_URL=your_frontend_url
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_aws_bucket_name
PORT=your_port_for_server
```

| Variable | Description |
|---|---|
| `DB_CONNECTION_STRING` | MongoDB connection URI (e.g. from MongoDB Atlas) |
| `STRIPE_SECRET_KEY` | Stripe secret key used to create checkout sessions |
| `Frontend_URL` | URL of the deployed/running frontend, used for Stripe success/cancel redirects |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key with S3 permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | AWS region of your S3 bucket (e.g. `us-east-1`) |
| `AWS_BUCKET_NAME` | Name of the S3 bucket used to store product images |
| `PORT` | Port the Express server listens on (defaults to `5000` if unset) |

### 3. Run the server

```bash
npm run dev
```

This starts the server with `nodemon` for auto-reload on file changes. On startup it connects to MongoDB and logs the connection status to the console.

## 📡 API Reference

Base URL: `http://localhost:<PORT>`

### Products — `/data`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/data/all` | Get all products |
| POST | `/data/add` | Add a new product |
| POST | `/data/remove` | Remove a product by `id` |
| POST | `/data/update` | Update a product's size/quantity |

### Favourites — `/favorites`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/favorites/all/:userId` | Get a user's favourite product IDs |
| POST | `/favorites/add` | Add a product to a user's favourites |
| POST | `/favorites/remove` | Remove a product from a user's favourites |

### Orders — `/orders`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders/all` | Get all active orders |
| POST | `/orders/add` | Place a new order |
| POST | `/orders/remove` | Remove an order by `id` |

### Order History — `/history`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/history/all` | Get all historical (completed) orders |
| POST | `/history/add` | Add an order to history |
| POST | `/history/remove` | Remove an order from history by `id` |

### Images — `/images`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/images/upload` | Upload an image (multipart/form-data, field name `image`) to S3, returns the public URL |
| GET | `/images/:blobName` | Get the public URL for a stored image |
| DELETE | `/images/delete/:blobName` | Delete an image from S3 |

### Contact Messages — `/contact`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/contact/all` | Get all contact messages |
| POST | `/contact/add` | Submit a new contact message |
| POST | `/contact/remove` | Remove a message by `id` |

### Checkout — `/checkout_session`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/checkout_session/checkout` | Creates a Stripe Checkout session for the given `products` array and returns the session `id` |

## 🗄️ Data Models

- **Cards** (product) — `id`, `name`, `detail`, `category`, `price`, `favourite`, `Incart`, `total`, `img`, `sizes`
- **Order / OrderHistory** — `id`, `name`, `detail`, `address`, `date`, `phone`, `total`
- **Favourite** — `favouriteId`, `favouriteIdData` (array of product IDs)
- **Contact (message)** — `id`, `name`, `email`, `contact_message`, `time`, `date`

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the server with nodemon (auto-restart on changes) |
| `npm run build` | Installs dependencies (`npm i`) — used by deployment platforms |
