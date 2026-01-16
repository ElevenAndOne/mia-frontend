import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocsLayout from './docs-layout'
import './docs.css'

const markdownContent = `# Mia Integration Documentation

**Last Updated**: November 17, 2025
**Purpose**: User guide for connecting platforms and using Mia
**Audience**: Marketing teams, agencies, business owners

---

## Welcome to Mia 👋

Mia is your AI-powered marketing analytics assistant. Instead of jumping between Google Ads, Facebook, and Analytics dashboards, just ask Mia questions in plain English and get instant insights across all your platforms.

**What Mia does:**
- Combines data from Google Ads, Meta Ads, Google Analytics 4, Brevo, Facebook Pages, Instagram, and HubSpot
- Answers your marketing questions conversationally
- Provides Quick Insights for growth, optimization, and protection
- Supports multi-client management for agencies

---

## Quick Start Guide

### Step 1: Create Your Account (2 minutes)

1. Visit [miacreate.ai](https://miacreate.ai) and click "Get Started"
2. Choose **"Continue with Google"** OR **"Continue with Meta"**
   - We recommend starting with Google if you use Google Ads
   - Choose Meta if you primarily use Facebook/Instagram ads
3. Complete the OAuth authorization
4. You'll see a list of your accounts - select the one you want to analyze

**What's an "account"?**
When you log in with Google, that's your *Google account* (like gmail). But you might manage multiple *Google Ads accounts* for different businesses. Mia needs to know which business account to analyze.

---

### Step 2: Connect Your Platforms (5 minutes)

After selecting your account, you'll land on the **Integrations** page. Here's where you connect your marketing platforms.

#### **Already Connected:**
- If you logged in with Google: Google Ads is already connected ✓
- If you logged in with Meta: Meta Ads is already connected ✓

#### **Need to Connect:**
You'll see "Connect" buttons for platforms not yet linked. Let's connect them:

---

## Platform Setup Guides

### 🔵 Google Ads + Google Analytics 4 (GA4)

**If you logged in with Google, Google Ads is already connected.** Now let's add GA4:

#### **Connecting GA4:**

1. On the Integrations page, find "Google Analytics 4"
2. Click **"Connect"**
3. Select your GA4 property from the list

**Which GA4 property should I pick?**

If you have multiple properties, here's how to identify the right one:

**Option 1: Check in Google Ads Dashboard**
1. Open [Google Ads](https://ads.google.com)
2. Make sure you've selected the same account you chose in Mia (top right corner)
3. Left sidebar → **Tools** → **Data Manager**
4. Find **Google Analytics (GA4)** in the "Connected products" section
5. Click the 3 dots → **Manage**
6. You'll see which GA4 property is connected to this Google Ads account
7. **Use that same property in Mia**

**Option 2: Check in GA4 Admin**
1. Open [Google Analytics](https://analytics.google.com)
2. Click **Admin** (gear icon, bottom left)
3. Under **Property**, click **Property Settings**
4. Check the **Property URL** - does it match your website?
5. **Use the property that tracks your main marketing website**

**Tip:** If you're still unsure, pick the property with the most data or ask your web developer which GA4 property tracks your site.

**Multiple Properties:**
You can link multiple GA4 properties to one account! After connecting the first one, go back to Integrations → GA4 → Settings (⚙️) → "Add another property". Mia will let you designate one as "primary" for Quick Insights and Chat queries.

---

### 🔵 Meta Ads (Facebook & Instagram)

**If you logged in with Meta, Meta Ads is already connected.** Skip to the next section!

**If you logged in with Google and want to add Meta:**

1. On the Integrations page, find "Meta"
2. Click **"Connect"**
3. You'll be redirected to Facebook to authorize Mia
4. Log in with your Facebook Business account
5. Select which ad accounts to give Mia access to
6. Click **"Continue"**
7. Back in Mia, select which Meta ad account to link to this business

**Why do I need to select an account again?**
Facebook might show you multiple ad accounts (if you manage several businesses). Mia needs to know which one belongs to the business you're analyzing.

---

### 🟢 Brevo (Email Marketing)

Brevo uses API keys instead of OAuth login. Here's how to connect:

1. On the Integrations page, find "Brevo"
2. Click **"Connect"**
3. A modal will pop up with instructions:

**How to get your Brevo API key:**

1. Log in to your [Brevo account](https://app.brevo.com)
2. Click your profile (top right) → **SMTP & API** → **API Keys**
3. Click **"Generate a new API key"**
4. Give it a name (e.g., "Mia Integration")
5. Copy the key (starts with \`xkeysib-...\`)
6. Paste it into the Mia modal
7. Click **"Connect"**

Mia will validate your key automatically. If it's valid, you'll see "Brevo connected successfully!"

**Note:** Keep your API key secure. Don't share it with anyone.

**Multi-Account Note:** Each business account in Mia can have its own Brevo API key. This is perfect for agencies managing multiple clients with separate Brevo accounts.

---

### 🔵 Facebook Pages & Instagram (Organic Social)

Track your organic social posts from Facebook Pages and Instagram Business accounts.

**What you'll see:**
- Facebook Page posts (likes, comments, shares, reach)
- Instagram posts (likes, comments, engagement)
- How well your posts are performing

**How to connect:**

1. First, make sure you've connected **Meta Ads** (see section above)
2. On the Integrations page, look for the **Facebook icon (f)** next to the Meta gear icon
3. Click the Facebook icon
4. Select which Facebook Page you want to track
5. Done! Mia will now show your organic social performance

**What's the difference between Meta Ads and Facebook Pages?**

- **Meta Ads** = Paid advertising (what you spend money on)
- **Facebook Pages** = Organic posts (free content you post)

You can track both at the same time to see your complete Facebook strategy!

**What if I have an Instagram Business account?**

If your Instagram is linked to your Facebook Page, Mia will automatically track both! No extra steps needed.

**Troubleshooting:**
- **"Page not found"**: Make sure you're an Admin of the Facebook Page
- **"Can't connect Instagram"**: Your Instagram must be a Business account (not personal) and linked to your Facebook Page
- **"No posts showing"**: Make sure your page has posts in the last 30 days

---

### 🟢 HubSpot (CRM & Marketing) - Beta

**Status**: Available in beta - limited testing with real accounts

HubSpot integration allows you to track:
- Contacts and their lifecycle stages
- Deals and pipeline performance
- Marketing activities and engagement

**How to connect:**

1. On the Integrations page, find "HubSpot"
2. Click **"Connect"**
3. You'll be redirected to HubSpot to authorize Mia
4. Log in with your HubSpot account
5. Select which portal to give Mia access to
6. Click **"Connect app"**
7. Back in Mia, your HubSpot portal will be linked

**Note**: HubSpot integration is in beta. If you encounter issues, please contact support.

---

## Understanding Your Data

### Accounts vs Platforms: What's the Difference?

This trips up a lot of first-time users, so let's clarify:

| Term | What It Means | Example |
|------|---------------|---------|
| **Account** | Your login (Google or Facebook) | \`you@gmail.com\` |
| **Business Account** | A specific business you manage | "ACME Marketing Agency" |
| **Platform** | A marketing tool you use | Google Ads, Meta Ads, GA4, Brevo |

**Example Flow:**
1. You log in with your Google **account** (\`you@gmail.com\`)
2. Mia shows you 3 **business accounts**: "ACME", "Client A", "Client B"
3. You select "ACME"
4. Now you connect **platforms**: Google Ads, GA4, Meta Ads, Brevo
5. Mia analyzes data from all platforms for "ACME" only

**Multi-client management (for agencies):**
If you manage multiple clients, each client is a separate business account. You can switch between them in Mia and each will have its own platform connections and data.

---

### Why Connect Multiple Platforms?

**You don't have to.** Mia works great with just one platform!

**But here's why connecting multiple platforms is powerful:**

**Single Platform (e.g., just Google Ads):**
- "What's my Google Ads spend this month?" ✓
- "Which campaigns have the best ROI?" ✓
- "What's my average CPC?" ✓

**Multiple Platforms (e.g., Google Ads + Meta Ads + GA4):**
- "Compare my Google and Meta performance" ✓
- "Which platform drives more website traffic?" ✓ (needs GA4)
- "What's my customer journey from ad click to conversion?" ✓ (needs GA4)
- "Which platform has better ROI?" ✓

**Bottom line:** Start with one platform, add more as you need cross-platform insights.

---

### Date Ranges and Data Availability

Mia can analyze data for:
- **Last 7 days**
- **Last 14 days**
- **Last 30 days**
- **Last 90 days**
- **Custom date range** (pick any start and end date)

**Important:** If you select a date range with no data (e.g., your campaigns only started last week but you picked "Last 90 days"), Mia will tell you "No data available for this period."

**Tip:** Start with "Last 30 days" to get a good overview, then adjust as needed.

---

## Using Mia

### Quick Insights (Fast Answers)

Mia has 3 Quick Insight pages that answer specific questions:

#### **1. Grow: "Where can we grow?"**
- Shows your best-performing campaigns and opportunities to scale
- Identifies what's working and where to invest more budget
- Example insights: "Scale up Campaign X - it's driving conversions at 5x ROI"

#### **2. Optimize: "What can we optimize?"**
- Highlights inefficiencies and waste in your campaigns
- Suggests budget reallocations and campaign pauses
- Example insights: "Pause Campaign Y - it's spending $500/day with only 2 conversions"

#### **3. Protect: "What needs protection?"**
- Identifies risks and campaigns that need diversification
- Warns about over-reliance on single campaigns or platforms
- Example insights: "80% of conversions come from one campaign - diversify to reduce risk"

**How to use:**
1. Click one of the 3 buttons on the main page
2. A date picker modal appears - select your date range (Last 7/14/30/90 days or custom)
3. Click "Continue"
4. Wait 20-30 seconds while Mia analyzes your data
5. Read the 3 insights + summary

**Why the date picker first?**
Mia asks for your date range before loading to prevent wasting time analyzing empty periods. If you have no data for the last 30 days, pick a different range!

**Tip:** Run all 3 pages to get a complete picture of your marketing performance.

---

### Chat with Mia (Ask Anything)

This is where Mia really shines. Ask questions in plain English and get instant answers.

#### **Example Questions:**

**Campaign Performance:**
- "What's my total ad spend this month?"
- "Show me my top 3 campaigns"
- "Which campaigns should I pause?"
- "What's my average cost per conversion?"

**Audience Insights:**
- "Who is my audience?"
- "Which age groups convert best?"
- "What devices are my users on?"
- "Where are my customers located?"

**Optimization:**
- "What can I optimize to reduce waste?"
- "How can I reallocate my budget for better efficiency?"
- "Which ad sets are underperforming?"

**Comparisons:**
- "Compare Google and Meta performance"
- "How does this month compare to last month?"
- "Mobile vs desktop performance"

**Keywords (Google Ads only):**
- "What are my best performing keywords?"
- "Which keywords have the highest conversion rate?"

**Can't think of a question?** Just type "help" or "what can you do?" and Mia will suggest questions to ask.

---

## Best Practices

### 1. Start Simple
Don't try to connect all platforms on day one. Start with your primary platform, get comfortable with Mia, then add more.

### 2. Use Consistent Date Ranges
When comparing performance, use the same date range across all pages. This ensures apples-to-apples comparisons.

### 3. Ask Follow-up Questions in Chat
If a Quick Insight mentions a specific campaign, go to Chat and ask "Tell me more about Campaign X" for deeper analysis.

### 4. Check Your Data Regularly
Run Quick Insights weekly to stay on top of opportunities and risks.

### 5. Multi-client Management (Agencies)
Switch between client accounts using the account selector (top of page). Each client's data is completely isolated - no cross-contamination.

---

## Troubleshooting

### "Could not connect to [Platform]"

**What happened:** The OAuth connection failed.

**Try this:**
1. Click "Connect" again - sometimes it's just a temporary glitch
2. Make sure you're logged into the correct account (Google/Facebook)
3. Check that you authorized all required permissions
4. Clear your browser cache and try again
5. If it still fails, contact support (see bottom of this doc)

---

### "Session expired" or "Please log in again"

**What happened:** Your session timed out (sessions last 2 hours).

**Try this:**
1. Click "Login" in the top right corner
2. You'll be logged back in automatically (no need to reconnect platforms)

**Tip:** If you're working on analysis for a long time, save your Chat conversations or copy important insights before the session expires.

---

### "No data available for this period"

**What happened:** The date range you selected has no campaign data.

**Try this:**
1. Select a different date range (try "Last 30 days")
2. Check that your campaigns were actually running during that period
3. If you just connected a platform, data may take a few hours to sync

---

### Platform Shows "Connect" But Already Connected

**What happened:** This was a bug with Brevo connection status (now fixed as of Nov 17, 2025).

**Try this:**
1. Refresh the page
2. If the issue persists, click "Connect" and re-enter your credentials
3. Your data is still safe - this is just a display issue

---

### "I selected Account A but seeing data from Account B"

**What happened:** This was a multi-client isolation bug (now fixed as of Nov 4, 2025).

**If you still see this:**
1. Log out and log back in
2. Carefully verify you selected the correct account from the dropdown
3. Contact support if the issue persists - this should not happen

---

### Wrong Numbers or Inaccurate Data

**What happened:** Mia's AI might occasionally round numbers or make approximations.

**Try this:**
1. Check the backend logs for exact numbers (dev mode only)
2. Cross-reference with your platform dashboards (Google Ads, Meta, GA4)
3. Report the specific discrepancy to support - we're constantly improving accuracy

**Important:** Mia's insights are directionally correct even if specific numbers are slightly off. If you notice major discrepancies (e.g., $1,000 reported as $10,000), please contact support immediately.

---

### Seeing Metrics for Platforms I Haven't Connected

**What happened:** This was a platform hallucination bug (being fixed).

**Example:** You haven't connected Brevo, but Mia mentions "email campaigns."

**Try this:**
1. Ignore insights for platforms you haven't connected
2. This is an AI quirk we're actively fixing
3. Report it to support if it's confusing

---

## FAQ (Frequently Asked Questions)

### Can I use Mia with just one platform?
**Yes!** Mia works great with a single platform. You'll get all the insights for that platform. Multi-platform connections are optional but unlock cross-platform comparisons.

---

### How far back can I analyze data?
You can select any custom date range, but we recommend sticking to the last 90 days for best results. Very old data may not be available depending on your platform's data retention policies.

---

### Can I manage multiple clients with one Mia account?
**Yes!** If you're an agency, you can add multiple business accounts and switch between them. Each client's data is completely isolated.

---

### Is my data secure?
Yes. Mia uses OAuth (the same login system as "Sign in with Google"). We never see your passwords, and your data is encrypted. We only access data you explicitly authorize.

---

### What if I want to disconnect a platform?
Go to the Integrations page, click the gear icon (⚙️) next to the platform, and select "Disconnect." Your data will remain in the platform's dashboard - Mia just won't have access anymore.

---

### Can I change which GA4 property is connected?
Yes! Go to Integrations → Google Analytics 4 → Click the gear icon (⚙️) → Change property. You can select a different property anytime.

You can also add multiple GA4 properties and designate one as "primary" for default queries.

---

### What if I have a Google Ads Manager (MCC) account?
Mia supports both standalone Google Ads accounts and sub-accounts managed by an MCC (Manager) account.

**If your account is managed by an MCC:**
- Connect normally - Mia will detect if it's an MCC sub-account
- Mia handles the \`login_customer_id\` automatically (no extra setup needed)
- You might see slightly different account names (they may include the MCC structure)

**If you manage multiple client accounts through MCC:**
- You'll see all sub-accounts when selecting your business account
- Each client account can be set up as a separate business account in Mia
- This gives you proper multi-client separation

---

### What if I have multiple Brevo accounts?
You can connect multiple Brevo accounts per business account in Mia! After adding your first Brevo API key, click the plus (+) icon to add another. You can switch between them using the gear (⚙️) icon.

---

### How often does data refresh?
Mia fetches fresh data every time you ask a question or run Quick Insights. There's no caching - you always get the latest data from your platforms.

---

### What questions can I ask in Chat?
See the "Example Questions" section above. Generally, you can ask about:
- Campaign performance (spend, conversions, ROI)
- Audience demographics (age, gender, location, device)
- Keywords (Google Ads only)
- Comparisons (campaigns, platforms, time periods)
- Optimization recommendations

Can't think of a question? Just type "help" in Chat!

---

### Does Mia support [Platform X]?
**Currently supported:**
- Google Ads ✓
- Google Analytics 4 (GA4) ✓
- Meta Ads (Facebook & Instagram Ads) ✓
- Facebook Pages (Organic Social) ✓
- Instagram Business (Organic Social) ✓
- Brevo (Email Marketing) ✓
- HubSpot (CRM & Marketing) ✓ Beta

**Coming soon:**
- Klaviyo (Email Marketing)
- LinkedIn Ads
- TikTok Ads
- Shopify (Ecommerce)

Want a specific platform? Contact support and let us know!

---

## Need Help?

### Contact Support
- **Email:** support@miacreate.ai
- **Live Chat:** Click the chat icon (bottom right of Mia app)
- **Response Time:** Within 24 hours on weekdays

### Helpful Resources
- [Mia Website](https://miacreate.ai)
- [Video Tutorial](/docs/video-tutorial) (2-minute setup guide)

---

**Happy analyzing! 🚀**

---

*This documentation was created with love by the Mia team. Last updated: November 17, 2025.*
`

const IntegrationGuidePage = () => {
  return (
    <DocsLayout title="Integration Guide">
      <div className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </div>
    </DocsLayout>
  )
}

export default IntegrationGuidePage
