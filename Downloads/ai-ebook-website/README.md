# AI Mastery 2025 Ebook Website

A complete e-commerce website for selling the "AI Mastery 2025" ebook with Stripe payments, email automation, and secure file downloads.

## Features

- 🎨 **Elite UI Design** - Modern, responsive design with animations and hover effects
- 💳 **Stripe Integration** - Secure payment processing
- 📧 **Email Automation** - SendGrid integration for purchase confirmations
- 📁 **Secure Downloads** - Supabase storage with signed URLs
- 🔍 **SEO Optimized** - Meta tags and structured data for AI-related keywords
- 📱 **Mobile Responsive** - Works perfectly on all devices
- ⚡ **Fast Performance** - Built with Vite and optimized for speed

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Vercel Serverless Functions
- **Payments**: Stripe Checkout
- **Email**: SendGrid
- **Storage**: Supabase
- **Deployment**: Vercel

## Quick Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd ai-ebook-website
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:

#### Stripe
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_SECRET_KEY` - Your Stripe secret key  
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret
- `VITE_STRIPE_PUBLISHABLE_KEY` - Same as publishable key (for frontend)

#### Supabase
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

#### SendGrid
- `SENDGRID_API_KEY` - Your SendGrid API key

### 3. Supabase Setup

1. Create a new Supabase project
2. Create a storage bucket named `ebooks`
3. Upload your ebook file as `ai-mastery-2025.pdf`
4. Create a `purchases` table:

```sql
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  product TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Stripe Setup

1. Create a Stripe account
2. Get your API keys from the dashboard
3. Set up a webhook endpoint pointing to `https://your-domain.vercel.app/api/stripe-webhook`
4. Configure webhook to listen for `checkout.session.completed` events

### 5. SendGrid Setup

1. Create a SendGrid account
2. Verify your sender email (chris.t@ventarosales.com)
3. Get your API key from the dashboard

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view in browser.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Environment Variables in Vercel

Add all environment variables from `.env.example` in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable from your `.env.local` file

## File Structure

```
ai-ebook-website/
├── api/                          # Vercel serverless functions
│   ├── create-checkout-session.js # Stripe checkout creation
│   ├── get-download-link.js       # Download link generation
│   └── stripe-webhook.js          # Webhook handler
├── src/
│   ├── components/
│   │   ├── HomePage.jsx           # Landing page
│   │   ├── CheckoutPage.jsx       # Payment page
│   │   └── SuccessPage.jsx        # Success/download page
│   ├── App.jsx                    # Main app component
│   └── main.jsx                   # Entry point
├── public/                        # Static assets
├── .env.example                   # Environment variables template
├── vercel.json                    # Vercel configuration
└── package.json                   # Dependencies
```

## Key Features Explained

### Payment Flow
1. User clicks "Buy Now" on homepage
2. Redirected to checkout page with Stripe integration
3. After successful payment, redirected to success page
4. Download link generated via Supabase signed URL
5. Confirmation email sent via SendGrid

### Security
- Stripe handles all payment processing
- Download links expire after 1-24 hours
- Webhook signature verification
- Environment variables for sensitive data

### SEO Optimization
- Meta tags for AI-related keywords
- Open Graph and Twitter Card support
- Structured data for rich snippets
- Semantic HTML structure

## Customization

### Styling
- Edit Tailwind classes in components
- Modify colors in `tailwind.config.js`
- Add custom CSS in component files

### Content
- Update ebook details in `HomePage.jsx`
- Modify email templates in API functions
- Change pricing in Stripe configuration

### Branding
- Replace logo and images in `public/` folder
- Update contact email throughout codebase
- Modify meta tags and titles

## Support

For technical support, contact: chris.t@ventarosales.com

## License

Private - All rights reserved

