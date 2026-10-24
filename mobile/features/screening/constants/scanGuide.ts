import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

export const SCAN_GUIDE_STORAGE_KEY = 'xpawsure_screening_guide_seen_v1'

export interface ScanGuideStep {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  description: string
}

export const SCAN_GUIDE_STEPS: ScanGuideStep[] = [
  {
    icon: 'camera-plus-outline',
    title: 'Capture or upload 5 photos',
    description:
      'Use Take Photo or Gallery to fill all five slots. Each photo should show the affected skin area from a different angle.',
  },
  {
    icon: 'image-check-outline',
    title: 'Pass the quality checks',
    description:
      'Each photo is checked for clarity and whether it looks like dog skin. Poor, blurry, or unrelated images are rejected.',
  },
  {
    icon: 'check-decagram-outline',
    title: 'Keep at least 3 valid photos',
    description:
      'Screening needs five photos, and at least three must pass. If a photo is rejected, retake it and replace that slot before running the screening.',
  },
]

export const SCAN_GUIDE_QUALITY_TIPS = [
  'Photograph only the affected skin area, close up.',
  'Use bright, even lighting and avoid glare or deep shadows.',
  'Hold the camera steady so the photo is sharp and in focus.',
  'Take each photo from a slightly different angle.',
  'Do not include faces, backgrounds, or other animals.',
]
