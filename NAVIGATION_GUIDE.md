# Grace Companion - Navigation Guide

## How to Access Login & Authentication Pages

### 🏠 **Home Page** (`/`)

When you're **NOT logged in**, the home page shows:
- **"Sign In" button** → Takes you to `/login`
- **"Create Account" button** → Takes you to `/signup`
- Link to registration process

When you're **logged in**, the home page shows:
- Your personalized greeting
- All app features (Talk to Me, Reminders, Messages, etc.)
- **"Dashboard" button** (if you're a NOK/family member)
- **"Sign Out" button**

### 🔐 **Login Page** (`/login`)

**How to access:**
1. Go to your app's home page
2. Click the **"Sign In"** button
3. Or directly navigate to: `http://your-domain/login`

**What you can do:**
- Sign in with email and password
- Link to create a new account
- Link to start registration

### ✍️ **Sign-Up Page** (`/signup`)

**How to access:**
1. From home page, click **"Create Account"**
2. From login page, click the sign-up link
3. Or directly navigate to: `http://your-domain/signup`

**What you can do:**
- Create a new account
- Choose your role: Elder User or Family Member/Caregiver
- Set up your profile

### 📊 **NOK Dashboard** (`/nok-dashboard`)

**How to access:**
1. Sign in as a NOK (family member/caregiver)
2. From home page, click the **"Dashboard"** button in top-right
3. Or directly navigate to: `http://your-domain/nok-dashboard`

**What you can see:**
- Overview of elder's daily tasks
- Recent conversations
- Task completion history
- Full conversation transcripts
- Activity statistics

### 📱 **Direct URLs**

Once your app is running, you can directly access:

- Home: `http://localhost:3000/` (or your domain)
- Login: `http://localhost:3000/login`
- Sign Up: `http://localhost:3000/signup`
- NOK Dashboard: `http://localhost:3000/nok-dashboard`
- Elder Activity: `http://localhost:3000/activity`
- Documents: `http://localhost:3000/documents`

## 🎯 User Flows

### For New Elder Users:
1. Go to home page
2. Click "Create Account"
3. Fill in details and select "Elder User"
4. Sign in
5. Use app features

### For Family Members (NOK):
1. Go to home page
2. Click "Create Account"
3. Fill in details and select "Family Member/Caregiver"
4. Complete NOK registration to link to an elder
5. Sign in
6. Click "Dashboard" to monitor elder's activity

### For Existing Users:
1. Go to home page
2. Click "Sign In"
3. Enter email and password
4. Access your features or dashboard

## 🔍 Testing the Pages

To verify everything is working:

1. **Start your dev server** (if not already running)
2. **Open browser** to `http://localhost:3000`
3. **You should see**:
   - Welcome message
   - Two large buttons: "Sign In" and "Create Account"
   - Info about Grace Companion
4. **Click "Sign In"** → Should take you to `/login`
5. **Click "Create Account"** → Should take you to `/signup`

All pages are now built and ready to use!
