# Deployment Instructions

## Quick Deployment Checklist

### 1. Prepare Your Services

#### Stripe Setup
1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard → Developers → API keys
3. Create webhook endpoint: Dashboard → Developers → Webhooks
   - Endpoint URL: `https://your-domain.vercel.app/api/stripe-webhook`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
4. Copy webhook signing secret

#### Supabase Setup
1. Create project at https://supabase.com
2. Go to Storage → Create bucket named `ebooks`
3. Upload your ebook as `ai-mastery-2025.pdf`
4. Go to SQL Editor and run:
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
5. Get URL and anon key from Settings → API

#### SendGrid Setup
1. Create account at https://sendgrid.com
2. Verify sender identity for chris.t@ventarosales.com
3. Create API key with Mail Send permissions

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
cd ai-ebook-website
vercel
```

#### Option B: GitHub + Vercel
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Import project and deploy

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SENDGRID_API_KEY=SG.your_sendgrid_api_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
```

### 4. Test the Complete Flow

1. Visit your deployed site
2. Click "Get Your Copy Now"
3. Enter email and complete test payment
4. Verify email is sent
5. Test download link works

### 5. Go Live

1. Switch Stripe to live mode
2. Update environment variables with live keys
3. Test with real payment
4. Monitor webhook deliveries in Stripe dashboard

## Post-Deployment

### Analytics Setup
- Add Google Analytics to track conversions
- Set up Facebook Pixel for retargeting
- Monitor Stripe dashboard for payments

### SEO Optimization
- Submit sitemap to Google Search Console
- Set up Google My Business if applicable
- Create social media accounts for promotion

### Monitoring
- Set up Vercel monitoring alerts
- Monitor Supabase usage
- Check SendGrid delivery rates

## Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook secret matches
- Check Vercel function logs

**Download links not working:**
- Verify Supabase bucket permissions
- Check file exists in storage
- Ensure signed URL generation works

**Emails not sending:**
- Verify SendGrid sender identity
- Check API key permissions
- Monitor SendGrid activity feed

**Payment failures:**
- Check Stripe keys are correct
- Verify webhook endpoint is live
- Test with Stripe test cards

### Support
For technical issues: chris.t@ventarosales.com

