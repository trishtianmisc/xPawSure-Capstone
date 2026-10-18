import type { TextStyle } from 'react-native'

export const font = {
  regular: { fontFamily: 'Poppins_400Regular' },
  medium: { fontFamily: 'Poppins_500Medium' },
  semibold: { fontFamily: 'Poppins_600SemiBold' },
  bold: { fontFamily: 'Poppins_700Bold' },
  extrabold: { fontFamily: 'Poppins_800ExtraBold' },
} as const satisfies Record<string, TextStyle>

export function fontForWeight(weight?: string | number): TextStyle {
  switch (String(weight)) {
    case '500':
    case 'medium':
      return font.medium
    case '600':
      return font.semibold
    case '700':
    case 'bold':
      return font.bold
    case '800':
      return font.extrabold
    default:
      return font.regular
  }
}
