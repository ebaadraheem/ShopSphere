# 🛍️ ShopSphere

ShopSphere is a full-stack e-commerce web application for browsing and purchasing clothing — shirts, t-shirts, pants, trousers, and blazers. It features product browsing by category, favourites, a shopping cart, Stripe-powered checkout, order history, an admin dashboard for managing products/orders/messages, and Firebase-based authentication.

The project is split into two independent apps:

| Folder | Stack | Description |
|---|---|---|
| [`frontend/`](./frontend) | React + Vite + Tailwind/DaisyUI | Customer storefront and admin dashboard UI |
| [`backend/`](./backend) | Node.js + Express + MongoDB | REST API, payments, image storage |

## ✨ Features

- Browse products by category (Shirts, T-Shirts, Pants, Trousers, Blazers)
- Product search and detail pages
- Favourites list per user
- Shopping cart with size/quantity selection
- Stripe Checkout integration for payments
- Order placement and order history
- Contact / message form
- Firebase Authentication (sign up / login) with a dedicated admin role
- Admin dashboard to create products, manage orders, view order history, and view contact messages
- Product image uploads to AWS S3

## 🏗️ Architecture

```
ShopSphere/
├── frontend/   # React (Vite) single-page application
└── backend/    # Express REST API + MongoDB + Stripe + AWS S3
```

The frontend talks to the backend over HTTP (via `VITE_BACKEND_URL`), and the backend talks to MongoDB (data), Stripe (payments), and AWS S3 (product images).

## 🚀 Getting Started

Each app is set up and run independently. See the dedicated README in each folder for full setup instructions:

- 📦 [Backend setup & API docs](./backend/README.md)
- 💻 [Frontend setup guide](./frontend/README.md)

### Quick start (both apps)

```bash
# Clone the repo
git clone https://github.com/<your-username>/ShopSphere.git
cd ShopSphere

# 1. Backend
cd backend
npm install
# create a .env file (see backend/README.md)
npm run dev

# 2. Frontend (in a new terminal)
cd ../frontend
npm install
# create a .env file (see frontend/README.md)
npm run dev
```

The frontend dev server runs on `http://localhost:5173` and the backend on `http://localhost:5000` (or whatever `PORT` you configure).

## 🧰 Tech Stack

**Frontend:** React 18, Vite, React Router, Tailwind CSS, DaisyUI, Firebase Auth, Stripe.js, Axios, React Hook Form, React Hot Toast

**Backend:** Node.js, Express, Mongoose (MongoDB), Stripe, AWS SDK (S3), Multer

## 📄 License

This project is licensed under the ISC License.
