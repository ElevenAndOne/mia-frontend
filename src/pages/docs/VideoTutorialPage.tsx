import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocsLayout from './DocsLayout'
import './docs.css'

const markdownContent = `# Mia Setup Video Tutorial - Script & Storyboard

**Last Updated**: November 17, 2025
**Purpose**: 2-minute video tutorial for new users
**Target Length**: ~2:00 minutes
**Tone**: Friendly, casual, but professional
**Audience**: Marketing teams, agencies, business owners

---

## Video Overview

**Goal:** Get users from zero to using Mia in 2 minutes.

**Key Messages:**
1. Mia simplifies marketing analytics across platforms
2. Setup is quick and easy (under 5 minutes)
3. Start getting insights immediately

**Video Format:**
- Screen recording with voiceover
- Use demo/sample account (not real client data)
- Background music: Upbeat but not distracting
- Captions: Yes (for accessibility)

---

## Script & Storyboard

| **Time** | **Visual on Screen** | **Narration** | **Production Notes** |
|----------|---------------------|---------------|----------------------|
| **0:00 - 0:15** | **INTRO: The Problem** |  |  |
| 0:00-0:05 | Montage: Multiple browser tabs open (Google Ads, Facebook Ads Manager, GA4 dashboard). Camera "zooms" through the chaos. | "Tired of juggling five different dashboards just to understand your marketing performance?" | Fast cuts, slightly chaotic feel. Music starts (upbeat, modern) |
| 0:06-0:10 | Cut to: Mia logo animation. Clean, simple background. | "Meet Mia." | Logo animates in smoothly. Music transitions to hopeful/solution tone |
| 0:11-0:15 | Screen recording: Mia chat interface showing a question "What's my best campaign?" and instant answer appearing. | "Your AI-powered marketing assistant that brings all your data into one conversation." | Emphasis on "one conversation". Show answer populating in real-time |
| **0:16 - 0:30** | **SETUP: Getting Started** |  |  |
| 0:16-0:20 | Screen recording: Landing page with "Continue with Google" and "Continue with Meta" buttons. Cursor hovers over "Continue with Google". | "Getting started takes just two minutes. First, sign in with Google or Meta." | Highlight both buttons briefly, then focus on Google |
| 0:21-0:25 | Screen recording: Google OAuth popup appearing, user clicking "Allow". | "Authorize Mia to access your marketing data - don't worry, your passwords stay with Google." | Show OAuth popup but don't linger (users are familiar with this) |
| 0:26-0:30 | Screen recording: Account selection page showing 3 accounts. Cursor selects "ACME Marketing". | "Select which business account you want to analyze." | Use fake/demo account names. Arrow points to selected account |
| **0:31 - 1:00** | **CONNECTING PLATFORMS** |  |  |
| 0:31-0:35 | Screen recording: Integrations page appearing. Shows Google Ads (already connected ✓), Meta Ads (Connect button), GA4 (Connect button), Brevo (Connect button). | "Now let's connect your platforms. If you logged in with Google, Google Ads is already connected." | Zoom in slightly on "Google Ads - Connected" checkmark |
| 0:36-0:45 | Screen recording: Clicking "Connect" on GA4. Dropdown menu appears with 3 GA4 properties. Cursor selects "ACME Website - Property 123456". Quick animation of checkmark appearing. | "Add Google Analytics by selecting your website's property. Not sure which one? Check your Google Ads Data Manager to see which property is already connected there." | Show tooltip or annotation: "Tip: Match the property in Google Ads" |
| 0:46-0:52 | Screen recording: Clicking "Connect" on Meta Ads. Facebook OAuth popup (fast forward through it). Back to Integrations page, Meta now shows "Connected ✓". | "Want to compare Google and Meta performance? Connect Meta Ads the same way." | Speed up OAuth popup (2x speed), show end result clearly |
| 0:53-1:00 | Screen recording: Clicking "Connect" on Brevo. Modal pops up with API key instructions. User types \`xkeysib-...\` into field, clicks "Connect", success message appears. | "For Brevo, just grab your API key from Settings and paste it in. Mia validates it instantly." | Show modal clearly but don't read all instructions aloud. Focus on "paste key → success" flow |
| **1:01 - 1:30** | **USING MIA** |  |  |
| 1:01-1:05 | Screen recording: Main Mia page with 4 buttons (Grow, Optimize, Protect, Chat). Cursor hovers over each briefly. | "You're all set! Now you can use Mia in two ways." | Highlight each button as cursor passes. Vibrant, clean UI |
| 1:06-1:15 | Screen recording: Clicking "Grow". Date picker modal appears, user selects "Last 30 days", clicks "Continue". Loading spinner for 2-3 seconds (sped up). Grow page loads with 3 insights. | "Quick Insights give you instant answers to specific questions. Like 'Where can we grow?' First, pick your date range. Then Mia analyzes your data and shows the top 3 opportunities." | Emphasize the date picker modal appearing FIRST. Show it clearly |
| 1:16-1:20 | Screen recording: Clicking "Optimize" button. Quick flash to Optimize page with different insights (don't show full loading). Then clicking "Protect" button. Quick flash to Protect page. | "Check 'Optimize' to find waste, or 'Protect' to spot risks." | Fast cuts. Don't show full loading - users get the idea |
| 1:21-1:30 | Screen recording: Clicking "Chat with Mia". Chat interface appears. User types "What's my average CPC?". Mia responds with answer (show typing animation, then full answer). User types "Which campaigns should I pause?". Mia responds. | "Or just chat with Mia. Ask anything in plain English. 'What's my average CPC?' 'Which campaigns should I pause?' Mia knows your data and responds in seconds." | Show 2 quick Q&A exchanges. Emphasize natural language ("plain English") |
| **1:31 - 1:50** | **KEY FEATURES HIGHLIGHT** |  |  |
| 1:31-1:38 | Screen recording: Split screen showing Google Ads dashboard on left, Meta Ads Manager on right, both with complex interfaces. Then cut to Mia chat showing "Compare Google and Meta performance" with clean, simple answer. | "No more switching between dashboards. Mia combines data from all your platforms in one place." | Strong visual contrast: chaos vs. simplicity. This is the "aha" moment |
| 1:39-1:45 | Screen recording: Account selector dropdown (top of page) showing "ACME Marketing", "Client A", "Client B". User switches to "Client A", page refreshes with new data. | "Managing multiple clients? Switch accounts instantly. Each client's data stays completely separate." | Show data changing when account switches. Emphasize "completely separate" (data security) |
| 1:46-1:50 | Screen recording: Clicking on date picker, showing options (7/14/30/90 days + custom). User selects "Last 7 days". Page updates. | "Analyze any time period - last week, last month, or pick a custom range." | Quick demo of flexibility. Don't linger |
| **1:51 - 2:00** | **WRAP-UP & CTA** |  |  |
| 1:51-1:55 | Mia logo on clean background. Text overlay: "Start analyzing your marketing data today" | "That's it! You're ready to start getting insights from your marketing data." | Slow down. Calm, confident tone. Music fades slightly |
| 1:56-2:00 | Text overlay: "Need help? Check out our Integration Documentation or contact support@miacreate.ai" | "Need help? Check out our full documentation, or reach out to support. Happy analyzing!" | Show website URL: miacreate.ai. Music ends on positive note |

---

## Production Checklist

### Pre-Production
- [ ] Create demo account with sample data (don't use real client data)
- [ ] Prepare all platforms (Google Ads, Meta, GA4, Brevo) with demo data
- [ ] Write out full script for voiceover talent
- [ ] Choose background music (upbeat, modern, royalty-free)
- [ ] Decide on brand colors for text overlays and annotations

### Recording
- [ ] Record screen at 1920x1080 resolution minimum
- [ ] Use clean demo account (no real client names or data)
- [ ] Record each section separately for easier editing
- [ ] Capture smooth mouse movements (not too fast)
- [ ] Get multiple takes of each section

### Voiceover
- [ ] Record voiceover in quiet environment
- [ ] Use professional microphone (or hire voice talent)
- [ ] Speak clearly and at moderate pace
- [ ] Emphasize key phrases ("one conversation", "instant", "plain English")
- [ ] Record extra takes for flexibility in editing

### Post-Production
- [ ] Edit video to match script timing
- [ ] Add background music (volume: -20dB to -15dB, don't overpower voice)
- [ ] Add text overlays for key points
- [ ] Add arrows/highlights to guide viewer attention
- [ ] Speed up loading/OAuth screens (2x speed or fast-forward effect)
- [ ] Add captions (auto-generate, then manually correct)
- [ ] Export in multiple formats (1080p MP4, 720p MP4, web-optimized)

### Quality Check
- [ ] Watch with sound OFF - does it make sense visually?
- [ ] Watch with sound ON - does voiceover match visuals?
- [ ] Check captions for accuracy
- [ ] Test on mobile device (text readable?)
- [ ] Get feedback from someone unfamiliar with Mia
- [ ] Verify all demo data is fake (no real client info visible)

---

## Visual Style Guide

### Colors (match miacreate.ai branding)
- **Primary Blue**: Use for highlights and buttons
- **Secondary Green**: Use for success states (checkmarks, "Connected")
- **Neutral Gray**: Use for background and less important UI
- **Accent Orange**: Use sparingly for CTAs

### Typography
- **Headings**: Bold, sans-serif (e.g., "Quick Insights")
- **Body text**: Clean, readable sans-serif
- **Annotations**: Smaller text, semi-transparent background for readability

### Animations
- **Transitions**: Smooth, not jarring (0.3-0.5 second duration)
- **Loading states**: Show briefly, speed up if needed
- **Cursor movement**: Smooth and purposeful (not erratic)

### Annotations & Highlights
- **Arrows**: Use to point at important buttons or fields
- **Circles/boxes**: Highlight key areas of screen
- **Tooltips**: Brief text explanations (1-3 words)

---

## Distribution Plan

### Where to Host
- [ ] Embed on miacreate.ai homepage
- [ ] Upload to YouTube (unlisted or public)
- [ ] Vimeo (for high-quality embed)
- [ ] Host on CDN for fast loading in app

### Where to Use
- [ ] Integrations page in Mia app (under "Setup Video Tutorial")
- [ ] Landing page on miacreate.ai
- [ ] Email onboarding sequence (send to new users)
- [ ] Social media (LinkedIn, Twitter) for marketing

### Video Variants
Consider creating shorter variants:
- **30-second version**: For social media ads
- **1-minute version**: For email onboarding
- **Full 2-minute version**: For website and in-app use

---

## Script Notes for Voice Talent

**Tone:** Friendly and conversational, like explaining to a colleague. Not robotic or overly corporate. Smile while you talk - it comes through in the voice!

**Pacing:** Moderate speed. Don't rush, but keep energy up. Pause briefly after key points to let them sink in.

**Emphasis words (say these slightly louder or with more energy):**
- "Meet Mia"
- "one conversation"
- "two minutes"
- "instant"
- "plain English"
- "all your platforms"
- "completely separate"

**Pronunciation:**
- "Mia" = MEE-uh (like the name)
- "OAuth" = OH-auth (you can just say "authorization" instead if easier)
- "GA4" = G-A-four (spell it out)
- "Brevo" = BREH-voh

---

## Video Thumbnail Ideas

For YouTube/Vimeo thumbnail, use:
- Mia logo prominently displayed
- Text overlay: "Setup in 2 Minutes"
- Clean, uncluttered background (brand colors)
- Optional: Split screen showing "Before" (messy dashboards) vs "After" (clean Mia interface)

---

## Accessibility Notes

- **Captions:** Always include accurate captions (not just auto-generated)
- **Audio description:** Consider creating an audio-described version for visually impaired users
- **Contrast:** Ensure text overlays have sufficient contrast against background
- **Pacing:** Keep pacing moderate so users can follow along

---

## Optional: Interactive Elements

If hosting on your own site (not YouTube), consider adding:
- **Chapters/Timestamps:** Let users jump to specific sections
  - 0:00 - Introduction
  - 0:16 - Getting Started
  - 0:31 - Connecting Platforms
  - 1:01 - Using Mia
  - 1:31 - Key Features
  - 1:51 - Wrap-up
- **Clickable CTAs:** Pause video and show "Try Mia Now" button
- **Related Links:** Links to full documentation, pricing, support

---

## Maintenance Schedule

**Review and update video every 6 months or when:**
- Major UI changes
- New platforms added
- Significant feature updates
- User feedback indicates confusion on specific steps

---

## Success Metrics

Track these metrics to measure video effectiveness:
- **View count:** How many users watch?
- **Completion rate:** How many watch to the end?
- **Drop-off points:** Where do users stop watching? (fix those sections)
- **Conversion rate:** Do users who watch the video complete setup faster?
- **Support tickets:** Does the video reduce "how do I connect?" support questions?

**Target metrics:**
- 70%+ completion rate (users watch to end)
- 50% reduction in setup-related support tickets
- 80%+ of new users complete at least one platform connection after watching

---

## Additional Resources for Implementation

### Stock Music Sources (Royalty-Free)
- Epidemic Sound
- Artlist
- AudioJungle
- YouTube Audio Library (free)

### Voiceover Talent Platforms
- Fiverr (budget-friendly)
- Voices.com (professional)
- Upwork (mid-range)
- Or record in-house if you have good equipment

### Screen Recording Tools
- **macOS:** QuickTime (free), ScreenFlow (paid)
- **Windows:** OBS Studio (free), Camtasia (paid)
- **Cross-platform:** Loom (easy), SnagIt (professional)

### Video Editing Software
- **Beginner:** iMovie (Mac), Clipchamp (Windows)
- **Intermediate:** DaVinci Resolve (free, powerful)
- **Professional:** Adobe Premiere Pro, Final Cut Pro

---

## Example Visual Annotations

### For "Connect GA4" Section:
\`\`\`
[Arrow pointing to GA4 property dropdown]
Text overlay: "Pick the property that tracks your website"

[Small info icon with tooltip]
Tooltip text: "Not sure? Check Google Ads → Tools → Data Manager"
\`\`\`

### For "Chat with Mia" Section:
\`\`\`
[Highlight around chat input box]
Text overlay: "Ask anything in plain English"

[Examples fading in and out below chat box]
- "What's my average CPC?"
- "Which campaigns should I pause?"
- "Compare Google and Meta performance"
\`\`\`

### For "Multi-Client" Section:
\`\`\`
[Circle highlight around account selector]
Text overlay: "Switch between clients instantly"

[Shield icon]
Text: "Data stays completely separate"
\`\`\`

---

## Final Notes

**Keep it simple!** The goal is to get users excited and started, not to cover every feature in depth. After watching this video, users should:
1. Know what Mia does
2. Feel confident they can set it up
3. Understand the basic features (Quick Insights + Chat)
4. Know where to get help if stuck

**The full Integration Documentation covers the details - the video is just the appetizer!**

---

**Ready to film? 🎬**

---

*Created by the Mia team with ❤️ | Last updated: November 17, 2025*
`

const VideoTutorialPage = () => {
  return (
    <DocsLayout title="Video Tutorial Script & Storyboard">
      <div className="prose prose-lg max-w-none">
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 mb-0">
            <strong>Note:</strong> This is the production script and storyboard for creating a 2-minute video tutorial.
            The actual video will be hosted here once production is complete.
          </p>
        </div>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </div>
    </DocsLayout>
  )
}

export default VideoTutorialPage
