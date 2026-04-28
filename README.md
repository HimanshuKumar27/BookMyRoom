# 🏨 BookMyRoom

A full-stack hotel booking web application for discovering and booking budget to premium hotel rooms across India. Built with vanilla HTML/CSS/JS, Tailwind CSS, Supabase, and deployed on Netlify.

> **Live Site:** Deployed on [Netlify](https://bookmyroomonline.netlify.app/)

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
│   ├── supabase-config.js  # Supabase client initialization
│   ├── utils.js            # Shared utilities (navbar, footer, formatting, GST, etc.)
│   ├── email.js            # EmailJS booking confirmation
│   ├── security.js         # Sanitization, validation, rate limiting
│   ├── env.js              # Environment variables (gitignored)
│   └── env.example.js      # Template for env.js
│
├── css/
│   ├── input.css           # Tailwind CSS input file
│   ├── tailwind.css         # Compiled Tailwind output
│   └── style.css           # Custom styles and component classes
│
├── assets/
│   ├── images/             # Room and hero images (WebP)
│   ├── rooms/              # Additional room assets
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

- **Build command:** `npm run build:css`
- **Publish directory:** `.` (root)
- **Redirects and headers** are pre-configured in `netlify.toml`

Simply connect the GitHub repo to Netlify, and set the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in the Netlify dashboard.

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

Built with ❤️ using Supabase + Netlify
