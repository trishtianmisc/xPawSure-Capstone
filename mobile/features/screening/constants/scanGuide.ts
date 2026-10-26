/**
 * Photo-guide content for the three-photo screening flow.
 *
 * SCAN_GUIDE_STORAGE_KEY (v2): once the owner dismisses the guide this flag
 * is stored so it does not auto-open again; the bump from v1 re-shows the
 * guide to everyone after the 5-photo -> 3-photo migration. Rendered by
 * ScanGuideModal.
 */
import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

export const SCAN_GUIDE_STORAGE_KEY = 'xpawsure_screening_guide_seen_v2'

export interface ScanGuideStep {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  description: string
}

export const SCAN_GUIDE_STEPS: ScanGuideStep[] = [
  {
    icon: 'camera-plus-outline',
    title: 'Photo 1 — Main affected area',
    description:
      'Take a clear, close-up photo of the primary affected skin area. Make sure the skin condition is visible and in focus.',
  },
  {
    icon: 'panorama-outline',
    title: 'Photo 2 — Wider view',
    description:
      'Take a slightly wider photo showing the affected area and the surrounding skin. Include enough context to show where the affected area is located on the dog.',
  },
  {
    icon: 'image-multiple-outline',
    title: 'Photo 3 — Additional affected area',
    description:
      'If another area is affected, photograph it clearly. If only one area is affected, take another useful angle of the same area.',
  },
  {
    icon: 'image-check-outline',
    title: 'Pass the quality checks',
    description:
      'Each photo is checked for clarity and whether it looks like dog skin. Poor, blurry, or unrelated images are rejected.',
  },
  {
    icon: 'check-decagram-outline',
    title: 'All 3 photos must pass',
    description:
      'Screening needs all 3 photos to pass the quality checks and the AI safety review (up to three reviews per screening). If a photo is rejected, retake it and replace that slot, then run again. If the review budget is used up, start a new screening.',
  },
]

export const SCAN_GUIDE_QUALITY_TIPS = [
  'Use good, even lighting.',
  'Keep the camera steady and the affected skin in focus.',
  'Move fur aside gently when possible so the affected skin is visible.',
  'Avoid blurry, dark, overexposed, or excessively distant photos.',
  'Do not apply filters or edit the images to change the appearance of the skin.',
  'Do not upload unrelated images, screenshots, or images that do not show the dog’s skin condition.',
  'Do not force the dog into an uncomfortable position to take a photo.',
]
