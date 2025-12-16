# Stripe Subscription & Premium Features Implementation Guide

**Document Version:** 1.0
**Last Updated:** November 7, 2025
**Status:** Ready for Implementation

---

## Executive Summary

This guide provides a complete technical blueprint for implementing Stripe subscriptions and premium features across GameBuddies platform. The architecture maintains **zero barriers to entry for free users** while enabling monetization through optional premium subscriptions.

**Key Architectural Principle:** Users login once (anywhere), premium status works everywhere automatically via shared JWT tokens.

---

## Table of Contents

1. [Competitor Pricing Analysis](#1-competitor-pricing-analysis)
2. [Recommended Pricing](#2-recommended-pricing)
3. [User Flows](#3-user-flows)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Database Schema](#5-database-schema)
6. [Backend Implementation](#6-backend-implementation)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Game Integration](#8-game-integration)
9. [Streamer Referral System](#9-streamer-referral-system)
10. [Implementation Timeline](#10-implementation-timeline)
11. [Testing & Deployment](#11-testing--deployment)

---

## 1. Competitor Pricing Analysis

### Competitive Landscape (2024-2025)

| Service | Type | Monthly | Annual | Annual Equivalent | Target Audience |
|---------|------|---------|--------|-------------------|-----------------|
| **Apple Arcade** | Game Platform | $6.99 | $49.99 | $4.17/mo | Casual gamers |
| **Duolingo Super** | Language Learning | - | $59.88 | $4.99/mo | Language learners |
| **Quizlet Plus** | Study/Quiz | $7.99 | $35.99 | $2.99/mo | Students |
| **Kahoot! Starter** | Quiz/Business | $10 | - | $10/mo | Teachers/Business |
| **Jackbox Games (Luna)** | Party Games | $4.99 | - | $4.99/mo | Party gamers |
| **Among Us** | Social Game | FREE | - | - | Casual multiplayer |
| **Gartic Phone** | Party Game | FREE | - | - | Web-based party |
| **Skribbl.io** | Drawing Game | FREE | - | - | Web-based party |
| **GameBuddies (Recommended)** | **Party/Quiz** | **€4.99** | **€39.99** | **€3.33/mo** | **Social gamers** |

### Key Market Insights

1. **€4.99/month is industry standard** for casual game subscriptions
   - Below the psychological €5 impulse-buy barrier
   - Matches Apple Arcade pricing
   - Aligns with Duolingo, Jackbox, and proven winners

2. **Free alternatives exist** but premium experience justifies paid tier
   - Gartic Phone, Skribbl.io are completely free
   - Users pay for convenience, features, ad-free experience
   - Party games have strong network effects (bigger player base = more fun)

3. **Annual discounts drive conversions**
   - 30-40% discount encourages annual purchases
   - Improves lifetime value and reduces churn
   - €39.99/year = €3.33/month (33% discount)

4. **Lifetime deals work best as limited-time launch offers**
   - Creates urgency for early adopters
   - Should phase out after initial growth phase
   - User's choice of €19.99 lifetime is aggressive but great for adoption

### Why GameBuddies Pricing Works

- **€4.99/month** is familiar to users (Apple Arcade price point)
- **€39.99/year** offers clear value (save €20)
- **€19.99 lifetime** attracts committed early supporters
- **Competitive advantage:** Lower than Kahoot (€10), similar to Jackbox/Duolingo
- **Free tier exists:** No paywall for casual players, ads are acceptable monetization

---

## 2. Recommended Pricing

### Pricing Structure

| Tier | Price | Billing | Annual Equivalent | Best For |
|------|-------|---------|-------------------|----------|
| **Free** | €0/month | N/A | N/A | Casual players, viral growth |
| **Premium Monthly** | **€4.99/month** | Monthly recurring | €4.99/mo | Flexible commitment |
| **Premium Annual** | **€39.99/year** | One-time yearly | €3.33/mo | Cost-conscious users |
| **Premium Lifetime** | **€19.99** | One-time purchase | €4.08/mo* | Early adopters, supporters |

*Lifetime breakeven at 4 months (very aggressive but incentivizes early adoption)

### Pricing Rationale

**Monthly (€4.99):**
- Industry standard, proven conversion rate
- Leaves €3.49 net after 30% platform fees
- Easy impulse purchase
- Low commitment for skeptical users

**Annual (€39.99):**
- Saves users €20/year vs monthly
- 33% discount incentivizes annual commitment
- Reduces payment processing overhead
- Improves lifetime value (lower churn on annual subscribers)
- Position as "Best Value" option

**Lifetime (€19.99):**
- Only 4-month payback period (aggressive)
- Creates launch urgency ("Limited-time offer!")
- Captures value from committed early supporters
- Can be phased out or increased to €49.99 after initial growth

### Platform Fee Considerations

**Apple App Store:**
- 30% commission (15% after Year 1 on subscriptions)
- In-app purchases: 30%

**Google Play Store:**
- 15% commission on subscriptions (from day one!)
- In-app purchases: varies

**Web (Stripe directly):**
- 2.9% + €0.30 per transaction
- Best margins, no platform middleman

**Impact on Pricing:**
- €4.99 monthly → €3.49 net (30% fee)
- €39.99 annual → €27.99 net (30% fee)
- €19.99 lifetime → €13.99 net (30% fee)

---

## 3. User Flows

### Flow A: Upgrade via Central Hub (gamebuddies.io)

```
1. User visits gamebuddies.io
   ↓
2. Sees "Upgrade to Premium" banner/button
   ↓
3. Clicks → Redirected to /pricing page
   ↓
4. Selects subscription tier
   ↓
5. "Subscribe" button → Stripe Checkout
   ↓
6. Completes payment
   ↓
7. Stripe webhook updates database: user_subscriptions.status = 'active'
   ↓
8. User sees "You're now Premium!" confirmation
   ↓
9. Launches any game → Premium features active automatically
   ↓
10. No ads, premium badge shown, all features unlocked
```

### Flow B: Upgrade from Individual Game

```
1. User playing SUSD, DDF, or any game
   ↓
2. Sees "Go Premium" button in settings/menu
   ↓
3. Clicks "Login for Premium" or "Upgrade"
   ↓
4. AuthModal opens (embedded in game)
   ↓
5. Logs in → Redirected to Stripe Checkout
   ↓
6. Completes payment
   ↓
7. Returns to game
   ↓
8. JWT token updated with isPremium: true
   ↓
9. Ads hidden, premium features unlocked immediately
```

### Flow C: Guest Play (Current Behavior Maintained)

```
1. User visits gamebuddies.io or game directly
   ↓
2. Can play without logging in (guest mode)
   ↓
3. Ads display at natural breaks (lobby, between rounds)
   ↓
4. "Go Premium" prompts show occasionally
   ↓
5. User clicks → Offered pricing page
   ↓
6. Converts to premium → All ads hidden
```

### Flow D: Streamer Referral

```
1. Streamer shares link: gamebuddies.io/?ref=streamer_name
   ↓
2. New user visits link
   ↓
3. Referral code stored in localStorage (30-day persistence)
   ↓
4. User signs up/logs in
   ↓
5. Backend records: streamer_referrals row created
   ↓
6. User upgrades to premium
   ↓
7. Webhook creates streamer_commissions entry
   ↓
8. Dashboard shows: streamer earned €X commission
```

---

## 4. Authentication Architecture

### Current State
- Gamebuddies.Io uses JWT-based authentication
- Supabase PostgreSQL for user data
- Session tokens issued on room creation
- No shared auth across games yet

### Enhanced Architecture

#### JWT Token Structure

```javascript
// Token issued on login
{
  userId: "uuid-123",
  username: "player_name",
  email: "user@example.com",
  isPremium: true,
  premiumTier: "monthly",        // 'monthly' | 'annual' | 'lifetime'
  premiumExpiresAt: "2025-12-07", // null for lifetime
  ownedPacks: [1, 5, 7],          // Question pack IDs (future feature)
  referralCode: "streamer_name",  // How user was referred
  role: "player",                 // 'player' | 'streamer' | 'admin'
  iat: 1730918400,                // Issued at
  exp: 1731004800                 // Expires in 24 hours
}
```

#### Token Persistence

**Storage Strategy:**
```javascript
// In localStorage (accessible by JavaScript)
localStorage.setItem('authToken', jwtToken);

// In httpOnly cookie (sent automatically with requests)
// Set by server: Set-Cookie: authToken=...; httpOnly; Secure; SameSite=Strict
```

**Benefits:**
- Same JWT accessible across all games on gamebuddies.io domain
- Secure (httpOnly prevents XSS access)
- Auto-sent with API requests
- Persists across page reloads

#### Token Refresh Flow

```javascript
// Check token validity on app load
const token = localStorage.getItem('authToken');

if (token) {
  if (isExpired(token)) {
    // Request new token using refresh token
    const newToken = await fetch('/api/auth/refresh', {
      credentials: 'include'  // Send httpOnly cookie
    });
    localStorage.setItem('authToken', newToken);
  }
  // Token still valid, use it
} else {
  // No token, user is guest
}
```

#### Cross-Game Authentication

**How premium works everywhere:**

1. User logs in at gamebuddies.io → JWT created + stored
2. User launches SUSD game
3. SUSD game checks localStorage for JWT
4. Finds token + isPremium: true
5. SUSD game automatically disables ads, shows premium features
6. Zero additional login required

**Implementation in each game:**

```javascript
// Game component on mount
useEffect(() => {
  const token = localStorage.getItem('authToken');

  if (token) {
    const decoded = jwtDecode(token);
    setUserPremium(decoded.isPremium);

    if (decoded.isPremium) {
      disableAds();
      showPremiumBadge();
    }
  } else {
    setUserPremium(false);
    enableAds();
  }
}, []);
```

---

## 5. Database Schema

### New Tables (Supabase Migration)

#### user_subscriptions
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe reference
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,

  -- Subscription details
  subscription_status VARCHAR(50), -- 'active', 'past_due', 'canceled', 'expired'
  plan_type VARCHAR(50), -- 'monthly', 'annual', 'lifetime'

  -- Pricing (in cents)
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,

  -- Timestamps
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, plan_type) -- User can have one active per type
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(subscription_status);
```

#### streamers (for manual streamer program)
```sql
CREATE TABLE streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Streamer info
  twitch_username VARCHAR(255),
  youtube_username VARCHAR(255),
  referral_code VARCHAR(100) UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0.20, -- 20%
  flat_fee_monthly_cents INTEGER, -- For micro-streamers

  -- Status
  is_active BOOLEAN DEFAULT true,
  approved_by_admin UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_streamers_referral_code ON streamers(referral_code);
CREATE INDEX idx_streamers_user_id ON streamers(user_id);
```

#### streamer_referrals
```sql
CREATE TABLE streamer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Referral tracking
  referred_at TIMESTAMP DEFAULT NOW(),
  referral_source VARCHAR(50), -- 'direct_link', 'code_entry', 'twitch_link'

  -- Conversion tracking
  converted_to_premium BOOLEAN DEFAULT false,
  converted_at TIMESTAMP,
  conversion_amount_cents INTEGER, -- Amount of conversion

  -- Lifetime value
  lifetime_value_cents INTEGER DEFAULT 0,

  UNIQUE(streamer_id, referred_user_id) -- Each streamer refers user once
);

CREATE INDEX idx_streamer_referrals_streamer_id ON streamer_referrals(streamer_id);
CREATE INDEX idx_streamer_referrals_referred_user ON streamer_referrals(referred_user_id);
CREATE INDEX idx_streamer_referrals_converted ON streamer_referrals(converted_to_premium);
```

#### streamer_commissions
```sql
CREATE TABLE streamer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES streamer_referrals(id) ON DELETE SET NULL,

  -- Commission details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Payment status
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'processing'
  stripe_payout_id VARCHAR(255),

  -- Dates
  earned_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,

  UNIQUE(referral_id) -- Each referral generates one commission entry
);

CREATE INDEX idx_commissions_streamer_id ON streamer_commissions(streamer_id);
CREATE INDEX idx_commissions_payment_status ON streamer_commissions(payment_status);
```

#### Migration Script

```sql
-- File: Gamebuddies.Io/server/migrations/001_stripe_schema.sql

BEGIN;

-- Create tables
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  subscription_status VARCHAR(50),
  plan_type VARCHAR(50),
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'EUR',
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  canceled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, plan_type)
);

CREATE TABLE streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  twitch_username VARCHAR(255),
  youtube_username VARCHAR(255),
  referral_code VARCHAR(100) UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 0.20,
  flat_fee_monthly_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  approved_by_admin UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE streamer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_at TIMESTAMP DEFAULT NOW(),
  referral_source VARCHAR(50),
  converted_to_premium BOOLEAN DEFAULT false,
  converted_at TIMESTAMP,
  conversion_amount_cents INTEGER,
  lifetime_value_cents INTEGER DEFAULT 0,
  UNIQUE(streamer_id, referred_user_id)
);

CREATE TABLE streamer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES streamer_referrals(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_status VARCHAR(50) DEFAULT 'pending',
  stripe_payout_id VARCHAR(255),
  earned_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  UNIQUE(referral_id)
);

-- Create indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(subscription_status);
CREATE INDEX idx_streamers_referral_code ON streamers(referral_code);
CREATE INDEX idx_streamers_user_id ON streamers(user_id);
CREATE INDEX idx_streamer_referrals_streamer_id ON streamer_referrals(streamer_id);
CREATE INDEX idx_streamer_referrals_referred_user ON streamer_referrals(referred_user_id);
CREATE INDEX idx_streamer_referrals_converted ON streamer_referrals(converted_to_premium);
CREATE INDEX idx_commissions_streamer_id ON streamer_commissions(streamer_id);
CREATE INDEX idx_commissions_payment_status ON streamer_commissions(payment_status);

COMMIT;
```

---

## 6. Backend Implementation

### File Structure

```
Gamebuddies.Io/server/
├── routes/
│   ├── payments.js          [NEW] Stripe checkout + webhooks
│   ├── subscriptions.js     [NEW] Subscription status API
│   ├── auth.js              [MODIFY] Add premium status to login
│   └── streamers.js         [NEW] Streamer dashboard API
├── services/
│   ├── stripeService.js     [NEW] Stripe SDK wrapper
│   └── subscriptionService.js [NEW] Subscription logic
├── middlewares/
│   ├── premiumCheck.js      [NEW] Verify premium status
│   └── auth.js              [MODIFY] Add premium verification
├── webhooks/
│   └── stripe.js            [NEW] Stripe event handlers
└── migrations/
    └── 001_stripe_schema.sql [NEW] Database migration
```

### 6.1 Stripe Service Wrapper

**File:** `server/services/stripeService.js`

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  // Create a customer in Stripe
  async createCustomer(email, userId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId }
    });
    return customer;
  }

  // Create checkout session (for both monthly and one-time purchases)
  async createCheckoutSession(customerId, priceId, metadata = {}) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: priceId.includes('recurring') ? 'subscription' : 'payment',
      success_url: `${process.env.APP_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata
    });
    return session;
  }

  // Retrieve subscription details
  async getSubscription(subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return sub;
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    const sub = await stripe.subscriptions.del(subscriptionId);
    return sub;
  }

  // Construct webhook event (must verify signature)
  constructWebhookEvent(body, sig, secret) {
    return stripe.webhooks.constructEvent(body, sig, secret);
  }
}

module.exports = new StripeService();
```

### 6.2 Payments Route

**File:** `server/routes/payments.js`

```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../services/stripeService');
const subscriptionService = require('../services/subscriptionService');
const { supabase } = require('../lib/supabase');
const auth = require('../middlewares/auth');

// Get available prices from Stripe
router.get('/prices', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });

    const formatted = prices.data.map(price => ({
      id: price.id,
      name: price.product.name,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || 'one_time',
      intervalCount: price.recurring?.interval_count || 1
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create checkout session
router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { priceId } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get or create Stripe customer
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = existing?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeService.createCustomer(userEmail, userId);
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession(customerId, priceId, {
      userId,
      email: userEmail
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripeService.constructWebhookEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Webhook handlers
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  const price = await stripe.prices.retrieve(priceId);

  // Determine plan type
  let planType = 'monthly';
  if (price.recurring?.interval === 'year') {
    planType = 'annual';
  } else if (!price.recurring) {
    planType = 'lifetime';
  }

  // Save subscription to database
  await supabase.from('user_subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active',
    plan_type: planType,
    amount_cents: price.unit_amount,
    currency: price.currency,
    started_at: new Date(subscription.start_date * 1000),
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000)
  });

  // Handle streamer referral commission
  await subscriptionService.handleReferralCommission(userId, price.unit_amount);

  console.log(`User ${userId} subscription activated: ${planType}`);
}

async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;

  if (subscriptionId) {
    // Update subscription period
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const { data: user } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (user) {
      await supabase
        .from('user_subscriptions')
        .update({
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          subscription_status: 'active'
        })
        .eq('user_id', user.user_id);
    }
  }
}

async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;

  if (subscriptionId) {
    // Mark subscription as past_due
    const { data: user } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (user) {
      await supabase
        .from('user_subscriptions')
        .update({ subscription_status: 'past_due' })
        .eq('user_id', user.user_id);
    }
  }
}

async function handleSubscriptionUpdated(subscription) {
  const { data: user } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (user) {
    await supabase
      .from('user_subscriptions')
      .update({
        subscription_status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000)
      })
      .eq('user_id', user.user_id);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const { data: user } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (user) {
    await supabase
      .from('user_subscriptions')
      .update({
        subscription_status: 'canceled',
        canceled_at: new Date()
      })
      .eq('user_id', user.user_id);
  }
}

module.exports = router;
```

### 6.3 Subscription Service

**File:** `server/services/subscriptionService.js`

```javascript
const { supabase } = require('../lib/supabase');

class SubscriptionService {
  // Check if user is premium
  async isPremium(userId) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return false;

    // Check if subscription is active and not expired
    if (data.subscription_status !== 'active') return false;

    // For monthly/annual, check expiration
    if (data.plan_type !== 'lifetime') {
      const now = new Date();
      const expiresAt = new Date(data.current_period_end);
      if (now > expiresAt) return false;
    }

    return true;
  }

  // Get subscription details
  async getSubscription(userId) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      isPremium: await this.isPremium(userId),
      planType: data.plan_type,
      status: data.subscription_status,
      expiresAt: data.current_period_end,
      createdAt: data.created_at
    };
  }

  // Handle streamer referral commission
  async handleReferralCommission(userId, amountCents) {
    // Find if user was referred by a streamer
    const { data: referral } = await supabase
      .from('streamer_referrals')
      .select('*, streamer:streamers(*)')
      .eq('referred_user_id', userId)
      .single();

    if (!referral || !referral.streamer) return;

    // Mark as converted
    await supabase
      .from('streamer_referrals')
      .update({
        converted_to_premium: true,
        converted_at: new Date(),
        conversion_amount_cents: amountCents,
        lifetime_value_cents: amountCents
      })
      .eq('id', referral.id);

    // Calculate commission
    const commissionRate = referral.streamer.commission_rate || 0.20;
    const commissionCents = Math.floor(amountCents * commissionRate);

    // Create commission record
    await supabase.from('streamer_commissions').insert({
      streamer_id: referral.streamer_id,
      referral_id: referral.id,
      amount_cents: commissionCents,
      payment_status: 'pending',
      earned_at: new Date()
    });

    console.log(`Commission created: €${(commissionCents / 100).toFixed(2)} for streamer ${referral.streamer.referral_code}`);
  }
}

module.exports = new SubscriptionService();
```

### 6.4 Premium Check Middleware

**File:** `server/middlewares/premiumCheck.js`

```javascript
const subscriptionService = require('../services/subscriptionService');

// Middleware to verify premium status
async function checkPremiumStatus(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      req.isPremium = false;
      return next();
    }

    const isPremium = await subscriptionService.isPremium(userId);
    req.isPremium = isPremium;

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    req.isPremium = false;
    next();
  }
}

module.exports = checkPremiumStatus;
```

### 6.5 Enhanced Authentication Route

**File:** `server/routes/auth.js` (MODIFY existing)

```javascript
// Modify login endpoint to include premium status

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // ... existing login logic ...

    // Get subscription status
    const subscriptionService = require('../services/subscriptionService');
    const isPremium = await subscriptionService.isPremium(user.id);
    const subscription = await subscriptionService.getSubscription(user.id);

    // Create JWT with premium info
    const token = jwt.sign({
      userId: user.id,
      username: user.username,
      email: user.email,
      isPremium,
      premiumTier: subscription?.planType || null,
      premiumExpiresAt: subscription?.expiresAt || null
    }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      token,
      user: {
        userId: user.id,
        username: user.username,
        isPremium,
        premiumTier: subscription?.planType
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### 6.6 Streamer Routes

**File:** `server/routes/streamers.js`

```javascript
const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const auth = require('../middlewares/auth');

// Get streamer dashboard (manual admin function)
// You'll access this through database admin panel
router.post('/admin/create-streamer', auth, async (req, res) => {
  try {
    // Only admin can create streamers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { userId, twitchUsername, youtubeUsername, commissionRate } = req.body;

    // Generate unique referral code
    let referralCode = twitchUsername || youtubeUsername;
    referralCode = referralCode.toLowerCase().replace(/\s+/g, '_');

    // Check if code exists
    const { data: existing } = await supabase
      .from('streamers')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Referral code already exists' });
    }

    // Create streamer
    const { data: streamer } = await supabase
      .from('streamers')
      .insert({
        user_id: userId,
        twitch_username: twitchUsername,
        youtube_username: youtubeUsername,
        referral_code: referralCode,
        commission_rate: commissionRate || 0.20,
        approved_by_admin: req.user.userId,
        approved_at: new Date()
      })
      .select()
      .single();

    res.json({
      streamer,
      referralLink: `${process.env.APP_URL}/?ref=${streamer.referral_code}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get streamer dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { data: streamer } = await supabase
      .from('streamers')
      .select('*')
      .eq('user_id', req.user.userId)
      .single();

    if (!streamer) {
      return res.status(404).json({ error: 'Streamer profile not found' });
    }

    // Get referral stats
    const { data: referrals } = await supabase
      .from('streamer_referrals')
      .select('*')
      .eq('streamer_id', streamer.id);

    // Get commission stats
    const { data: commissions } = await supabase
      .from('streamer_commissions')
      .select('*')
      .eq('streamer_id', streamer.id);

    const totalReferrals = referrals?.length || 0;
    const conversions = referrals?.filter(r => r.converted_to_premium).length || 0;
    const conversionRate = totalReferrals > 0 ? (conversions / totalReferrals * 100).toFixed(1) : 0;
    const totalEarned = commissions?.reduce((sum, c) => sum + c.amount_cents, 0) || 0;
    const totalPaid = commissions
      ?.filter(c => c.payment_status === 'paid')
      .reduce((sum, c) => sum + c.amount_cents, 0) || 0;
    const pendingCents = totalEarned - totalPaid;

    res.json({
      streamer,
      stats: {
        referralLink: `${process.env.APP_URL}/?ref=${streamer.referral_code}`,
        totalReferrals,
        conversions,
        conversionRate: `${conversionRate}%`,
        totalEarned: `€${(totalEarned / 100).toFixed(2)}`,
        totalPaid: `€${(totalPaid / 100).toFixed(2)}`,
        pending: `€${(pendingCents / 100).toFixed(2)}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 7. Frontend Implementation

### 7.1 Pricing Page

**File:** `client/src/pages/PricingPage.js`

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PricingPage.css';

export default function PricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const authToken = localStorage.getItem('authToken');

  const tiers = [
    {
      name: 'Monthly',
      price: '€4.99',
      period: '/month',
      priceId: process.env.REACT_APP_STRIPE_MONTHLY_PRICE,
      features: [
        'Ad-free experience',
        'Premium features in all games',
        'Premium badge',
        'Cancel anytime',
        '24h support'
      ],
      cta: 'Subscribe Monthly',
      highlight: false
    },
    {
      name: 'Annual',
      price: '€39.99',
      period: '/year',
      priceId: process.env.REACT_APP_STRIPE_ANNUAL_PRICE,
      savings: 'Save 33%',
      features: [
        'Everything in Monthly',
        'Best value',
        'Lock in price for 1 year',
        '24h support',
        'Early access to features'
      ],
      cta: 'Subscribe Annually',
      highlight: true
    },
    {
      name: 'Lifetime',
      price: '€19.99',
      period: 'one-time',
      priceId: process.env.REACT_APP_STRIPE_LIFETIME_PRICE,
      badge: 'Limited Time',
      features: [
        'Ad-free forever',
        'All premium features',
        'Premium badge',
        'Lifetime support',
        'No recurring charges'
      ],
      cta: 'Buy Lifetime',
      highlight: false
    }
  ];

  const handleSubscribe = async (priceId) => {
    if (!authToken) {
      navigate('/login?redirect=/pricing');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/payments/create-checkout',
        { priceId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Unlock all games ad-free and enjoy premium features</p>
      </div>

      <div className="pricing-tiers">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`pricing-card ${tier.highlight ? 'highlight' : ''}`}
          >
            {tier.badge && <div className="badge">{tier.badge}</div>}
            {tier.savings && <div className="savings">{tier.savings}</div>}

            <h3>{tier.name}</h3>

            <div className="price">
              <span className="amount">{tier.price}</span>
              <span className="period">{tier.period}</span>
            </div>

            <ul className="features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <span className="checkmark">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className="cta-button"
              onClick={() => handleSubscribe(tier.priceId)}
              disabled={loading}
            >
              {loading ? 'Processing...' : tier.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h4>Can I cancel anytime?</h4>
          <p>Yes! Monthly and annual subscriptions can be canceled anytime with no penalties. You'll keep access until the end of your billing period.</p>
        </div>
        <div className="faq-item">
          <h4>What does "premium" include?</h4>
          <p>Ad-free experience across all games, exclusive features, premium badge, and priority support.</p>
        </div>
        <div className="faq-item">
          <h4>Is my payment secure?</h4>
          <p>Yes! We use Stripe, the industry-leading payment processor trusted by millions.</p>
        </div>
      </div>
    </div>
  );
}
```

### 7.2 Account Page

**File:** `client/src/pages/AccountPage.js`

```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AccountPage.css';

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    if (!authToken) {
      navigate('/login');
      return;
    }

    fetchUserData();
  }, [authToken]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      setUser(response.data.user);
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="account-page">
      <h1>My Account</h1>

      <section className="account-info">
        <h2>Account Details</h2>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Email:</strong> {user?.email}</p>
      </section>

      {subscription?.isPremium ? (
        <section className="subscription-info premium">
          <h2>✓ You're Premium!</h2>
          <p><strong>Plan:</strong> {subscription.planType}</p>
          {subscription.expiresAt && (
            <p><strong>Expires:</strong> {new Date(subscription.expiresAt).toLocaleDateString()}</p>
          )}
          <button className="manage-button">Manage Subscription</button>
        </section>
      ) : (
        <section className="subscription-info">
          <h2>Go Premium</h2>
          <p>Unlock ad-free experience and premium features across all games</p>
          <button
            className="upgrade-button"
            onClick={() => navigate('/pricing')}
          >
            View Plans
          </button>
        </section>
      )}
    </div>
  );
}
```

### 7.3 Shared Auth Modal Component

**File:** `client/src/components/AuthModal.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post('/api/auth/login', {
          username,
          password
        });

        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('authToken', JSON.stringify(response.data.user));

        onSuccess?.(response.data.user);
        onClose();
      } else {
        const response = await axios.post('/api/auth/register', {
          username,
          email,
          password
        });

        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        onSuccess?.(response.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>

        <h2>{isLogin ? 'Login' : 'Create Account'}</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="toggle">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

### 7.4 Premium Badge Component

**File:** `client/src/components/PremiumBadge.js`

```javascript
import React from 'react';
import './PremiumBadge.css';

export default function PremiumBadge({ isPremium, tier }) {
  if (!isPremium) return null;

  return (
    <div className="premium-badge">
      <span className="star">★</span>
      <span className="text">
        Premium {tier === 'lifetime' ? '(Lifetime)' : ''}
      </span>
    </div>
  );
}
```

---

## 8. Game Integration

### 8.1 How Games Check Premium Status

Each game (SUSD, DDF, ClueScale, etc.) needs to check the JWT token in localStorage.

**In each game's main component:**

```javascript
import { jwtDecode } from 'jwt-decode';

function GameComponent() {
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Check for valid token in localStorage
    const token = localStorage.getItem('authToken');

    if (token) {
      try {
        const decoded = jwtDecode(token);

        // Check if token is still valid
        if (decoded.exp * 1000 > Date.now()) {
          setIsPremium(decoded.isPremium || false);
        } else {
          // Token expired, remove it
          localStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
  }, []);

  // Use isPremium to conditionally render features
  return (
    <div>
      {!isPremium && <AdsComponent />}
      {isPremium && <PremiumBadge />}
    </div>
  );
}
```

### 8.2 Add Login Button to Game UI

In each game's navbar/settings:

```javascript
function GameNavbar() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const authToken = localStorage.getItem('authToken');

  useEffect(() => {
    if (authToken) {
      const decoded = jwtDecode(authToken);
      setUser(decoded);
    }
  }, []);

  return (
    <nav>
      {user ? (
        <div className="user-info">
          <PremiumBadge isPremium={user.isPremium} />
          <span>{user.username}</span>
        </div>
      ) : (
        <button onClick={() => setShowAuthModal(true)}>
          Login for Premium
        </button>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(userData) => setUser(userData)}
      />
    </nav>
  );
}
```

### 8.3 Hide Ads for Premium Users

```javascript
function AdsComponent({ isPremium }) {
  if (isPremium) return null; // Don't show ads for premium users

  return (
    <div className="ad-space">
      <GoogleAdSense
        client="ca-pub-xxxxxxxxxxxxxxxx"
        slot="xxxxxxxxxx"
      />
    </div>
  );
}
```

---

## 9. Streamer Referral System

### 9.1 How It Works

1. **Manual Setup (Admin Function)**
   ```bash
   # You create streamer account with admin panel or API
   POST /api/streamers/admin/create-streamer
   Body: {
     userId: "uuid",
     twitchUsername: "streamer_name",
     commissionRate: 0.20
   }

   Response: {
     streamer: { ... },
     referralLink: "https://gamebuddies.io/?ref=streamer_name"
   }
   ```

2. **Streamer Shares Link**
   - Streamer shares: `gamebuddies.io/?ref=streamer_name`
   - Or: `gamebuddies.io/?ref=streamer_name` in stream chat

3. **Automatic Tracking**
   ```javascript
   // In Gamebuddies.Io client on page load:

   useEffect(() => {
     const params = new URLSearchParams(window.location.search);
     const ref = params.get('ref');

     if (ref) {
       // Store referral code for 30 days
       localStorage.setItem('referralCode', ref);
       localStorage.setItem('referralTime', Date.now());

       // Clear after 30 days
       setTimeout(() => localStorage.removeItem('referralCode'), 30 * 24 * 60 * 60 * 1000);
     }
   }, []);
   ```

4. **On Registration**
   ```javascript
   // When user registers, check for referral code:

   const referralCode = localStorage.getItem('referralCode');

   POST /api/auth/register
   Body: {
     username,
     email,
     password,
     referralCode  // ← Include this
   }

   // Backend creates streamer_referrals record
   ```

5. **On Premium Purchase**
   ```javascript
   // Stripe webhook handler creates commission:

   async function handleCheckoutCompleted(session) {
     const userId = session.metadata.userId;

     // Find referral
     const referral = await db.streamer_referrals
       .select('*, streamer:streamers(*)')
       .eq('referred_user_id', userId)
       .single();

     if (referral) {
       // Calculate commission (20% default)
       const commission = Math.floor(amountCents * 0.20);

       // Create commission record (pending)
       await db.streamer_commissions.insert({
         streamer_id: referral.streamer_id,
         referral_id: referral.id,
         amount_cents: commission,
         payment_status: 'pending'
       });
     }
   }
   ```

### 9.2 Streamer Dashboard

Streamers can view their stats at `/streamer-dashboard`:

**GET /api/streamers/dashboard**

```json
{
  "streamer": {
    "id": "uuid",
    "referral_code": "streamer_name",
    "twitch_username": "streamer_name",
    "commission_rate": 0.20
  },
  "stats": {
    "referralLink": "https://gamebuddies.io/?ref=streamer_name",
    "totalReferrals": 45,
    "conversions": 12,
    "conversionRate": "26.7%",
    "totalEarned": "€150.00",
    "totalPaid": "€100.00",
    "pending": "€50.00"
  }
}
```

### 9.3 Manual Payout Processing

**You handle payouts manually via admin panel:**

```sql
-- Find pending commissions
SELECT * FROM streamer_commissions
WHERE payment_status = 'pending'
AND streamer_id = 'streamer-uuid'
ORDER BY earned_at DESC;

-- Update after paying via Stripe
UPDATE streamer_commissions
SET payment_status = 'paid',
    paid_at = NOW(),
    stripe_payout_id = 'payout_123'
WHERE id = 'commission-uuid';
```

---

## 10. Implementation Timeline

### Week 1: Database & Setup
- [ ] Create Supabase migration (tables + indexes)
- [ ] Run migration on database
- [ ] Set up Stripe account
- [ ] Create Stripe products (monthly, annual, lifetime)
- [ ] Get Stripe API keys and webhook secret
- [ ] Add environment variables to `.env` and Render

### Week 2: Backend Implementation
- [ ] Install Stripe SDK: `npm install stripe`
- [ ] Create `server/services/stripeService.js`
- [ ] Create `server/services/subscriptionService.js`
- [ ] Create `server/routes/payments.js` with webhook
- [ ] Create `server/routes/subscriptions.js`
- [ ] Create `server/routes/streamers.js`
- [ ] Modify `server/routes/auth.js` to include premium status
- [ ] Create `server/middlewares/premiumCheck.js`
- [ ] Test webhook locally with `stripe listen`

### Week 3: Frontend Implementation
- [ ] Create `/pricing` page with pricing cards
- [ ] Create `/account` page with subscription management
- [ ] Create `AuthModal` component
- [ ] Create `PremiumBadge` component
- [ ] Create `useSubscription` hook for easy access to premium status
- [ ] Style components with CSS
- [ ] Test Stripe checkout with test cards

### Week 4: Game Integration
- [ ] Add login button to each game's navbar
- [ ] Import and use `AuthModal` component
- [ ] Add token check on game load
- [ ] Conditionally disable ads based on `isPremium`
- [ ] Add `PremiumBadge` next to username
- [ ] Test in all games: SUSD, DDF, SchoolQuiz, ClueScale, BingoBuddies

### Week 5: Streamer Program & Polish
- [ ] Create streamer accounts manually (admin function)
- [ ] Test referral link generation
- [ ] Verify referral tracking works
- [ ] Test commission calculation
- [ ] Create streamer dashboard page
- [ ] Load test subscription system
- [ ] Document API endpoints
- [ ] Deploy to production

---

## 11. Testing & Deployment

### 11.1 Stripe Test Mode

**Test Card Numbers:**
```
Valid: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 0003
```

**Test Expires:** Any future date
**Test CVC:** Any 3 digits

### 11.2 Local Testing with Stripe CLI

```bash
# Install Stripe CLI from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Listen for webhook events
stripe listen --forward-to localhost:3033/api/stripe/webhook

# You'll get webhook signing secret - add to .env
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
```

### 11.3 Testing Checklist

#### Authentication & Premium Status
- [ ] Guest user can play without login
- [ ] User can register and login
- [ ] JWT token stored in localStorage
- [ ] Token persists across page reloads
- [ ] Premium status passed in JWT
- [ ] User can logout

#### Stripe Checkout
- [ ] Pricing page displays all 3 tiers
- [ ] "Subscribe" button redirects to Stripe Checkout
- [ ] Test card 4242... completes payment successfully
- [ ] Declined card 4000... shows error properly

#### Webhook Processing
- [ ] Payment completed → subscription_status = 'active'
- [ ] User premium status updates immediately
- [ ] Recurring subscription auto-renews
- [ ] Cancellation updates subscription_status = 'canceled'

#### Game Integration
- [ ] Free user sees ads
- [ ] Premium user doesn't see ads
- [ ] Premium badge shows for premium users
- [ ] Ad-free experience works in all games
- [ ] Premium features accessible across all games

#### Streamer Referral
- [ ] Referral link with ?ref=streamer_name stores in localStorage
- [ ] User registration captures referral code
- [ ] Premium conversion creates commission
- [ ] Streamer dashboard shows accurate stats
- [ ] Commission calculation correct (20% of amount)

#### Error Handling
- [ ] Network errors don't crash app
- [ ] Invalid tokens are handled gracefully
- [ ] Webhook processing handles duplicates
- [ ] Payment failures are logged and reported

### 11.4 Deployment to Render.com

**1. Add Environment Variables to Render Dashboard**

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_PRICE_LIFETIME=price_...

JWT_SECRET=your_secret_key_here
```

**2. Configure Stripe Webhook**

```
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: https://gamebuddies.io/api/stripe/webhook
3. Select events:
   - checkout.session.completed
   - invoice.payment_succeeded
   - invoice.payment_failed
   - customer.subscription.updated
   - customer.subscription.deleted
4. Copy webhook signing secret
5. Add STRIPE_WEBHOOK_SECRET to Render env vars
```

**3. Run Database Migration**

```bash
# Via Supabase dashboard or CLI
psql postgresql://user:password@host/db < migrations/001_stripe_schema.sql
```

**4. Deploy**

```bash
git add .
git commit -m "Add Stripe subscription system"
git push origin main

# Render auto-deploys on push
# Monitor at https://dashboard.render.com/
```

---

## Summary

This guide provides a complete, production-ready implementation of Stripe subscriptions with:

✅ **Zero friction for free users** - play without login
✅ **One-click premium upgrade** - subscribe anywhere, premium everywhere
✅ **Simple architecture** - shared JWT tokens across games
✅ **Streamer monetization** - manual referral program with automatic commission tracking
✅ **Flexible pricing** - €4.99/month, €39.99/year, €19.99 lifetime
✅ **Competitive positioning** - aligned with Apple Arcade and industry standards

**Ready to implement?** Start with Week 1: Database & Setup, then follow the timeline.

Questions? Refer back to specific sections or reach out to Stripe support for API questions.
