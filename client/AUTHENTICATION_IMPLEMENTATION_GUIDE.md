# Authentication Implementation Guide for GameBuddies Platform

**Document Version:** 1.0
**Last Updated:** November 7, 2025
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview & Strategy](#1-overview--strategy)
2. [Authentication Services Comparison](#2-authentication-services-comparison)
3. [OAuth Providers & APIs](#3-oauth-providers--apis)
4. [Recommended Solution: Supabase Auth](#4-recommended-solution-supabase-auth)
5. [Implementation Guide](#5-implementation-guide)
6. [User Flows](#6-user-flows)
7. [Data Storage Architecture](#7-data-storage-architecture)
8. [OAuth Setup Guides](#8-oauth-setup-guides)
9. [Game Integration](#9-game-integration)
10. [Mobile Considerations](#10-mobile-considerations)
11. [Security Best Practices](#11-security-best-practices)
12. [Code Examples](#12-code-examples)
13. [Testing Checklist](#13-testing-checklist)
14. [Pricing & Scaling](#14-pricing--scaling)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Overview & Strategy

### Problem We're Solving

**Challenge:** How to register users, manage sessions, and authenticate them across 5 different games (SUSD, SchoolQuizGame, DDF, ClueScale, BingoBuddies) with:
- Zero friction for guests (play instantly)
- Easy upgrade to premium (one-click)
- No password hassle (social login)
- Single login for all games
- Automatic premium status sync

### Traditional Approach (DON'T DO THIS)

❌ Build custom authentication system
❌ Manually manage JWT tokens
❌ Implement OAuth for each provider separately
❌ Handle user data storage yourself
❌ Manage session persistence across games
❌ 3-4 weeks of development time
❌ High security risk

### Modern Approach (RECOMMENDED)

✅ Use Supabase Auth (handles everything)
✅ Enable social providers (1-click setup)
✅ Automatic user storage
✅ Built-in JWT + session management
✅ Cross-game authentication automatic
✅ 2-3 hours of setup time
✅ Enterprise-grade security built-in

---

## 2. Authentication Services Comparison

### Overview of Authentication Platforms

| Service | Free Tier | Setup Time | Social Providers | Best For | Cost Scaling |
|---------|-----------|------------|------------------|----------|--------------|
| **Supabase Auth** | 10k users/mo | 15 min | 20+ providers | **GameBuddies** | $25/mo @ scale |
| **Firebase Auth** | 50k users | 30 min | 6-7 providers | Google-integrated | $0.06 per auth |
| **Auth0** | 7k users/mo | 2 hours | 30+ providers | Enterprise | $25-$800/mo |
| **Clerk** | 10k users/mo | 1 hour | 10+ providers | Modern UX | $25+/mo |
| **AWS Cognito** | 50k users | 3 hours | AWS services | AWS ecosystem | Variable |
| **Okta** | Limited | 4 hours | Extensive | Enterprise SSO | $2-$30/user |
| **Custom OAuth** | N/A | 4+ weeks | Manual setup | Not recommended | High maint. |

### Detailed Comparison

#### **Supabase Auth** ⭐ RECOMMENDED

**What it does:**
- Full authentication backend
- Handles user registration, login, session management
- OAuth integration with 20+ providers
- Magic links (passwordless)
- Anonymous/guest authentication
- Automatic JWT token generation
- User data stored in PostgreSQL

**Pros:**
- ✅ Easiest setup (15 minutes to working auth)
- ✅ Already using Supabase for database
- ✅ Built-in OAuth for Google, Discord, Apple, Twitch, etc.
- ✅ Generous free tier (10,000 users/month)
- ✅ Automatic user table (`auth.users`)
- ✅ Magic links (no passwords!)
- ✅ Anonymous authentication (guest play)
- ✅ Session persistence automatic
- ✅ Open source, backed by large company
- ✅ Excellent React documentation

**Cons:**
- ⚠️ Less mature than Firebase (but rapidly improving)
- ⚠️ Limited to 10k users on free tier
- ⚠️ Fewer customization options than Auth0

**Best For:** GameBuddies (you're already on Supabase!)

**Cost:** Free tier (10k users), then $25/mo Pro

---

#### **Firebase Authentication**

**What it does:**
- Google's authentication service
- Built-in to Firebase ecosystem
- Real-time database integration
- Basic OAuth support

**Pros:**
- ✅ Mature, battle-tested
- ✅ 50k users free tier
- ✅ Google-backed reliability
- ✅ Fast integration with Firebase apps
- ✅ Easy phone number auth

**Cons:**
- ❌ Fewer OAuth providers than Supabase
- ❌ Vendor lock-in to Google ecosystem
- ❌ More complex pricing model
- ❌ Less suitable for PostgreSQL databases

**Best For:** If you were using Firebase database

**Cost:** Free tier (50k users), $0.06 per additional auth

---

#### **Auth0**

**What it does:**
- Enterprise-grade authentication
- 30+ OAuth providers
- Advanced user management
- Single Sign-On (SSO)
- Advanced security features

**Pros:**
- ✅ Massive provider support
- ✅ Enterprise features
- ✅ Advanced analytics
- ✅ Custom domain support

**Cons:**
- ❌ Expensive ($25-$800/month)
- ❌ Complex setup (2-3 hours)
- ❌ Overkill for indie games
- ❌ Learning curve steep

**Best For:** Large enterprises

**Cost:** $25-$800/month (minimum $25)

---

#### **Clerk**

**What it does:**
- Modern authentication with beautiful UI
- Pre-built sign-in components
- Social login, magic links, MFA
- Session management

**Pros:**
- ✅ Most beautiful default UI
- ✅ Fastest implementation (1 hour)
- ✅ Great documentation
- ✅ Modern, actively developed

**Cons:**
- ❌ $25/month minimum (no free tier beyond 10k)
- ❌ Less customizable than Auth0
- ❌ Newer platform (less battle-tested)

**Best For:** Startups wanting beautiful auth UI

**Cost:** $25-$99/month (10k users minimum cost)

---

### Recommendation for GameBuddies

**🏆 USE: Supabase Auth**

**Reasons:**
1. You're already using Supabase for your database
2. Saves 2 weeks of development time
3. No additional vendors to manage
4. Free tier covers your growth for months
5. All code examples available for React
6. OAuth for all providers (Google, Discord, Apple) built-in
7. No cost until 10,000+ monthly active users

---

## 3. OAuth Providers & APIs

### What is OAuth?

**Simple Definition:** A way for users to login using their existing accounts (Google, Discord, etc.) without sharing passwords with your app.

**User Experience:**
```
1. User clicks "Login with Discord"
2. Redirected to Discord login page
3. User approves access
4. Redirected back to your game
5. Your app now has user info
```

**No password = more security + better user experience**

---

### Social Login Providers Ranked for Gaming

#### 1. **Discord** (HIGHEST PRIORITY)

**Why it's best for gaming:**
- 150M+ monthly active users (all gamers/communities)
- Social gaming culture (friends, servers, streaming)
- Streaming integration (Twitch streamers use Discord)
- No startup cost, free for everyone

**What you get:**
- User's Discord username
- Avatar
- Email (optional, with permission)
- Server/role information

**Gaming Relevance:** ⭐⭐⭐⭐⭐ (5/5)

**Setup time:** 45 minutes

**API:** OAuth 2.0
- **Official docs:** https://discord.com/developers/docs/topics/oauth2
- **Setup location:** Discord Developer Portal
- **Free to use:** Yes

**How it works:**
```
1. User clicks "Login with Discord"
2. Redirected to: https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&...
3. User approves
4. Discord redirects back with authorization code
5. Your backend exchanges code for access token
6. Access token gets user info
7. Create/update user in your database
8. Issue JWT token to frontend
```

---

#### 2. **Google Sign-In** (SECOND PRIORITY)

**Why it's important:**
- 2B+ users worldwide
- Universal trust (everyone has Google account)
- Easy to set up
- Works globally

**What you get:**
- Google email
- Full name
- Profile picture
- Email verification status

**Gaming Relevance:** ⭐⭐⭐⭐ (4/5)

**Setup time:** 1 hour

**API:** OAuth 2.0
- **Official docs:** https://developers.google.com/identity/protocols/oauth2
- **Setup location:** Google Cloud Console
- **Free to use:** Yes

**How it works:**
```
1. User clicks "Login with Google"
2. Redirected to: https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_ID&...
3. User approves
4. Google redirects back with authorization code
5. Your backend exchanges code for access token
6. Access token gets user info
7. Create/update user in your database
8. Issue JWT token to frontend
```

---

#### 3. **Apple Sign-In** (THIRD PRIORITY - IF iOS)

**Why it matters:**
- MANDATORY if you have iOS app
- 1B+ iOS users
- Privacy-focused (Apple's requirement)
- Required by Apple App Store guidelines

**What you get:**
- User's ID (email is private by default)
- Name (optional)
- Email relay (privacy@appleid.com)

**Gaming Relevance:** ⭐⭐⭐⭐ (4/5, but only for iOS)

**Setup time:** 2-3 hours (complex!)

**API:** Sign in with Apple (proprietary but OAuth-compatible)
- **Official docs:** https://developer.apple.com/sign-in-with-apple/
- **Setup location:** Apple Developer Portal
- **Free to use:** Yes
- **Requirement:** Domain verification, HTTPS certificate

**Why it's complex:**
- Domain verification required
- Email relay service needed (Apple hides user emails)
- Only available on iOS/macOS
- JWT token validation (not standard OAuth)

---

#### 4. **Twitch** (OPTIONAL - GAMING FOCUSED)

**Why it's good:**
- 140M+ gamers
- Streamer integration
- Streaming platform focus
- Relevant to gaming audience

**What you get:**
- Twitch username
- Email
- Display name
- Profile picture

**Gaming Relevance:** ⭐⭐⭐⭐ (4/5, but niche)

**Setup time:** 1.5 hours

**API:** OAuth 2.0
- **Official docs:** https://dev.twitch.tv/docs/authentication
- **Setup location:** Twitch Developer Console
- **Free to use:** Yes

---

#### 5. **GitHub** (LOW PRIORITY - DEVELOPERS ONLY)

**Why it exists:**
- 100M+ developers
- Developer community focus
- Technical audience

**Gaming Relevance:** ⭐⭐ (2/5, unless technical game)

**Setup time:** 1 hour

**API:** OAuth 2.0
- **Official docs:** https://docs.github.com/en/developers/apps/building-oauth-apps
- **Free to use:** Yes

---

#### Other Providers (Not Recommended for GameBuddies)

| Provider | Users | Gaming Relevance | Why Not |
|----------|-------|------------------|---------|
| Facebook | 3B+ | Low (⭐⭐) | Declining with younger users |
| Twitter/X | 550M | Very Low (⭐) | Not gaming-focused |
| LinkedIn | 900M | None (❌) | Professional only |
| Microsoft | Enterprise | Low (⭐⭐) | Enterprise/Xbox only |
| Spotify | 500M | Low (⭐) | Music platform, not gaming |

---

## 4. Recommended Solution: Supabase Auth

### Why Supabase Auth is Perfect for GameBuddies

```
┌─────────────────────────────────────────────────┐
│   Supabase Auth (Handles Everything Below)      │
├─────────────────────────────────────────────────┤
│  ├─ OAuth Providers (20+ including Discord)     │
│  ├─ Email/Password Registration                │
│  ├─ Magic Links (passwordless)                 │
│  ├─ Anonymous/Guest Authentication             │
│  ├─ JWT Token Generation & Refresh             │
│  ├─ Session Management                         │
│  ├─ User Data Storage (PostgreSQL)             │
│  ├─ Email Verification                         │
│  ├─ Password Reset                             │
│  ├─ MFA/2FA Support                            │
│  └─ Rate Limiting & Security                   │
└─────────────────────────────────────────────────┘
```

### Key Advantages

**1. It's Already in Your Stack**
```
Your current setup:
- Supabase database (PostgreSQL)
- Supabase realtime
- Supabase storage

Add:
- Supabase Auth (same dashboard, same project)
```

**2. Zero User Data Management**
```
Without Supabase Auth:
- Create `users` table
- Implement password hashing
- Handle session management
- Manual JWT token creation
- Handle token refresh
→ 1-2 weeks of work

With Supabase Auth:
- Automatic `auth.users` table created
- Password hashing built-in
- Sessions auto-managed
- JWT tokens auto-generated
- Automatic refresh
→ 2 hours of work
```

**3. Built-in OAuth for All Major Providers**

In Supabase dashboard, you just:
1. Click "Discord" provider
2. Paste Discord Client ID & Secret
3. Done ✓

No need to:
- Implement OAuth flow manually
- Handle authorization codes
- Exchange codes for tokens
- Store access tokens
- Call provider APIs

**4. Magic Links (Passwordless)**

Users love passwordless login:
```
User enters email → Supabase sends magic link → User clicks link → Logged in

No password to remember, no password reset hassles
```

**5. Guest/Anonymous Authentication**

```javascript
// Let users play instantly
await supabase.auth.signInAnonymously()
```

Users can play immediately, upgrade later.

**6. Automatic User Data Storage**

```sql
-- Supabase creates this automatically
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  email_confirmed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  raw_user_meta_data JSONB,  -- Store premium status here!
  ...
)
```

**7. Free Tier Covers You**

- 10,000 monthly active users
- No credit card needed
- Only pay when you exceed limit
- Perfect for bootstrap phase

---

## 5. Implementation Guide

### Complete Setup (3 Hours Total)

#### **Phase 1: Supabase Setup (15 minutes)**

**Step 1: Create Supabase Project** (Already done if using DB)

```
1. Go to https://supabase.com
2. Sign in or create account
3. Create new project
4. Save project URL and anon key
```

**Step 2: Enable Authentication**

```
1. Go to Supabase Dashboard
2. Click "Authentication" in left menu
3. No setup needed - it's already enabled!
```

**Step 3: Enable Anonymous Logins** (for guest play)

```
1. Authentication → Providers
2. Scroll to "Anonymous"
3. Toggle ON
4. Save
```

---

#### **Phase 2: Frontend Setup (30 minutes)**

**Step 1: Install Dependencies**

```bash
npm install @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

**Step 2: Create Supabase Client**

File: `src/supabaseClient.js`

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 3: Add to .env**

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Create Auth Component**

File: `src/components/AuthComponent.js`

```javascript
import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabaseClient'

export default function AuthComponent() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div>Loading...</div>

  if (!session) {
    return (
      <div className="auth-container">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['discord', 'google']}  // Add social providers here
          redirectTo="http://localhost:3000/auth/callback"
        />
      </div>
    )
  }

  return (
    <div className="logged-in">
      <p>Welcome, {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
    </div>
  )
}
```

---

#### **Phase 3: Enable Social Login (2 hours)**

**Discord OAuth Setup (45 minutes)**

```
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "GameBuddies"
4. Go to "OAuth2" → "General"
5. Copy "CLIENT ID"
6. Under "CLIENT SECRETS", click "Reset Secret"
7. Copy the secret
8. Go back to Supabase Dashboard
9. Authentication → Providers → Discord
10. Paste Client ID & Secret
11. Copy Supabase redirect URL from dashboard
12. Paste into Discord's "Redirects" field
13. Save in Supabase
14. Test login ✓
```

**Google OAuth Setup (1 hour)**

```
1. Go to https://console.cloud.google.com
2. Create new project (or use existing)
3. Enable "Google+ API"
4. Go to "OAuth consent screen"
5. Configure app name and permissions
6. Go to "Credentials"
7. Create "OAuth 2.0 Client ID" (Web application)
8. Add authorized redirect URIs:
   - https://your-project.supabase.co/auth/v1/callback
   - http://localhost:3000/auth/callback (for testing)
9. Copy Client ID & Secret
10. Go to Supabase Dashboard
11. Authentication → Providers → Google
12. Paste credentials
13. Save
14. Test login ✓
```

**Apple Sign-In (2-3 hours, ONLY if iOS)**

```
Only needed if building iOS app. Skip for web-only.

1. Go to https://developer.apple.com
2. Go to "Certificates, Identifiers & Profiles"
3. Create App ID with "Sign in with Apple" capability
4. Create Service ID
5. Register domains
6. Configure private email relay service
7. Get signing credentials
8. Go to Supabase Dashboard
9. Authentication → Providers → Apple
10. Paste all credentials carefully
11. Test (complex - follow Supabase docs)
```

---

## 6. User Flows

### Flow A: Guest Play (Instant)

```
User visits game
    ↓
"Play as Guest" button
    ↓
signInAnonymously()
    ↓
Anonymous session created
    ↓
User can play immediately
    ↓
Stats saved to database with anonymous user ID
```

**Code:**
```javascript
const signInAsGuest = async () => {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) console.error('Guest login failed:', error)
  else console.log('Playing as guest:', data.user.id)
}
```

### Flow B: Email Registration (Magic Link)

```
User enters email
    ↓
supabase.auth.signInWithOtp({ email })
    ↓
Supabase sends magic link email
    ↓
User clicks link in email
    ↓
Automatically logged in
    ↓
User profile created
```

**Code:**
```javascript
const signUpWithEmail = async (email) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'https://gamebuddies.io/auth/callback',
    },
  })
  if (error) console.error('Error:', error)
  else alert('Check your email for login link')
}
```

### Flow C: Social Login (Discord)

```
User clicks "Login with Discord"
    ↓
Redirected to Discord login page
    ↓
User approves GameBuddies access
    ↓
Redirected back to gamebuddies.io
    ↓
supabase.auth handles token exchange automatically
    ↓
User profile created with Discord data
    ↓
User logged in
```

**Code:**
```javascript
const signInWithDiscord = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: 'https://gamebuddies.io/auth/callback',
    },
  })
  if (error) console.error('Error:', error)
}
```

### Flow D: Guest → Premium Upgrade

```
Guest plays games, earns achievements
    ↓
After first game / achievement:
"Upgrade to Premium" prompt
    ↓
User clicks → Redirected to login/registration
    ↓
User registers (email or social login)
    ↓
Link anonymous account to registered account
    ↓
Achievements/stats transferred
    ↓
Subscribe to premium (Stripe checkout)
    ↓
Premium status added to user metadata
    ↓
Premium features activated immediately
```

**Code:**
```javascript
// After user signs in, link anonymous account
const linkAnonymousToRegistered = async () => {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'email' // or 'discord', 'google'
  })
}

// Store premium status in user metadata
const setPremiumStatus = async (userId, isPremium) => {
  const { data, error } = await supabase.auth.updateUser({
    data: { isPremium: isPremium }
  })
}
```

### Flow E: Cross-Game Authentication

```
User logs in at gamebuddies.io
    ↓
JWT token stored in localStorage
    ↓
User launches SUSD game
    ↓
SUSD game checks localStorage for JWT
    ↓
Token found and valid
    ↓
Automatically logged in (no re-login needed!)
    ↓
Premium status from token checked
    ↓
Premium features activated
```

**Code in each game:**
```javascript
// On game load
useEffect(() => {
  const session = supabase.auth.getSession()

  if (session) {
    // Already logged in
    const isPremium = session.user.user_metadata?.isPremium
    if (isPremium) {
      disableAds()
    }
  }
}, [])
```

---

## 7. Data Storage Architecture

### User Data Location

#### **Supabase Auth Users Table** (`auth.users`)

```sql
-- Created automatically, don't modify directly
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,  -- Only if using email/password
  email_confirmed_at TIMESTAMP,
  phone TEXT,
  phone_confirmed_at TIMESTAMP,
  user_metadata JSONB,         -- ← STORE CUSTOM DATA HERE
  app_metadata JSONB,
  aud VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_sign_in_at TIMESTAMP
)
```

**What goes here:**
- Email
- Password (hashed automatically)
- Social provider info (Discord ID, Google ID, Apple ID)
- Custom metadata (premium status, etc.)

#### **Your Application Tables**

```sql
-- Tables you create to extend auth.users

-- Link subscriptions to users
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  plan_type TEXT,  -- 'monthly', 'annual', 'lifetime'
  status TEXT,     -- 'active', 'expired', 'canceled'
  created_at TIMESTAMP
)

-- Link streamers to users
CREATE TABLE streamers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE,
  commission_rate DECIMAL,
  created_at TIMESTAMP
)

-- Link any custom data to auth users
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP
)
```

### Flow: Registering New User

```
1. User clicks "Sign up with Discord"
2. Supabase creates entry in auth.users table
   - user_id (UUID)
   - email
   - user_metadata { discord_id, discord_name }
   - created_at

3. Your app creates corresponding rows in:
   - user_profiles (display_name, avatar, etc.)
   - user_subscriptions (initially free/no subscription)

4. When user subscribes:
   - Update user_subscriptions → status = 'active'
   - Update auth.users user_metadata → isPremium = true

5. Token includes: { userId, email, isPremium }
```

### Querying User Data

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Get user from JWT
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

// Update user metadata
await supabase.auth.updateUser({
  data: {
    isPremium: true,
    premiumTier: 'monthly'
  }
})

// Get custom user data
const { data } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .single()
```

---

## 8. OAuth Setup Guides

### 8.1 Discord OAuth Setup (Detailed)

#### Step 1: Create Discord Application

```
1. Visit https://discord.com/developers/applications
2. Click "New Application"
3. Name: "GameBuddies"
4. Accept Developer Agreement
5. Click "Create"
```

#### Step 2: Get Credentials

```
1. You're now in Application Overview
2. Find "CLIENT ID" (looks like: 123456789012345678)
   → Copy this
3. Find "TOKEN" section
4. Click "Reset Secret"
5. Copy the SECRET that appears
```

#### Step 3: Configure Redirect URLs

```
1. Go to "OAuth2" in left menu
2. Click "Add Redirect"
3. Add these URLs:
   - For testing: http://localhost:3000/auth/callback
   - For production: https://gamebuddies.io/auth/callback
4. Save
```

#### Step 4: Add to Supabase

```
1. Go to Supabase Dashboard
2. Authentication → Providers
3. Find "Discord"
4. Enable it
5. Paste:
   - CLIENT ID: [from Discord]
   - CLIENT SECRET: [from Discord]
6. Verify Supabase redirect URL matches Discord settings
7. Save
```

#### Step 5: Test

```javascript
const loginWithDiscord = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback'
    }
  })
}
```

---

### 8.2 Google OAuth Setup (Detailed)

#### Step 1: Create Google Cloud Project

```
1. Visit https://console.cloud.google.com
2. Select/Create Project
3. Name: "GameBuddies"
4. Create
```

#### Step 2: Enable Google+ API

```
1. Search "Google+ API" in search bar
2. Click on result
3. Click "Enable"
```

#### Step 3: Configure OAuth Consent Screen

```
1. Left menu → "Credentials"
2. Click "OAuth consent screen"
3. Select "External" → Create
4. Fill app info:
   - App name: "GameBuddies"
   - User support email: your@email.com
   - Continue
5. Add scopes: email, profile
6. Add test users (your email)
7. Save and Continue
```

#### Step 4: Create OAuth Credentials

```
1. Left menu → "Credentials"
2. Create Credentials → OAuth 2.0 Client ID
3. Application type: "Web application"
4. Name: "GameBuddies Web"
5. Add Authorized JavaScript origins:
   - http://localhost:3000
   - https://gamebuddies.io
6. Add Authorized redirect URIs:
   - http://localhost:3000/auth/callback
   - https://your-project.supabase.co/auth/v1/callback
7. Create
8. Copy: CLIENT ID and CLIENT SECRET
```

#### Step 5: Add to Supabase

```
1. Go to Supabase Dashboard
2. Authentication → Providers
3. Find "Google"
4. Enable
5. Paste:
   - CLIENT ID: [from Google]
   - CLIENT SECRET: [from Google]
6. Save
```

---

### 8.3 Apple Sign-In Setup (ONLY if iOS)

**This is complex. Only do if building iOS app.**

#### Prerequisites

- Apple Developer account ($99/year)
- Domain name (required for Sign in with Apple)
- HTTPS certificate

#### Step 1: Create App ID

```
1. Apple Developer Portal → Certificates, Identifiers & Profiles
2. Identifiers → Select "App IDs"
3. Click "+" to create new
4. Name: "GameBuddies"
5. Explicit ID
6. Register
```

#### Step 2: Enable "Sign in with Apple"

```
1. Select your App ID
2. Capabilities
3. Search "Sign in with Apple"
4. Add Capability
5. Configure
6. Save
```

#### Step 3: Create Service ID

```
1. Identifiers → Select "Services IDs"
2. Click "+" to create new
3. Name: "GameBuddies Web"
4. Identifier: com.gamebuddies.web
5. Enable "Sign in with Apple"
6. Configure
7. Add domain (your domain)
8. Return URL: https://your-project.supabase.co/auth/v1/callback
9. Save
10. Copy Service ID: com.gamebuddies.web
```

#### Step 4: Create Key

```
1. Keys → Click "+" to create new
2. Name: "GameBuddies Web Key"
3. Enable "Sign in with Apple"
4. Configure
5. Select App ID: GameBuddies
6. Continue
7. Download key file (.p8)
8. Save safely (you'll need this)
```

#### Step 5: Add to Supabase

```
1. Go to Supabase Dashboard
2. Authentication → Providers
3. Find "Apple"
4. Enable
5. Paste all the credentials:
   - Team ID: [from Apple]
   - Key ID: [from key file]
   - Service ID: com.gamebuddies.web
   - Private Key: [contents of .p8 file]
6. Save
```

This is complex - follow Supabase Apple docs if stuck.

---

## 9. Game Integration

### Adding Login to Each Game

Each game (SUSD, DDF, SchoolQuizGame, ClueScale, BingoBuddies) needs minimal changes:

#### Step 1: Import Supabase Client

```javascript
// In each game's main component
import { supabase } from '../supabaseClient'
```

#### Step 2: Check Session on Load

```javascript
useEffect(() => {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // User is logged in
    setUser(session.user)

    // Check if premium
    const isPremium = session.user.user_metadata?.isPremium
    setIsPremium(isPremium || false)
  } else {
    // User not logged in (guest)
    setUser(null)
    setIsPremium(false)
  }
}, [])
```

#### Step 3: Add Login Button to Navbar

```javascript
// In game navbar/header
{user ? (
  <div>
    <span>{user.email}</span>
    <button onClick={() => supabase.auth.signOut()}>Logout</button>
  </div>
) : (
  <button onClick={() => setShowAuthModal(true)}>Login</button>
)}
```

#### Step 4: Add Auth Modal

```javascript
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

// Inside your game component
{showAuthModal && (
  <div className="modal">
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }}
      providers={['discord', 'google']}
      redirectTo={window.location.origin}
    />
  </div>
)}
```

#### Step 5: Hide Ads for Premium

```javascript
// In your ads component
{!isPremium ? (
  <AdSpace>
    {/* Ad code */}
  </AdSpace>
) : (
  <div>Premium member - no ads</div>
)}
```

### Testing in All Games

- [ ] SUSD - Login works
- [ ] DDF - Login works
- [ ] SchoolQuizGame - Login works
- [ ] ClueScale - Login works
- [ ] BingoBuddies - Login works
- [ ] Premium status syncs across games
- [ ] Logout works in all games

---

## 10. Mobile Considerations

### Apple App Store Requirements

**If you have iOS app:**

1. **If using social login (Discord, Google), Apple Sign-In is MANDATORY**
   - Exception: If ONLY email/password (no social)
   - Exception: Educational/enterprise apps

2. **Configuration:**
   - Must support Sign in with Apple alongside other providers
   - Cannot hide Apple Sign-In option
   - Privacy policy must explain data collection

3. **Testing:**
   - Test on iPhone/iPad
   - Verify email relay works (Apple hides user emails)
   - Verify domain verification (required)

### Android (Google Play) Requirements

**For Android:**

1. **No mandatory auth method** - more flexible than Apple
2. **Can use Discord, Google, or email**
3. **No special configuration needed**

### Web-only Games (Recommended)

If keeping games web-only:
- No Apple complications
- Works on all devices
- No app store approvals needed
- Easier to update
- Better analytics

---

## 11. Security Best Practices

### 1. JWT Token Storage

**Good:**
```javascript
// Supabase stores in secure httpOnly cookie automatically
// Frontend can access via localStorage if needed
// Both secure
```

**Bad:**
```javascript
// Don't do this
localStorage.setItem('password', password)  // ❌ Never store passwords
```

### 2. Password Handling

**Good:**
```javascript
// Use magic links (passwordless)
await supabase.auth.signInWithOtp({ email })
```

**Bad:**
```javascript
// Never implement custom password hashing
// Use Supabase's built-in (bcrypt)
```

### 3. Rate Limiting

**Automatic in Supabase:**
- Magic links: 1 per 60 seconds
- Sign-ups: Limited per email
- Failed logins: Limited attempts

**Your app:**
```javascript
// Add client-side cooldown
const [cooldown, setCooldown] = useState(0)

const sendMagicLink = async (email) => {
  if (cooldown > 0) return

  await supabase.auth.signInWithOtp({ email })
  setCooldown(60) // 60 second cooldown
  setInterval(() => setCooldown(c => c - 1), 1000)
}
```

### 4. CORS Configuration

**Supabase handles automatically**
- Redirects configured in dashboard
- Credentials included properly
- No manual CORS setup needed

### 5. GDPR Compliance

**User Controls:**
- Users can request their data
- Users can delete account
- Users control what Supabase stores

**Your Code:**
```javascript
// Right to be forgotten
const deleteUser = async () => {
  // Supabase deletes auth.users entry
  // You delete corresponding custom tables
  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('user_id', user.id)
}
```

---

## 12. Code Examples

### Complete Authentication Component

```javascript
// src/components/GameHeader.js
import { useState, useEffect } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../supabaseClient'

export default function GameHeader() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUser(session.user)
        setIsPremium(session.user.user_metadata?.isPremium || false)
      }

      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null)
        setIsPremium(session?.user?.user_metadata?.isPremium || false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsPremium(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <header className="game-header">
      <h1>GameBuddies</h1>

      <div className="header-right">
        {user ? (
          <div className="user-section">
            <span className="email">{user.email}</span>
            {isPremium && <span className="badge">⭐ Premium</span>}
            <button onClick={handleSignOut}>Sign Out</button>
          </div>
        ) : (
          <div className="auth-section">
            <button
              className="login-btn"
              onClick={() => setShowAuth(!showAuth)}
            >
              Login for Premium
            </button>

            {showAuth && (
              <div className="auth-modal">
                <Auth
                  supabaseClient={supabase}
                  appearance={{ theme: ThemeSupa }}
                  providers={['discord', 'google']}
                  redirectTo={window.location.origin}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
```

### Guest Play Component

```javascript
// src/components/GuestPlayButton.js
import { supabase } from '../supabaseClient'

export default function GuestPlayButton() {
  const playAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously()

    if (error) {
      console.error('Guest login failed:', error.message)
      return
    }

    console.log('Guest session created:', data.session.user.id)
    window.location.href = '/games'
  }

  return (
    <button onClick={playAsGuest} className="btn btn-primary">
      Play as Guest
    </button>
  )
}
```

### Magic Link Component

```javascript
// src/components/MagicLinkAuth.js
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function MagicLinkAuth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email for the login link!')
        setEmail('')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleMagicLink}>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
      {message && <p>{message}</p>}
    </form>
  )
}
```

---

## 13. Testing Checklist

### Anonymous Authentication
- [ ] Guest can play without signup
- [ ] Session persists across page reload
- [ ] Stats saved to database with guest user ID
- [ ] Can upgrade from guest to registered

### Email Authentication
- [ ] Can enter email and send magic link
- [ ] Email received within 5 minutes
- [ ] Magic link opens and logs in user
- [ ] Logged-in status persists

### Social Login
- [ ] Discord login button works
- [ ] Clicking button redirects to Discord
- [ ] Can approve access
- [ ] Redirected back to game
- [ ] User logged in with Discord email
- [ ] User info (avatar, username) captured

### Google Login
- [ ] Google login button works
- [ ] Redirects to Google login
- [ ] Can approve access
- [ ] Redirected back to game
- [ ] User logged in with Google email

### Cross-Game Authentication
- [ ] Login at gamebuddies.io
- [ ] Launch SUSD game
- [ ] Already logged in (no re-login)
- [ ] Launch DDF game
- [ ] Already logged in
- [ ] Logout from one game
- [ ] Logged out from all games

### Premium Status
- [ ] Subscribe to premium
- [ ] Premium status in user metadata
- [ ] Premium persists across games
- [ ] Ads hidden for premium user
- [ ] Premium badge shows

### Guest to Premium
- [ ] Guest plays game
- [ ] "Upgrade to Premium" prompt shows
- [ ] Guest can register via email
- [ ] Guest can register via social
- [ ] Previous stats preserved
- [ ] Converted to premium account

### Session Management
- [ ] Session persists after page reload
- [ ] Token refreshes automatically
- [ ] Logout removes session
- [ ] Can't access protected routes without auth

---

## 14. Pricing & Scaling

### Supabase Pricing

| Tier | Price | Auth Users | Best For |
|------|-------|-----------|----------|
| **Free** | $0/month | 10,000/mo | Development, launch |
| **Pro** | $25/month | 100,000/mo included | Growth phase |
| **Team** | $599/month | 500,000+/mo | Scale |
| **Enterprise** | Custom | Unlimited | Large platforms |

### Cost Breakdown at Different Scales

**At 500 DAU (Daily Active Users):**
- Monthly Active Users: ~15,000
- Free tier: $0
- Marginal cost per user: $0

**At 2,000 DAU:**
- Monthly Active Users: ~60,000
- Free tier: $0
- Marginal cost per user: $0

**At 5,000 DAU:**
- Monthly Active Users: ~150,000
- Free tier: NO (exceeds 100k)
- Upgrade to Pro: $25/month
- Marginal cost per user: $0.00017/user/month

**At 10,000+ DAU:**
- Monthly Active Users: 300,000+
- Cost: $25/month base + $0.025 per additional MAU
- Example @ 300k MAU: $25 + (200k × $0.025) = $5,025/month

### When to Upgrade

```
Users 0-100k/mo → Free tier
Users 100k-500k/mo → Pro ($25/mo)
Users 500k-2M/mo → Team ($599/mo)
Users 2M+/mo → Enterprise (custom)
```

---

## 15. Troubleshooting

### OAuth Redirects Not Working

**Problem:** Click "Login with Discord" → Blank page or error

**Solution:**
```
1. Check Supabase redirect URL is added to Discord
2. Check Discord redirect URL is in Supabase
3. Verify they match exactly (including http vs https)
4. Check browser console for errors
5. Check Supabase logs (Dashboard → Logs)
```

### Magic Link Email Not Arriving

**Problem:** User enters email → No email received

**Solution:**
```
1. Check spam folder
2. Verify email address is correct
3. Check rate limit (max 1 per 60 seconds)
4. Check Supabase email settings (might be in test mode)
5. Look in Supabase logs for errors
```

### Session Lost on Page Reload

**Problem:** User logged in → Refresh page → Not logged in

**Solution:**
```javascript
// Make sure you're checking localStorage first
const { data: { session } } = await supabase.auth.getSession()

// Refresh token if expired
if (session) {
  const { data } = await supabase.auth.refreshSession()
}
```

### Premium Status Not Syncing

**Problem:** User subscribes → Premium status doesn't appear

**Solution:**
```javascript
// After Stripe payment succeeds:
// 1. Update auth.users metadata
await supabase.auth.updateUser({
  data: { isPremium: true, premiumTier: 'monthly' }
})

// 2. Check in browser console:
const { data: { session } } = await supabase.auth.getSession()
console.log(session.user.user_metadata.isPremium)
```

### Apple Sign-In Domain Verification Fails

**Problem:** Apple login fails on iOS

**Solution:**
```
1. Add domain to Apple Developer Portal
2. Verify domain ownership (DNS record)
3. Set up email relay service
4. Verify certificate is valid
5. Follow Supabase Apple docs exactly
```

### Discord OAuth "Invalid Client"

**Problem:** Discord login error - "Invalid Client"

**Solution:**
```
1. Verify Client ID matches Discord (not Secret)
2. Check Client Secret is correct
3. Verify redirect URL in Discord matches Supabase exactly
4. Check Supabase redirect URLs are set
```

### Too Many Signup Attempts

**Problem:** Rate limiting blocks legitimate signups

**Solution:**
```
Supabase limits:
- 1 magic link per email per 60 seconds
- X failed login attempts per hour

Wait and retry. This is a security feature.
```

---

## Summary

### Quick Start Checklist

- [ ] Supabase project created
- [ ] Supabase Auth enabled
- [ ] Anonymous auth enabled
- [ ] Discord OAuth configured
- [ ] Google OAuth configured
- [ ] Frontend auth component created
- [ ] Auth buttons added to games
- [ ] Premium status integration
- [ ] Session persistence verified
- [ ] Tested in all 5 games

### Key Takeaways

1. **Supabase Auth handles 95% of work for you**
2. **Discord + Google + Email/Magic Links = perfect combo**
3. **Users login ONCE, access EVERYWHERE**
4. **Data stored automatically, no manual setup**
5. **Free tier covers your growth for months**
6. **OAuth setup takes 3-4 hours total**

### Files You'll Create

- `src/supabaseClient.js` - Supabase client
- `src/components/AuthComponent.js` - Auth UI
- `.env` - Supabase credentials
- `src/pages/LoginPage.js` - Login page
- `src/middleware/authCheck.js` - Session check

### Timeline

- Week 1: Supabase setup + Discord/Google OAuth (3-4 hours)
- Week 2: Frontend auth components (2-3 hours)
- Week 3: Game integration (2-3 hours per game)
- Week 4: Testing and deployment

**Total: ~2 weeks for complete authentication system**

---

## Next Steps

1. **Create Supabase account** if not already done
2. **Enable Auth providers** (Discord, Google)
3. **Install auth libraries** (`npm install @supabase/auth-ui-react`)
4. **Build auth component** (copy from examples)
5. **Add to each game** (5 small changes per game)
6. **Test thoroughly** (login flows, cross-game persistence)
7. **Deploy** (to Render or production)

**You'll be done in 2-3 weeks with zero custom auth code.**
