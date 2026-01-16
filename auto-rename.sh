#!/bin/bash

# Automated file renaming script
# This uses git mv to preserve history and track renames
# NOTE: This does NOT automatically update imports - use your IDE for that
# Or run update-imports.sh after this script completes

set -e  # Exit on error

echo "=== Starting automated file rename to kebab-case ==="
echo ""
echo "⚠️  WARNING: This will rename files but NOT update imports!"
echo "⚠️  Use your IDE's refactoring feature instead for automatic import updates."
echo ""
read -p "Continue with git mv only? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd /Users/Craig/Developer/Projects/mia-frontend

# Function to rename with git mv
git_rename() {
    local from=$1
    local to=$2
    if [ -f "$from" ]; then
        echo "Renaming: $from → $to"
        git mv "$from" "$to"
    else
        echo "⚠️  File not found: $from"
    fi
}

echo ""
echo "=== Root Files ==="
git_rename "src/App.tsx" "src/app.tsx"

echo ""
echo "=== Screen/Page Components ==="
git_rename "src/components/AccountSelectionPage.tsx" "src/components/account-selection-page.tsx"
git_rename "src/components/MetaAccountSelectionPage.tsx" "src/components/meta-account-selection-page.tsx"
git_rename "src/components/MainViewCopy.tsx" "src/components/main-view.tsx"
git_rename "src/components/IntegrationsPage.tsx" "src/components/integrations-page.tsx"
git_rename "src/components/OnboardingChatV2.tsx" "src/components/onboarding-chat.tsx"
git_rename "src/components/WorkspaceSettingsPage.tsx" "src/components/workspace-settings-page.tsx"
git_rename "src/components/InviteLandingPage.tsx" "src/components/invite-landing-page.tsx"
git_rename "src/components/CombinedAccountSelection.tsx" "src/components/combined-account-selection.tsx"
git_rename "src/components/VideoIntroView.tsx" "src/components/video-intro-view.tsx"

echo ""
echo "=== UI Components ==="
git_rename "src/components/LoadingScreen.tsx" "src/components/loading-screen.tsx"
git_rename "src/components/DateRangeSelector.tsx" "src/components/date-range-selector.tsx"
git_rename "src/components/MicroCelebration.tsx" "src/components/micro-celebration.tsx"
git_rename "src/components/FigmaLoginModal.tsx" "src/components/figma-login-modal.tsx"
git_rename "src/components/BronzeFactCard.tsx" "src/components/bronze-fact-card.tsx"
git_rename "src/components/TypingMessage.tsx" "src/components/typing-message.tsx"
git_rename "src/components/OnboardingProgressBar.tsx" "src/components/onboarding-progress-bar.tsx"

echo ""
echo "=== Other Components ==="
git_rename "src/components/BottomQuestionBar.tsx" "src/components/bottom-question-bar.tsx"
git_rename "src/components/BrevoAccountSelector.tsx" "src/components/brevo-account-selector.tsx"
git_rename "src/components/BrevoApiKeyModal.tsx" "src/components/brevo-api-key-modal.tsx"
git_rename "src/components/BrevoConnectionModal.tsx" "src/components/brevo-connection-modal.tsx"
git_rename "src/components/CreateWorkspaceModal.tsx" "src/components/create-workspace-modal.tsx"
git_rename "src/components/FacebookPageSelector.tsx" "src/components/facebook-page-selector.tsx"
git_rename "src/components/GA4PropertySelector.tsx" "src/components/ga4-property-selector.tsx"
git_rename "src/components/GoogleAccountLinkSelector.tsx" "src/components/google-account-link-selector.tsx"
git_rename "src/components/GoogleAccountSelector.tsx" "src/components/google-account-selector.tsx"
git_rename "src/components/GrowInsightsStreaming.tsx" "src/components/grow-insights-streaming.tsx"
git_rename "src/components/HubSpotAccountSelector.tsx" "src/components/hubspot-account-selector.tsx"
git_rename "src/components/InsightsDatePickerModal.tsx" "src/components/insights-date-picker-modal.tsx"
git_rename "src/components/MailchimpAccountSelector.tsx" "src/components/mailchimp-account-selector.tsx"
git_rename "src/components/MetaAccountSelector.tsx" "src/components/meta-account-selector.tsx"
git_rename "src/components/OptimizeInsightsStreaming.tsx" "src/components/optimize-insights-streaming.tsx"
git_rename "src/components/PlatformGearMenu.tsx" "src/components/platform-gear-menu.tsx"
git_rename "src/components/ProtectInsightsStreaming.tsx" "src/components/protect-insights-streaming.tsx"
git_rename "src/components/StreamingInsightsDemo.tsx" "src/components/streaming-insights-demo.tsx"
git_rename "src/components/SummaryInsights.tsx" "src/components/summary-insights.tsx"
git_rename "src/components/WorkspaceSwitcher.tsx" "src/components/workspace-switcher.tsx"

echo ""
echo "=== Test Files ==="
git_rename "src/components/__tests__/BottomQuestionBar.test.tsx" "src/components/__tests__/bottom-question-bar.test.tsx"
git_rename "src/components/__tests__/FigmaLoginModal.test.tsx" "src/components/__tests__/figma-login-modal.test.tsx"

echo ""
echo "=== Contexts ==="
git_rename "src/contexts/SessionContext.tsx" "src/contexts/session-context.tsx"
git_rename "src/contexts/OnboardingContext.tsx" "src/contexts/onboarding-context.tsx"
git_rename "src/contexts/__tests__/SessionContext.test.tsx" "src/contexts/__tests__/session-context.test.tsx"

echo ""
echo "=== Feature: Accounts ==="
git_rename "src/features/accounts/components/AccountSwitcher.tsx" "src/features/accounts/components/account-switcher.tsx"

echo ""
echo "=== Feature: Chat ==="
git_rename "src/features/chat/components/ChatPanel.tsx" "src/features/chat/components/chat-panel.tsx"

echo ""
echo "=== Feature: Insights ==="
git_rename "src/features/insights/components/InsightsNavigation.tsx" "src/features/insights/components/insights-navigation.tsx"

echo ""
echo "=== Feature: Integrations - Components ==="
git_rename "src/features/integrations/components/ConnectionModals.tsx" "src/features/integrations/components/connection-modals.tsx"
git_rename "src/features/integrations/components/PlatformCard.tsx" "src/features/integrations/components/platform-card.tsx"
git_rename "src/features/integrations/components/PlatformSelector.tsx" "src/features/integrations/components/platform-selector.tsx"

echo ""
echo "=== Feature: Integrations - Hooks ==="
git_rename "src/features/integrations/hooks/useIntegrationModals.ts" "src/features/integrations/hooks/use-integration-modals.ts"
git_rename "src/features/integrations/hooks/usePlatformConnectionHandlers.ts" "src/features/integrations/hooks/use-platform-connection-handlers.ts"

echo ""
echo "=== Feature: Onboarding - Components ==="
git_rename "src/features/onboarding/components/BronzeCardV2.tsx" "src/features/onboarding/components/bronze-card.tsx"
git_rename "src/features/onboarding/components/ExplainerBox.tsx" "src/features/onboarding/components/explainer-box.tsx"
git_rename "src/features/onboarding/components/InsightCardPreview.tsx" "src/features/onboarding/components/insight-card-preview.tsx"
git_rename "src/features/onboarding/components/MessageBubble.tsx" "src/features/onboarding/components/message-bubble.tsx"
git_rename "src/features/onboarding/components/ProgressDots.tsx" "src/features/onboarding/components/progress-dots.tsx"
git_rename "src/features/onboarding/components/TypingIndicator.tsx" "src/features/onboarding/components/typing-indicator.tsx"

echo ""
echo "=== Feature: Onboarding - Hooks ==="
git_rename "src/features/onboarding/hooks/useMessageQueue.ts" "src/features/onboarding/hooks/use-message-queue.ts"
git_rename "src/features/onboarding/hooks/useOnboardingFlow.ts" "src/features/onboarding/hooks/use-onboarding-flow.ts"
git_rename "src/features/onboarding/hooks/usePlatformConnection.ts" "src/features/onboarding/hooks/use-platform-connection.ts"

echo ""
echo "=== Feature: Workspaces - Components ==="
git_rename "src/features/workspaces/components/InviteList.tsx" "src/features/workspaces/components/invite-list.tsx"
git_rename "src/features/workspaces/components/MemberList.tsx" "src/features/workspaces/components/member-list.tsx"

echo ""
echo "=== Feature: Workspaces - Hooks ==="
git_rename "src/features/workspaces/hooks/useWorkspaceInvites.ts" "src/features/workspaces/hooks/use-workspace-invites.ts"
git_rename "src/features/workspaces/hooks/useWorkspaceMembers.ts" "src/features/workspaces/hooks/use-workspace-members.ts"

echo ""
echo "=== Hooks ==="
git_rename "src/hooks/useAppRouter.ts" "src/hooks/use-app-router.ts"
git_rename "src/hooks/useIntegrationStatus.ts" "src/hooks/use-integration-status.ts"
git_rename "src/hooks/useModalManager.ts" "src/hooks/use-modal-manager.ts"
git_rename "src/hooks/useOAuthHandler.ts" "src/hooks/use-oauth-handler.ts"
git_rename "src/hooks/useOnboardingStreaming.ts" "src/hooks/use-onboarding-streaming.ts"
git_rename "src/hooks/usePlatformPreferences.ts" "src/hooks/use-platform-preferences.ts"
git_rename "src/hooks/useStreamingInsights.ts" "src/hooks/use-streaming-insights.ts"
git_rename "src/hooks/useStreamingInsightsParsed.ts" "src/hooks/use-streaming-insights-parsed.ts"
git_rename "src/hooks/useTypingQueue.ts" "src/hooks/use-typing-queue.ts"

echo ""
echo "=== Pages: Docs ==="
git_rename "src/pages/docs/DocsLayout.tsx" "src/pages/docs/docs-layout.tsx"
git_rename "src/pages/docs/IntegrationGuidePage.tsx" "src/pages/docs/integration-guide-page.tsx"
git_rename "src/pages/docs/VideoTutorialPage.tsx" "src/pages/docs/video-tutorial-page.tsx"

echo ""
echo "=== Services ==="
git_rename "src/services/accountService.ts" "src/services/account-service.ts"
git_rename "src/services/metaAds.ts" "src/services/meta-ads.ts"

echo ""
echo "=== Utils ==="
git_rename "src/utils/clearMetaAuth.ts" "src/utils/clear-meta-auth.ts"

echo ""
echo "=== Rename Complete! ==="
echo ""
echo "⚠️  IMPORTANT: Imports have NOT been updated!"
echo ""
echo "Next steps:"
echo "1. Run: ./update-imports.sh (to fix all import statements)"
echo "2. Run: npm run type-check"
echo "3. Run: npm run build"
echo "4. Run: ./verify-kebab-case.sh"
echo ""
