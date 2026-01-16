# File Renaming Checklist - PascalCase to kebab-case

## Instructions
Use your IDE's refactoring feature (Right-click → Rename File) to rename each file.
This will automatically update all imports.

## Root Files
- [ ] `src/App.tsx` → `src/app.tsx`

## Screen/Page Components (src/components/)
- [ ] `AccountSelectionPage.tsx` → `account-selection-page.tsx`
- [ ] `MetaAccountSelectionPage.tsx` → `meta-account-selection-page.tsx`
- [ ] `MainViewCopy.tsx` → `main-view.tsx` (also drop "Copy")
- [ ] `IntegrationsPage.tsx` → `integrations-page.tsx`
- [ ] `OnboardingChatV2.tsx` → `onboarding-chat.tsx` (drop V2)
- [ ] `WorkspaceSettingsPage.tsx` → `workspace-settings-page.tsx`
- [ ] `InviteLandingPage.tsx` → `invite-landing-page.tsx`
- [ ] `CombinedAccountSelection.tsx` → `combined-account-selection.tsx`
- [ ] `VideoIntroView.tsx` → `video-intro-view.tsx`

## UI Components (src/components/)
- [ ] `LoadingScreen.tsx` → `loading-screen.tsx`
- [ ] `DateRangeSelector.tsx` → `date-range-selector.tsx`
- [ ] `MicroCelebration.tsx` → `micro-celebration.tsx`
- [ ] `FigmaLoginModal.tsx` → `figma-login-modal.tsx`
- [ ] `BronzeFactCard.tsx` → `bronze-fact-card.tsx`
- [ ] `TypingMessage.tsx` → `typing-message.tsx`
- [ ] `OnboardingProgressBar.tsx` → `onboarding-progress-bar.tsx`

## Other Components (src/components/)
- [ ] `BottomQuestionBar.tsx` → `bottom-question-bar.tsx`
- [ ] `BrevoAccountSelector.tsx` → `brevo-account-selector.tsx`
- [ ] `BrevoApiKeyModal.tsx` → `brevo-api-key-modal.tsx`
- [ ] `BrevoConnectionModal.tsx` → `brevo-connection-modal.tsx`
- [ ] `CreateWorkspaceModal.tsx` → `create-workspace-modal.tsx`
- [ ] `FacebookPageSelector.tsx` → `facebook-page-selector.tsx`
- [ ] `GA4PropertySelector.tsx` → `ga4-property-selector.tsx`
- [ ] `GoogleAccountLinkSelector.tsx` → `google-account-link-selector.tsx`
- [ ] `GoogleAccountSelector.tsx` → `google-account-selector.tsx`
- [ ] `GrowInsightsStreaming.tsx` → `grow-insights-streaming.tsx`
- [ ] `HubSpotAccountSelector.tsx` → `hubspot-account-selector.tsx`
- [ ] `InsightsDatePickerModal.tsx` → `insights-date-picker-modal.tsx`
- [ ] `MailchimpAccountSelector.tsx` → `mailchimp-account-selector.tsx`
- [ ] `MetaAccountSelector.tsx` → `meta-account-selector.tsx`
- [ ] `OptimizeInsightsStreaming.tsx` → `optimize-insights-streaming.tsx`
- [ ] `PlatformGearMenu.tsx` → `platform-gear-menu.tsx`
- [ ] `ProtectInsightsStreaming.tsx` → `protect-insights-streaming.tsx`
- [ ] `StreamingInsightsDemo.tsx` → `streaming-insights-demo.tsx`
- [ ] `SummaryInsights.tsx` → `summary-insights.tsx`
- [ ] `WorkspaceSwitcher.tsx` → `workspace-switcher.tsx`

## Test Files (src/components/__tests__/)
- [ ] `BottomQuestionBar.test.tsx` → `bottom-question-bar.test.tsx`
- [ ] `FigmaLoginModal.test.tsx` → `figma-login-modal.test.tsx`

## Contexts (src/contexts/)
- [ ] `SessionContext.tsx` → `session-context.tsx`
- [ ] `OnboardingContext.tsx` → `onboarding-context.tsx`

## Context Tests (src/contexts/__tests__/)
- [ ] `SessionContext.test.tsx` → `session-context.test.tsx`

## Feature: Accounts (src/features/accounts/components/)
- [ ] `AccountSwitcher.tsx` → `account-switcher.tsx`

## Feature: Chat (src/features/chat/components/)
- [ ] `ChatPanel.tsx` → `chat-panel.tsx`

## Feature: Insights (src/features/insights/components/)
- [ ] `InsightsNavigation.tsx` → `insights-navigation.tsx`

## Feature: Integrations (src/features/integrations/components/)
- [ ] `ConnectionModals.tsx` → `connection-modals.tsx`
- [ ] `PlatformCard.tsx` → `platform-card.tsx`
- [ ] `PlatformSelector.tsx` → `platform-selector.tsx`

## Feature: Integrations Hooks (src/features/integrations/hooks/)
- [ ] `useIntegrationModals.ts` → `use-integration-modals.ts`
- [ ] `usePlatformConnectionHandlers.ts` → `use-platform-connection-handlers.ts`

## Feature: Onboarding (src/features/onboarding/components/)
- [ ] `BronzeCardV2.tsx` → `bronze-card.tsx` (drop V2)
- [ ] `ExplainerBox.tsx` → `explainer-box.tsx`
- [ ] `InsightCardPreview.tsx` → `insight-card-preview.tsx`
- [ ] `MessageBubble.tsx` → `message-bubble.tsx`
- [ ] `ProgressDots.tsx` → `progress-dots.tsx`
- [ ] `TypingIndicator.tsx` → `typing-indicator.tsx`

## Feature: Onboarding Hooks (src/features/onboarding/hooks/)
- [ ] `useMessageQueue.ts` → `use-message-queue.ts`
- [ ] `useOnboardingFlow.ts` → `use-onboarding-flow.ts`
- [ ] `usePlatformConnection.ts` → `use-platform-connection.ts`

## Feature: Workspaces (src/features/workspaces/components/)
- [ ] `InviteList.tsx` → `invite-list.tsx`
- [ ] `MemberList.tsx` → `member-list.tsx`

## Feature: Workspaces Hooks (src/features/workspaces/hooks/)
- [ ] `useWorkspaceInvites.ts` → `use-workspace-invites.ts`
- [ ] `useWorkspaceMembers.ts` → `use-workspace-members.ts`

## Hooks (src/hooks/)
- [ ] `useAppRouter.ts` → `use-app-router.ts`
- [ ] `useIntegrationStatus.ts` → `use-integration-status.ts`
- [ ] `useModalManager.ts` → `use-modal-manager.ts`
- [ ] `useOAuthHandler.ts` → `use-oauth-handler.ts`
- [ ] `useOnboardingStreaming.ts` → `use-onboarding-streaming.ts`
- [ ] `usePlatformPreferences.ts` → `use-platform-preferences.ts`
- [ ] `useStreamingInsights.ts` → `use-streaming-insights.ts`
- [ ] `useStreamingInsightsParsed.ts` → `use-streaming-insights-parsed.ts`
- [ ] `useTypingQueue.ts` → `use-typing-queue.ts`

## Pages: Docs (src/pages/docs/)
- [ ] `DocsLayout.tsx` → `docs-layout.tsx`
- [ ] `IntegrationGuidePage.tsx` → `integration-guide-page.tsx`
- [ ] `VideoTutorialPage.tsx` → `video-tutorial-page.tsx`

## Services (src/services/)
- [ ] `accountService.ts` → `account-service.ts`
- [ ] `metaAds.ts` → `meta-ads.ts`

## Utils (src/utils/)
- [ ] `clearMetaAuth.ts` → `clear-meta-auth.ts`

## Verification Steps
After renaming all files:
1. Run: `npm run type-check` (or `tsc --noEmit`)
2. Run: `npm run build`
3. Verify no remaining PascalCase files: `find src -type f \( -name "*.tsx" -o -name "*.ts" \) -name "*[A-Z]*" | grep -v node_modules`
4. Search for any broken imports in your IDE
5. Run: `npm run lint` (if available)

## Notes
- Use IDE refactoring (Right-click → Rename File) for each file
- This automatically updates all imports
- Work systematically through each section
- Check off items as you complete them
- MainViewCopy.tsx should become main-view.tsx (not main-view-copy.tsx)
- OnboardingChatV2.tsx should become onboarding-chat.tsx (not onboarding-chat-v2.tsx)
- BronzeCardV2.tsx should become bronze-card.tsx (not bronze-card-v2.tsx)
