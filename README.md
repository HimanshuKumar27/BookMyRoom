# 🏨 BookMyRoom

A full-stack hotel booking web application for discovering and booking budget to premium hotel rooms across India. Built with vanilla HTML/CSS/JS, Tailwind CSS, Supabase, and deployed on Netlify.

---

## ✨ Features

### For Guests
- **Smart Search** — Search by city, check-in/out dates, rooms, and guest count
- **Room Browsing** — Filter by type, city, price range, and availability
- **Room Comparison** — Compare up to 3 rooms side-by-side
- **Wishlist** — Save favourite rooms for later
- **Instant Booking** — Real-time availability checks with instant confirmation
- **Email Confirmation** — Automated booking confirmation via EmailJS
- **Coupon System** — `WELCOME20` code for 20% off (first 3 bookings)
- **GST Calculation** — Accurate Indian GST slabs (0% / 5% / 18%) based on room tariff
- **My Bookings** — View and manage all past and upcoming reservations
- **Recently Viewed** — Quick access to previously browsed rooms

### For Admins
- **Admin Dashboard** — Manage rooms, view bookings, and update availability
- **Real-time Updates** — Supabase real-time subscriptions keep data in sync

### Technical Highlights
- **Security** — Input sanitization, XSS prevention, rate limiting, form validation
- **Performance** — Lazy loading images, preloaded fonts, optimized WebP assets, aggressive caching headers
- **Responsive** — Fully responsive design across mobile, tablet, and desktop
- **SEO** — Proper meta tags, semantic HTML, descriptive titles on every page

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, JavaScript (ES Modules), Tailwind CSS v4 |
| **Backend / Database** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime) |
| **Email** | [EmailJS](https://www.emailjs.com/) |
| **Fonts** | Google Fonts (Plus Jakarta Sans, Inter, Poppins) |
| **Hosting** | [Netlify](https://www.netlify.com/) |

---

## 📁 Project Structure

```
BookMyRoom/
├── index.html              # Homepage with hero search, featured rooms, testimonials
├── rooms.html              # Room listings with filters, sort, and comparison
├── room-detail.html        # Individual room detail page
├── booking.html            # Booking form with pricing summary and coupon support
├── booking-success.html    # Booking confirmation page
├── my-bookings.html        # User's booking history
├── login.html              # User login
├── register.html           # User registration
├── admin.html              # Admin dashboard
├── email-template.html     # Email confirmation template
│
├── js/
│   ├── adapters/           # Repository & Service implementations (Data adapters)
│   │   ├── repositories/   # Supabase Room & Booking repositories
│   │   └── services/       # EmailJS, LocalStorage, and Auth services
│   ├── core/               # Enterprise and Application business logic
│   │   ├── entities/       # Pure business rules (Pricing, etc.)
│   │   ├── interfaces/     # Abstract port declarations for repositories/services
│   │   └── use-cases/      # Application-specific logic (Auth, Rooms, Bookings)
│   ├── infrastructure/     # Database setup, environment parser, security utils
│   │   ├── config/         # Environment configuration parser
│   │   ├── database/       # Supabase client instance
│   │   └── security/       # Rate limiting logic
│   └── presentation/       # User Interface rendering and client-side page controllers
│       ├── components/     # Reusable layout elements (Navbar, Footer, Toast)
│       ├── pages/          # Controller scripts for each page
│       └── utils/          # DOM, formatting, and validation helper utilities
│
├── css/
│   ├── input.css           # Tailwind CSS input file
│   ├── tailwind.css        # Compiled Tailwind output
│   └── style.css           # Custom styles and component classes
│
├── assets/
│   ├── images/             # Room and hero images (WebP)
│   ├── favicon-32.png      # Favicon 32×32
│   ├── favicon-192.png     # Favicon 192×192
│   └── apple-touch-icon.png # Apple touch icon
│
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── netlify.toml            # Netlify build and deploy config
├── package.json            # Node.js project config
└── README.md               # This file
```

---

## ⚡ Production Performance Optimizations

To prepare the application for production traffic scale (handling millions of active users), the application implements several core performance-engineering design patterns:

### 1. Database-Level Count Aggregations (Zero Memory Footprint Stats)
- **Home Page Urgency Stats**: The booking urgency counter queries `getTodayBookingsCount()` directly using Supabase `.select('id', { count: 'exact', head: true })` filtered with a `gte('created_at', today)` condition. This returns a single integer, preventing the application from fetching all booking records into memory to count them.
- **Dashboard Counters**: Admin metric cards utilize separate count requests instead of calculating `.length` of fetched record arrays.

### 2. Session Caching & Local Authorization Checks
- **Auth Tokens**: `authService.getUser()` attempts to retrieve user details from the active local session via `supabase.auth.getSession()` before initiating an external authentication token check request, saving up to 100ms of load latency per page load.
- **User Role Cache**: `authService.checkAdmin()` stores verified user roles in `sessionStorage`. This prevents repeated database fetches to the `profiles` table as administrators toggle between pages.

### 3. Decoupled Asynchronous Transaction Pipelines
- **Asynchronous Email Confirmation**: The checkout transaction creates the booking and redirects the guest to `booking-success.html` in under 200ms. EmailJS SDK scripts and dynamic email operations are triggered asynchronously on the success page, rendering an elegant visual loader (`Sending confirmation email...`) that updates dynamically once complete. This guarantees that API slowness or service downtime on the email gateway does not block reservations.

### 4. Static Inventory Caching
- **Room List Cache**: During booking date configuration, `booking.js` caches the rooms catalog in-memory. Updates to dates or guest counts only query live availability parameters (unavailable room IDs), avoiding re-fetching static room descriptions, pricing slabs, or image lists.

### 5. API Rate Limiting & Postgres Subscription Debouncing
- **Admin Table Pagination**: Implemented query ranges to enforce a pagination window of `50` records on booking lists, protecting admin browsers from crashes under high volume.
- **Subscription Throttle**: Wrapped database real-time notifications with a `300ms` debounce handler to prevent DOM redraw storms when multiple bookings or inventory updates occur concurrently.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Supabase](https://supabase.com/) project with `rooms`, `bookings`, and `profiles` tables
- (Optional) An [EmailJS](https://www.emailjs.com/) account for booking emails

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd BookMyRoom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase URL and anon key in `.env`, then create `js/env.js` based on `js/env.example.js`:
   ```js
   export const ENV = {
     SUPABASE_URL: 'https://your-project.supabase.co',
     SUPABASE_ANON_KEY: 'your-anon-key'
   };
   ```

4. **Build Tailwind CSS**
   ```bash
   npm run build:css
   ```

5. **Open in browser**

   Open `index.html` directly in a browser, or use a local server:
   ```bash
   npx serve .
   ```

### Development

Run Tailwind in watch mode during development:
```bash
npm run dev:css
```

---

## 🌐 Deployment (Netlify)

The project is configured for Netlify out of the box:

- **Build command:** `npm run build` (automatically compiles `js/env.js` and builds CSS assets)
- **Publish directory:** `.` (root)
- **Redirects and headers** are pre-configured in `netlify.toml`

### Environment Variables
Configure the following environment variables in your Netlify Dashboard under **Site configuration > Environment variables** to compile the configuration during deploy:

* `SUPABASE_URL` — Your Supabase project URL
* `SUPABASE_ANON_KEY` — Your Supabase Project API Anon key
* `EMAILJS_PUBLIC_KEY` — Your EmailJS Account Public Key
* `EMAILJS_SERVICE_ID` — Your EmailJS Service ID
* `EMAILJS_TEMPLATE_ID` — Your EmailJS Template ID
* `ADMIN_EMAIL` — The email address where admin notifications should be sent

---

## 📊 Database Schema

### `rooms` table
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Room name |
| `type` | text | Single / Double / Suite / Deluxe |
| `city` | text | City name |
| `price` | numeric | Price per night (₹) |
| `status` | text | Available / Booked |
| `capacity` | integer | Max guest count |
| `amenities` | text[] | List of amenities |
| `images` | text[] | Image URLs |
| `rating` | numeric | Average rating |
| `review_count` | integer | Number of reviews |

### `bookings` table
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `room_id` | uuid | Foreign key → rooms |
| `user_id` | uuid | Foreign key → auth.users |
| `guest_name` | text | Guest's full name |
| `email` | text | Contact email |
| `check_in` | date | Check-in date |
| `check_out` | date | Check-out date |
| `total_cost` | numeric | Total amount incl. GST |
| `status` | text | Confirmed / Cancelled |

---

## 👤 Author

**Himanshu Kumar**