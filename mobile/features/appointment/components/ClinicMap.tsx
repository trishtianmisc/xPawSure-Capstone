import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type { OwnerClinic } from '../types'

/** A clinic that can be placed on the map: it must have resolved coordinates. */
interface MappableClinic {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  fee: number
}

interface ClinicMapProps {
  clinics: OwnerClinic[]
  /** The clinic currently selected in the list; its pin is highlighted. */
  selectedClinicId: string | null
  /** Called when the owner taps a pin on the map. */
  onSelect: (clinicId: string) => void
}

/** Rough geographic center of the Philippines, used before bounds are fitted. */
const PH_CENTER: [number, number] = [12.8797, 121.774]
const DEFAULT_ZOOM = 6

/**
 * A map of bookable clinics rendered with Leaflet + OpenStreetMap tiles inside
 * a WebView. This is the only map that runs in Expo Go with no native build and
 * no API key: `react-native-webview` is bundled in Expo Go, and Leaflet + OSM
 * are free. (react-native-maps would require a development build and a Google
 * Maps key, so it is deliberately not used here.)
 *
 * Only clinics with geocoded coordinates appear as pins. Clinics without a
 * location stay selectable in the list below; this component renders nothing
 * when no clinic is mappable so the map never blocks the list.
 */
export function ClinicMap({ clinics, selectedClinicId, onSelect }: ClinicMapProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const webRef = useRef<WebView>(null)

  const mappable = useMemo<MappableClinic[]>(
    () =>
      clinics
        .filter(
          (clinic) =>
            typeof clinic.cln_latitude === 'number' &&
            typeof clinic.cln_longitude === 'number' &&
            Number.isFinite(clinic.cln_latitude) &&
            Number.isFinite(clinic.cln_longitude),
        )
        .map((clinic) => ({
          id: clinic.cln_id,
          name: clinic.cln_name,
          address: clinic.cln_address ?? '',
          lat: clinic.cln_latitude as number,
          lng: clinic.cln_longitude as number,
          fee: clinic.consultation_fee,
        })),
    [clinics],
  )

  // The HTML embeds the clinic list as JSON. Regenerate only when the set of
  // mappable clinics changes, so panning/selection never reloads the map.
  const html = useMemo(() => buildMapHtml(mappable), [mappable])

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; clinicId?: string }
      if (payload.type === 'select' && typeof payload.clinicId === 'string') {
        onSelect(payload.clinicId)
      }
    } catch {
      // Ignore any non-JSON message from the map; it carries no selection.
    }
  }

  // Highlight the pin for the clinic chosen in the list. `injectedJavaScript`
  // only runs on page load, so selection changes after load are applied here
  // imperatively. Guard on `mappable.length` so we never touch an unmounted map.
  useEffect(() => {
    if (mappable.length > 0) {
      webRef.current?.injectJavaScript(highlightScript(selectedClinicId))
    }
  }, [selectedClinicId, mappable.length])

  if (mappable.length === 0) {
    // No clinic has a resolvable location: fall back to the list only.
    return null
  }

  return (
    <View style={styles.mapWrap}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        source={{ html }}
        onMessage={handleMessage}
        // Re-apply the highlight once the map finishes loading.
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(highlightScript(selectedClinicId))
        }}
        style={styles.mapWebview}
      />
    </View>
  )
}

/**
 * Runs inside the WebView to highlight the selected pin. `window.__highlight`
 * is defined by the map HTML. The trailing `true;` makes WebView treat the
 * script's completion as resolved.
 */
function highlightScript(selectedClinicId: string | null): string {
  const id = JSON.stringify(selectedClinicId ?? '')
  return `window.__highlight && window.__highlight(${id}); true;`
}

/**
 * Builds the self-contained map page. Clinic data is injected via a placeholder
 * (rather than a nested template literal) so no user content can break out of
 * the JSON. Leaflet loads from a CDN and tiles come from OpenStreetMap — both
 * free, no API key required.
 */
function buildMapHtml(clinics: MappableClinic[]): string {
  // Serialize once; the placeholder avoids escaping headaches inside the HTML.
  const payload = JSON.stringify(clinics).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f2ede8; }
    .clinic-pin {
      width: 18px; height: 18px; border-radius: 50% 50% 50% 0;
      background: #8B4324; border: 2px solid #ffffff;
      transform: rotate(-45deg); box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      transition: transform 0.1s ease;
    }
    .clinic-pin.selected { background: #4D2515; transform: rotate(-45deg) scale(1.25); }
    .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; font-size: 13px; color: #1A0E08; }
    .leaflet-popup-content b { font-size: 14px; }
    .clinic-address { margin-top: 4px; color: #66554c; line-height: 1.35; }
    .clinic-fee { margin-top: 8px; font-weight: 600; }
    .clinic-select {
      width: 100%; margin-top: 10px; padding: 9px 12px; border: 0; border-radius: 8px;
      background: #8B4324; color: #fff; font-size: 13px; font-weight: 600;
    }
    .attribution { font-size: 10px; color: #806C60; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var CLINICS = __CLINIC_DATA__;
    var map = L.map('map', { zoomControl: false }).setView([${PH_CENTER[0]}, ${PH_CENTER[1]}], ${DEFAULT_ZOOM});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <span class="attribution">OpenStreetMap contributors</span>'
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);

    var markers = {};
    var bounds = [];

    CLINICS.forEach(function (clinic) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="clinic-pin" data-id="' + clinic.id + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18],
        popupAnchor: [0, -16]
      });
      var marker = L.marker([clinic.lat, clinic.lng], { icon: icon }).addTo(map);
      marker.bindPopup(createPopup(clinic));
      markers[clinic.id] = marker;
      bounds.push([clinic.lat, clinic.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }

    // Called from React Native to highlight the clinic picked in the list.
    window.__highlight = function (clinicId) {
      var selected = document.querySelectorAll('.clinic-pin.selected');
      for (var i = 0; i < selected.length; i++) { selected[i].classList.remove('selected'); }
      var el = document.querySelector('.clinic-pin[data-id="' + cssEscape(clinicId) + '"]');
      if (el) { el.classList.add('selected'); }
      var marker = markers[clinicId];
      if (marker) { map.panTo(marker.getLatLng(), { animate: true }); }
    };

    function createPopup(clinic) {
      var container = document.createElement('div');
      var name = document.createElement('strong');
      name.textContent = clinic.name;
      container.appendChild(name);

      if (clinic.address) {
        var address = document.createElement('div');
        address.className = 'clinic-address';
        address.textContent = clinic.address;
        container.appendChild(address);
      }

      var fee = document.createElement('div');
      fee.className = 'clinic-fee';
      fee.textContent = clinic.fee > 0
        ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(clinic.fee)
        : 'No consultation fee';
      container.appendChild(fee);

      var button = document.createElement('button');
      button.className = 'clinic-select';
      button.type = 'button';
      button.textContent = 'Choose this clinic';
      button.addEventListener('click', function () {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'select', clinicId: clinic.id })
        );
      });
      container.appendChild(button);
      return container;
    }
    function cssEscape(value) {
      return String(value).replace(/["\\\\]/g, '\\\\$&');
    }
  </script>
</body>
</html>`.replace('__CLINIC_DATA__', payload)
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    mapWrap: {
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      height: 220,
      overflow: 'hidden',
    },
    mapWebview: {
      backgroundColor: 'transparent',
      flex: 1,
    },
  })
