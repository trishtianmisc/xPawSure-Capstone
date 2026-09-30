import { Alert } from '../../../components/ui'
import { useToast } from '../../../components/ui/ToastContext'
import { useClinicProfile } from '../hooks/useClinicProfile'
import { useClinicSettings } from '../hooks/useClinicSettings'
import { useOperatingHours } from '../hooks/useOperatingHours'
import { ClinicProfileCard } from '../components/ClinicProfileCard'
import { ClinicSettingsCard } from '../components/ClinicSettingsCard'
import { OperatingHoursCard } from '../components/OperatingHoursCard'
import type { ProfileFormValues } from '../schemas/clinicProfile.schema'
import type { SettingsFormValues } from '../schemas/clinicProfile.schema'
import type { OperatingHoursDay } from '../types/clinicProfile.types'

export function ClinicProfilePage() {
  const { showToast } = useToast()

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    updateProfile,
    uploadLogo,
  } = useClinicProfile()

  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useClinicSettings()

  const {
    data: operatingHours,
    isLoading: hoursLoading,
    error: hoursError,
    updateOperatingHours,
  } = useOperatingHours()

  const isLoading = profileLoading || settingsLoading || hoursLoading
  const error = profileError || settingsError || hoursError

  function handleUpdateProfile(data: ProfileFormValues) {
    updateProfile.mutate(
      {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address,
      },
      {
        onSuccess: () => showToast('Clinic profile updated.', 'success'),
        onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error'),
      },
    )
  }

  function handleUpdateSettings(data: SettingsFormValues) {
    updateSettings.mutate(
      {
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        appointment_duration: data.appointment_duration,
        max_appointments_per_day: data.max_appointments_per_day,
        allow_owner_booking: data.allow_owner_booking,
      },
      {
        onSuccess: () => showToast('Clinic settings updated.', 'success'),
        onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update settings.', 'error'),
      },
    )
  }

  function handleUploadLogo(file: File) {
    uploadLogo.mutate(file, {
      onSuccess: () => showToast('Logo uploaded successfully.', 'success'),
      onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to upload logo.', 'error'),
    })
  }

  function handleUpdateOperatingHours(data: OperatingHoursDay[]) {
    updateOperatingHours.mutate(data, {
      onSuccess: () => showToast('Operating hours updated.', 'success'),
      onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update operating hours.', 'error'),
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        )}

        {error && !profile && (
          <div className="py-8">
            <Alert variant="error">
              {error instanceof Error ? error.message : 'Failed to load clinic profile.'}
            </Alert>
          </div>
        )}

        {profile && (
          <>
            <ClinicProfileCard
              profile={profile}
              isUpdating={updateProfile.isPending}
              isUploadingLogo={uploadLogo.isPending}
              onUpdate={handleUpdateProfile}
              onUploadLogo={handleUploadLogo}
            />

            {settings && (
              <ClinicSettingsCard
                settings={settings}
                isUpdating={updateSettings.isPending}
                onUpdate={handleUpdateSettings}
              />
            )}

            {operatingHours && (
              <OperatingHoursCard
                hours={operatingHours}
                isUpdating={updateOperatingHours.isPending}
                onUpdate={handleUpdateOperatingHours}
              />
            )}
          </>
        )}
      </div>
  )
}
