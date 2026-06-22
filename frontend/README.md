# ShopSphere — Frontend

The customer-facing storefront and admin dashboard for ShopSphere, built with **React 18**, **Vite**, **Tailwind CSS**, and **DaisyUI**. It communicates with the [ShopSphere backend](../backend) for product data, orders, favourites, and payments, and uses **Firebase** for authentication.

## 🧰 Tech Stack

- React 18 + React Router v6
- Vite (build tool / dev server)
- Tailwind CSS + DaisyUI (styling/components)
- Firebase Authentication (`firebase`, `react-firebase-hooks`)
- Stripe.js (`@stripe/stripe-js`) for redirecting to Stripe Checkout
- Axios for HTTP requests
- React Hook Form for form handling
- React Hot Toast for notifications
- React Slick / Slick Carousel for sliders

## 📁 Project Structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── vercel.json              # SPA rewrite rules for Vercel deployment
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx                # Routes, global state (UserContext)
    ├── Firbase/
    │   └── firbase.js         # Firebase app/auth initialization
    ├── UserContext/
    │   └── UserContext.js     # React context for shared app state
    └── components/
        ├── Home.jsx, Main.jsx, Navbar.jsx, Menu.jsx, Footer.jsx, Slide.jsx
        ├── Cards.jsx           # Product card component
        ├── CategoryPage.jsx    # Category-filtered product listing
        ├── Description/        # Product detail page
        ├── Cart/                # Shopping cart
        ├── Checkout/            # Stripe checkout flow
        ├── Favourites/          # User favourites page
        ├── SuccessfulPayment/   # Post-payment confirmation page
        ├── Contact/             # Contact form
        ├── Logn In/             # Login page
        ├── SignUp/              # Sign-up page
        └── Admin/               # Admin dashboard
            ├── Admin.jsx
            ├── Products.jsx
            ├── CreatePosts.jsx
            ├── Orders.jsx
            ├── OrdersHistory.jsx
            └── Messages.jsx
```

## ⚙️ Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_BACKEND_URL=your_backend_url
VITE_ADMIN_ID=your_specific_admin_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

| Variable | Description |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key, used to redirect to Stripe Checkout |
| `VITE_BACKEND_URL` | Base URL of the running [backend API](../backend) (e.g. `http://localhost:5000`) |
| `VITE_ADMIN_ID` | Firebase UID that should be granted admin access (unlocks `/admin` route) |
| `VITE_FIREBASE_API_KEY` | Firebase project API key used to initialize Firebase Auth |

> ⚠️ Make sure the [backend](../backend) is running and reachable at `VITE_BACKEND_URL` before starting the frontend, since most pages fetch their data from it.

### 3. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` by default.

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server with hot reload |
| `npm run build` | Build an optimized production bundle into `dist/` |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Run ESLint over the codebase |

## 🧭 Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Home page |
| `/shirts`, `/t-shirts`, `/pants`, `/trousers`, `/blazers` | Public | Category product listings |
| `/description` | Public | Product detail page |
| `/signup` | Public | Sign up / login |
| `/payment` | Public | Post-checkout success page |
| `/favourites` | Authenticated users | User's favourite products |
| `/shoppingcart` | Authenticated users | Shopping cart & checkout |
| `/admin` | Admin only (`VITE_ADMIN_ID`) | Product, order, and message management dashboard |

## 🔐 Authentication

Authentication is handled via Firebase (`src/Firbase/firbase.js`). On login, the user's Firebase UID is compared against `VITE_ADMIN_ID` to determine whether they get access to the `/admin` dashboard, in addition to the standard authenticated routes (`/favourites`, `/shoppingcart`).

## 🚢 Deployment

The included `vercel.json` configures SPA-style rewrites so client-side routing works correctly when deployed to [Vercel](https://vercel.com). Remember to set the same environment variables in your hosting provider's dashboard.
