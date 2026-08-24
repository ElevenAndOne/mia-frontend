// Fixes that differ per platform: `no_account` is a Meta ad account on one
// channel and a Google Ads customer on the next, and the valid ad types and
// CTA buttons are not the same either.

import type { FixSpec } from './launch-check-fixes'

// Some codes mean different things per platform — `no_account` is a Meta ad
// account on one channel and a Google Ads customer on the next — so these win
// over the shared table below.
export const PLATFORM_FIX_SPECS: Record<string, Record<string, FixSpec>> = {
  meta: {
    asset_type_for_channel: {
      target: 'asset',
      field: 'asset_type',
      kind: 'select',
      cta: 'Change type',
      options: [
        { value: 'single_image', label: 'Single image' },
        { value: 'carousel', label: 'Carousel' },
        { value: 'video', label: 'Video' },
        { value: 'story', label: 'Story' },
        { value: 'animation', label: 'Animation' },
      ],
      hint: 'Pick the format Meta should build, rather than letting it fall back.',
    },
    invalid_cta: {
      target: 'push_config',
      field: 'default_cta',
      kind: 'select',
      cta: 'Fix button',
      options: [
        { value: 'LEARN_MORE', label: 'Learn more' },
        { value: 'SHOP_NOW', label: 'Shop now' },
        { value: 'SIGN_UP', label: 'Sign up' },
        { value: 'BOOK_TRAVEL', label: 'Book now' },
        { value: 'GET_QUOTE', label: 'Get quote' },
        { value: 'CONTACT_US', label: 'Contact us' },
      ],
      hint: 'The button text applied to every ad in this push.',
    },
    no_account: {
      target: 'channel',
      field: '',
      kind: 'connect',
      selector: 'meta_account',
      cta: 'Choose account',
      hint: "This is the workspace's Meta ad account — the same picker as Integrations.",
    },
    no_page: {
      target: 'channel',
      field: '',
      kind: 'connect',
      selector: 'facebook_page',
      cta: 'Choose Page',
      hint: 'Meta ads run as a Page. Picking one here links it to the workspace.',
    },
  },
  google: {
    asset_type_for_channel: {
      target: 'asset',
      field: 'asset_type',
      kind: 'select',
      cta: 'Change type',
      options: [
        { value: 'responsive_search_ad', label: 'Responsive search ad' },
        { value: 'search_ad', label: 'Search ad' },
      ],
      hint: 'Google Search takes text ads. Changing the type keeps the ad on this channel.',
    },
    pmax_unsupported: {
      target: 'asset',
      field: 'asset_type',
      kind: 'select',
      cta: 'Change type',
      options: [
        { value: 'responsive_search_ad', label: 'Responsive search ad' },
        { value: 'search_ad', label: 'Search ad' },
      ],
      hint: 'Performance Max pushes are not built yet — a Search ad can go now.',
    },
    invalid_cta: {
      target: 'push_config',
      field: 'default_cta',
      kind: 'select',
      cta: 'Fix button',
      options: [{ value: 'LEARN_MORE', label: 'Learn more' }],
      hint: 'Google Search ads have no CTA button — clearing this unblocks the push.',
    },
    no_account: {
      target: 'channel',
      field: '',
      kind: 'connect',
      selector: 'google_account',
      cta: 'Choose account',
      hint: "This is the workspace's Google Ads account — the same picker as Integrations.",
    },
  },
}
