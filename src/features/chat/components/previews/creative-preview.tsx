import type { CreativeSpec } from './creative-spec'
import { charChecks } from './creative-spec'
import {
  DisplayAdPreview,
  DocumentPreview,
  EmailPreview,
  FacebookPreview,
  GoogleSearchPreview,
  InstagramPreview,
  InstagramReelPreview,
  LinkedInPreview,
  PMaxPreview,
  PostSeriesPreview,
  TextAdPreview,
  TikTokPreview,
} from './platform-previews'
import { CharCountChips, ProductionNotes, type MediaHandlers } from './preview-bits'

interface CreativePreviewProps extends MediaHandlers {
  spec: CreativeSpec
  brandName?: string
}

/**
 * Renders a parsed deliverable as the platform-native ad/post it will become,
 * with char-limit chips and the production notes underneath. The copy inside
 * the preview stays selectable, so highlight-to-edit works exactly as it does
 * over the markdown view.
 */
export const CreativePreview = ({ spec, brandName, ...media }: CreativePreviewProps) => {
  const mock =
    spec.platform === 'email' || spec.format === 'email' ? (
      <EmailPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.platform === 'google' ? (
      spec.format === 'display_ad' ? (
        <DisplayAdPreview spec={spec} brandName={brandName} {...media} />
      ) : spec.format === 'pmax' ? (
        <PMaxPreview spec={spec} brandName={brandName} {...media} />
      ) : (
        <GoogleSearchPreview spec={spec} brandName={brandName} />
      )
    ) : spec.format === 'text_ad' ? (
      <TextAdPreview spec={spec} brandName={brandName} />
    ) : spec.platform === 'tiktok' ? (
      <TikTokPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.format === 'reel' || spec.format === 'story' ? (
      <InstagramReelPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.format === 'document' ? (
      <DocumentPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.format === 'post_series' ? (
      <PostSeriesPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.platform === 'linkedin' ? (
      <LinkedInPreview spec={spec} brandName={brandName} {...media} />
    ) : spec.platform === 'instagram' ? (
      <InstagramPreview spec={spec} brandName={brandName} {...media} />
    ) : (
      <FacebookPreview spec={spec} brandName={brandName} {...media} />
    )

  return (
    <div className="flex flex-col items-center gap-3 pb-2">
      {mock}
      <CharCountChips checks={charChecks(spec)} />
      <ProductionNotes spec={spec} />
    </div>
  )
}
