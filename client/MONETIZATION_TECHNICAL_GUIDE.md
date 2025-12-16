# Stripe Payment Integration - Technical Implementation Guide

## Overview
This guide shows you exactly how to add Stripe payment processing to GameBuddies.io for premium cosmetics.

**Estimated Implementation Time:** 3-4 hours for basic setup

---

## Architecture Overview

```
User clicks "Buy Premium"
        ↓
Frontend: Create Checkout Session
        ↓
Backend: POST /checkout → Stripe → Returns checkout_url
        ↓
Frontend: Redirect to Stripe checkout page
        ↓
User enters card → Stripe processes payment
        ↓
Stripe webhook → Backend: /webhook/stripe
        ↓
Backend: Verify payment → Update user.premium_status
        ↓
Frontend: Fetch user → See premium = true → Unlock cosmetics
```

---

## Part 1: Stripe Account Setup

### Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Sign up with email
3. Verify email
4. Complete account setup (business info)
5. Go to API Keys section

### Get Your API Keys
1. Dashboard → Developers → API Keys
2. Copy **Publishable Key** (starts with `pk_`)
3. Copy **Secret Key** (starts with `sk_`)
4. ⚠️ Never share secret key or commit to git!

### Store in Environment Variables
Create `.env` file in your game servers:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## Part 2: Backend Setup (Node.js/Express)

### Install Stripe Library
```bash
npm install stripe
```

### Create Payment Endpoints

**File: `server/routes/stripe.ts`**

```typescript
import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create checkout session
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { priceId } = req.body; // Price ID from Stripe

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      client_reference_id: userId, // Store user ID
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://gamebuddies.io/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://gamebuddies.io/pricing',
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(400).json({ error: 'Checkout failed' });
  }
});

// Webhook handler (Stripe sends payment confirmations here)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhook_secret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhook_secret);
  } catch (error) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Webhook Error');
  }

  // Handle subscription events
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionActive(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object.id);
      break;

    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;
  }

  res.json({ received: true });
});

// Handle subscription created/updated
async function handleSubscriptionActive(subscription: any) {
  const userId = subscription.metadata?.userId;
  const subscriptionId = subscription.id;

  if (!userId) {
    console.error('No userId in subscription');
    return;
  }

  // Update database: user is now premium
  await db.query(
    'UPDATE users SET premium_status = true, stripe_subscription_id = $1 WHERE id = $2',
    [subscriptionId, userId]
  );

  console.log(`✅ User ${userId} is now premium`);
}

// Handle subscription canceled
async function handleSubscriptionCanceled(subscription: any) {
  const subscriptionId = subscription.id;

  // Update database: user is no longer premium
  await db.query(
    'UPDATE users SET premium_status = false WHERE stripe_subscription_id = $1',
    [subscriptionId]
  );

  console.log(`❌ Subscription ${subscriptionId} canceled`);
}

export default router;
```

### Register Route in Main Server

**File: `server/index.ts`**

```typescript
import stripeRoutes from './routes/stripe';

app.use('/api/stripe', stripeRoutes);
```

### Configure Webhook Secret

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy Signing Secret
6. Add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Part 3: Database Schema

### Add Premium Columns

**Migration: `migrations/add_premium_columns.sql`**

```sql
-- Add premium status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  premium_status BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  premium_since TIMESTAMP,
  premium_expires TIMESTAMP
);

-- Create cosmetics table
CREATE TABLE IF NOT EXISTS cosmetics (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(50), -- 'susd', 'bingo', etc.
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(50), -- 'avatar_skin', 'room_theme', etc.
  cost_cents INTEGER, -- Price in cents
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_cosmetics table (which cosmetics user owns)
CREATE TABLE IF NOT EXISTS user_cosmetics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  cosmetic_id INTEGER,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cosmetic_id) REFERENCES cosmetics(id)
);
```

### Check Premium Status

```typescript
// Helper function to check if user is premium
export async function isPremium(userId: string): Promise<boolean> {
  const result = await db.query(
    'SELECT premium_status FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0]?.premium_status || false;
}

// Get user's owned cosmetics
export async function getUserCosmetics(userId: string): Promise<string[]> {
  const result = await db.query(
    `SELECT c.id, c.name FROM user_cosmetics uc
     JOIN cosmetics c ON uc.cosmetic_id = c.id
     WHERE uc.user_id = $1`,
    [userId]
  );
  return result.rows.map(r => r.name);
}
```

---

## Part 4: Frontend Setup (React)

### Install Stripe.js

```bash
npm install @stripe/react-stripe-js @stripe/js
```

### Create Stripe Provider

**File: `src/contexts/StripeContext.tsx`**

```typescript
import React, { createContext } from 'react';
import { loadStripe } from '@stripe/js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface StripeContextType {
  stripe: any;
  userPremium: boolean;
  setUserPremium: (premium: boolean) => void;
}

export const StripeContext = createContext<StripeContextType | undefined>(undefined);

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [userPremium, setUserPremium] = React.useState(false);

  return (
    <Elements stripe={stripePromise}>
      <StripeContext.Provider value={{ stripe: stripePromise, userPremium, setUserPremium }}>
        {children}
      </StripeContext.Provider>
    </Elements>
  );
};

export const useStripe = () => {
  const context = React.useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within StripeProvider');
  }
  return context;
};
```

### Create Checkout Button

**File: `src/components/PremiumButton.tsx`**

```typescript
import React from 'react';
import { useStripe } from '../contexts/StripeContext';
import { useAuth } from '../contexts/AuthContext';

interface PremiumButtonProps {
  priceId: string; // From Stripe
  planName: string;
  price: string;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({ priceId, planName, price }) => {
  const { userPremium } = useStripe();
  const { user, token } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleCheckout = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }

    if (userPremium) {
      alert('You already have premium!');
      return;
    }

    setLoading(true);

    try {
      // Call backend to create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe checkout
      const stripe = await window.Stripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe error:', error);
        alert('Checkout error: ' + error.message);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  if (userPremium) {
    return (
      <button disabled className="premium-button premium">
        ✅ Premium Active
      </button>
    );
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="premium-button"
    >
      {loading ? 'Loading...' : `Get ${planName} - ${price}/month`}
    </button>
  );
};
```

### Pricing Page

**File: `src/pages/Pricing.tsx`**

```typescript
import React from 'react';
import { PremiumButton } from '../components/PremiumButton';

export const PricingPage: React.FC = () => {
  return (
    <div className="pricing-page">
      <h1>GameBuddies Premium</h1>
      <p>Support development, unlock cosmetics!</p>

      <div className="pricing-grid">
        {/* BingoBuddies Premium */}
        <div className="pricing-card">
          <h2>BingoBuddies Premium</h2>
          <p className="price">$1.99/month</p>
          <ul className="features">
            <li>✅ 20+ exclusive cosmetics</li>
            <li>✅ Premium card templates</li>
            <li>✅ Custom backgrounds</li>
            <li>✅ Victory effects</li>
          </ul>
          <PremiumButton
            priceId="price_1NvXxJKxxxxx" // Get from Stripe
            planName="BingoBuddies Premium"
            price="$1.99"
          />
        </div>

        {/* SUSD Premium */}
        <div className="pricing-card">
          <h2>SUSD Premium</h2>
          <p className="price">$2.99/month</p>
          <ul className="features">
            <li>✅ 10+ avatar skins</li>
            <li>✅ Kill animations</li>
            <li>✅ Room themes</li>
            <li>✅ Streamer mode</li>
          </ul>
          <PremiumButton
            priceId="price_1NvXxKKxxxxx"
            planName="SUSD Premium"
            price="$2.99"
          />
        </div>

        {/* Platform Bundle */}
        <div className="pricing-card featured">
          <h2>⭐ All Games Bundle</h2>
          <p className="price">$4.99/month</p>
          <ul className="features">
            <li>✅ Premium for ALL games</li>
            <li>✅ 50+ cosmetics</li>
            <li>✅ Early access</li>
            <li>✅ Supporter badge</li>
          </ul>
          <PremiumButton
            priceId="price_1NvXxLKxxxxx"
            planName="All Games Premium"
            price="$4.99"
          />
        </div>
      </div>

      {/* FAQ */}
      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>Is this pay-to-win?</h3>
          <p>No! All cosmetics are purely visual. Free players can still win every game.</p>
        </div>
        <div className="faq-item">
          <h3>Can I cancel anytime?</h3>
          <p>Yes, cancel in your account settings with no commitment.</p>
        </div>
        <div className="faq-item">
          <h3>Are games still free?</h3>
          <p>100% yes. All games remain completely free to play.</p>
        </div>
      </div>
    </div>
  );
};
```

### Account/Subscription Management

**File: `src/components/AccountSettings.tsx`**

```typescript
import React from 'react';

export const AccountSettings: React.FC = () => {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="account-settings">
      <h2>Account Settings</h2>

      <div className="subscription-section">
        <h3>Subscription Status</h3>
        {user?.premium_status ? (
          <>
            <p className="status premium">✅ Premium Active</p>
            <p className="premium-since">
              Premium since: {new Date(user.premium_since).toLocaleDateString()}
            </p>
            <button onClick={handleOpenBillingPortal} className="btn-secondary">
              Manage Subscription
            </button>
          </>
        ) : (
          <>
            <p className="status free">Free Account</p>
            <a href="/pricing" className="btn-primary">
              Upgrade to Premium
            </a>
          </>
        )}
      </div>

      <div className="cosmetics-section">
        <h3>Your Cosmetics</h3>
        {user?.cosmetics?.length > 0 ? (
          <div className="cosmetics-grid">
            {user.cosmetics.map(cosmetic => (
              <div key={cosmetic.id} className="cosmetic-item">
                <img src={cosmetic.image} alt={cosmetic.name} />
                <p>{cosmetic.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No cosmetics yet. Get premium to unlock them!</p>
        )}
      </div>
    </div>
  );
};
```

---

## Part 5: Create Price IDs in Stripe

### Go to Stripe Products & Prices
1. Dashboard → Products
2. Click "Add product"
3. Name: "BingoBuddies Premium"
4. Pricing model: "Recurring"
5. Billing period: "Monthly"
6. Price: $1.99
7. Copy **Price ID** (looks like `price_1NvXxJK...`)

### Create All Prices
```
BingoBuddies Premium: price_xxxxx → $1.99/month
SUSD Premium: price_xxxxx → $2.99/month
DDF Premium: price_xxxxx → $1.99/month
ClueScale Premium: price_xxxxx → $1.99/month
SchoolQuizGame Premium: price_xxxxx → $3.99/month
All Games Bundle: price_xxxxx → $4.99/month
```

Add these to your frontend constants:

```typescript
// config/stripe.ts
export const STRIPE_PRICES = {
  bingo: 'price_1NvXxJK...',
  susd: 'price_1NvXxJK...',
  ddf: 'price_1NvXxJK...',
  clue: 'price_1NvXxJK...',
  schoolquiz: 'price_1NvXxJK...',
  bundle: 'price_1NvXxJK...',
};
```

---

## Part 6: Test Your Implementation

### Test in Stripe Test Mode

Use **test card numbers** (Stripe provides):
- **4242 4242 4242 4242** - Successful payment
- **4000 0000 0000 0002** - Card declined
- Any future date for expiration
- Any 3-digit CVC

### Test Flow
1. Click "Get Premium"
2. Enter test card 4242 4242 4242 4242
3. Enter future date (e.g., 12/25)
4. Enter any CVC (e.g., 123)
5. Complete checkout
6. Check Stripe dashboard → Payments for confirmation
7. Check database: `SELECT premium_status FROM users WHERE id = 'xxxxx'`
8. Verify `premium_status = true`

### Test Webhook
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Part 7: Environment Variables Checklist

### Frontend `.env`
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
REACT_APP_API_BASE_URL=https://api.gamebuddies.io
```

### Backend `.env`
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your_secret_key
```

---

## Part 8: Go Live with Production Keys

### When Ready to Accept Real Payments
1. Go to Stripe Dashboard
2. Click your name → Account Settings
3. Click "Go live"
4. Answer activation questions
5. Get **production** API keys (start with `pk_live_` and `sk_live_`)
6. Update `.env` with production keys
7. Update `success_url` and `cancel_url` to production domain
8. Test again with real payment in test mode first

---

## Part 9: Troubleshooting

### Webhook Not Firing
- [ ] Check Stripe Dashboard → Webhooks → Logs
- [ ] Verify webhook secret is correct
- [ ] Check server logs for errors
- [ ] Ensure endpoint is publicly accessible (not localhost)

### Payment Button Not Working
- [ ] Check browser console for errors
- [ ] Verify Stripe publishable key is correct
- [ ] Verify backend endpoint responds
- [ ] Check user is authenticated

### User Not Getting Premium
- [ ] Check webhook is processing `customer.subscription.created`
- [ ] Verify database update query runs
- [ ] Check user.premium_status in database
- [ ] Verify frontend checks premium status correctly

### Common Error Messages
```
"Error: Could not determine the payment method to use"
→ Stripe publishable key wrong

"Error: No such subscription"
→ Webhook webhook_secret wrong

"API key is invalid or does not match your project"
→ Backend secret key wrong or test/live mismatch
```

---

## Part 10: Production Deployment

### Render.com Deployment
1. Update `.env` with production Stripe keys
2. Update webhook URL in Stripe Dashboard:
   - Go to Webhooks
   - Click endpoint
   - Change URL to `https://your-domain.com/api/stripe/webhook`
3. Deploy to Render.com
4. Test again with production keys

### Verify It Works
1. Go to Stripe Dashboard → Products → Payments
2. Complete a test payment
3. Check database: User should have `premium_status = true`
4. Check Stripe webhook logs: Event should show `completed`

---

## Cost Analysis

### Stripe Fees
- **Per transaction:** 2.9% + $0.30
- **Example:** $1.99 → You receive $1.51
- **Year 1 at 100 monthly subs:** ~1800 * 0.029 + 0.30 * 12 * 100 = ~$114 in fees

### Revenue Example (Month 1)
```
10 customers @ $1.99/month
Gross: $19.90
Stripe fees: $1.89 (2.9% + $0.30)
Net: $18.01

After 100+ customers:
Gross: $199
Stripe fees: ~$6.50
Net: ~$192.50/month profit!
```

---

## Success Metrics

Track these in Stripe Dashboard:

- **Monthly Recurring Revenue (MRR)** → Total recurring revenue
- **Churn Rate** → % of customers who cancel
- **Conversion Rate** → % of players who buy premium
- **Average Revenue Per User (ARPU)** → Total revenue / total users

**Healthy targets:**
- Churn: <5% monthly
- Conversion: 5-15%
- ARPU: $0.50-2.00

---

## Next Steps

1. **This week:** Set up Stripe account, get API keys
2. **Week 2:** Implement backend webhook + database
3. **Week 3:** Build frontend checkout UI
4. **Week 4:** Test with test card numbers
5. **Week 5:** Deploy to production with production keys
6. **Week 6:** Soft launch to 10-50 beta testers
7. **Week 7:** Full launch announcement! 🎉

---

**Questions? Stripe docs are excellent:**
- https://stripe.com/docs/billing/quickstart
- https://stripe.com/docs/webhooks

You've got this! 💪
