import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image, StyleSheet, Text, View, type TextProps } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { xpawBrand as BRAND } from '../../../src/theme/brand'
import { font } from '../../../src/theme/typography'
import type { Pet } from '../types'

type MciName = keyof typeof MaterialCommunityIcons.glyphMap

function DocText({ style, ...props }: TextProps) {
  return <Text allowFontScaling={false} style={style} {...props} />
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: MciName
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons color={BRAND.accent} name={icon} size={15} />
      </View>
      <View style={styles.detailText}>
        <DocText style={styles.detailLabel}>{label}</DocText>
        <DocText numberOfLines={1} style={styles.detailValue}>
          {value}
        </DocText>
      </View>
    </View>
  )
}

interface PetQrImageDocumentProps {
  pet: Pet
  publicProfileUrl: string
}

export function PetQrImageDocument({ pet, publicProfileUrl }: PetQrImageDocumentProps) {
  return (
    <View collapsable={false} style={styles.card}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <MaterialCommunityIcons
        color="rgba(255, 248, 242, 0.05)"
        name="paw"
        size={150}
        style={styles.watermark}
      />

      <View style={styles.brandRow}>
        <View style={styles.brandLockup}>
          <Image
            resizeMode="contain"
            source={require('../../../assets/Xpaw_Logo_ForDark.png')}
            style={styles.brandLogo}
          />
          <View>
            <DocText style={styles.brandName}>XPawSure</DocText>
            <DocText style={styles.brandTag}>PET HEALTH, SIMPLIFIED</DocText>
          </View>
        </View>
        <View style={styles.brandPill}>
          <DocText style={styles.brandPillText}>PET QR</DocText>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons color={BRAND.accent} name="qrcode" size={28} />
        </View>
        <View style={styles.heroText}>
          <DocText numberOfLines={2} style={styles.title}>
            {pet.name}'s{'\n'}pet profile
          </DocText>
        </View>
      </View>

      <DocText style={styles.subtitle}>
        Scan this code to view {pet.name}'s public profile and vaccination status.
      </DocText>

      <View style={styles.qrFrame}>
        <QRCode
          backgroundColor={BRAND.qrSurface}
          color={BRAND.background}
          size={200}
          value={publicProfileUrl}
        />
      </View>

      <View style={styles.details}>
        <DetailRow icon="paw" label="Pet" value={pet.name} />
        <View style={styles.divider} />
        <DetailRow
          icon="dog-side"
          label="Breed"
          value={pet.breed_name || 'Not specified'}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="gender-male-female"
          label="Sex"
          value={pet.sex === 'MALE' ? 'Male' : 'Female'}
        />
      </View>

      <View style={styles.cta}>
        <MaterialCommunityIcons color={BRAND.background} name="qrcode-scan" size={18} />
        <DocText style={styles.ctaText}>Scan to open public profile</DocText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.background,
    overflow: 'hidden',
    padding: 24,
    position: 'relative',
    width: 360,
  },
  orbTop: {
    backgroundColor: BRAND.accent,
    borderRadius: 120,
    height: 240,
    opacity: 0.12,
    position: 'absolute',
    right: -92,
    top: -112,
    width: 240,
  },
  orbBottom: {
    backgroundColor: BRAND.accent,
    borderRadius: 100,
    bottom: -92,
    height: 200,
    left: -84,
    opacity: 0.07,
    position: 'absolute',
    width: 200,
  },
  watermark: {
    position: 'absolute',
    right: 18,
    top: 144,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  brandLogo: {
    height: 36,
    width: 33,
  },
  brandName: {
    ...font.extrabold,
    color: BRAND.text,
    fontSize: 17,
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  brandTag: {
    ...font.semibold,
    color: BRAND.textMuted,
    fontSize: 7,
    letterSpacing: 1.2,
    lineHeight: 11,
  },
  brandPill: {
    backgroundColor: BRAND.accentSoft,
    borderColor: BRAND.accentBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  brandPillText: {
    ...font.bold,
    color: BRAND.accent,
    fontSize: 8,
    letterSpacing: 0.9,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    marginTop: 22,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.iconBackground,
    borderColor: BRAND.accentBorder,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroText: {
    flex: 1,
  },
  title: {
    ...font.extrabold,
    color: BRAND.text,
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  subtitle: {
    ...font.regular,
    color: BRAND.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  qrFrame: {
    alignSelf: 'center',
    backgroundColor: BRAND.qrSurface,
    borderColor: BRAND.accentBorder,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  details: {
    backgroundColor: BRAND.surface,
    borderColor: BRAND.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: BRAND.iconBackground,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    ...font.semibold,
    color: BRAND.textMuted,
    fontSize: 8,
    letterSpacing: 0.7,
    lineHeight: 11,
    textTransform: 'uppercase',
  },
  detailValue: {
    ...font.bold,
    color: BRAND.text,
    fontSize: 12,
    lineHeight: 17,
  },
  divider: {
    backgroundColor: BRAND.divider,
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: BRAND.accent,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
    marginTop: 16,
  },
  ctaText: {
    ...font.bold,
    color: BRAND.background,
    fontSize: 12,
    letterSpacing: 0.2,
  },
})

