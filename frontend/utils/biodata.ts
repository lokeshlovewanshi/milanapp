import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { API_URL } from './api';

/**
 * Whether a sheet is already being built or shared.
 *
 * Module scope on purpose: this is invoked from two places - the profile
 * screen and the drawer - and each used to guard itself, the screen with React
 * state and the drawer with its own flag. Neither could see the other, so
 * opening the drawer over the profile screen and tapping both produced two
 * concurrent shareAsync calls, and the platform rejected the second with
 * "Another share request is being processed now".
 *
 * React state could not fix this alone in any case: setState does not apply
 * until the next render, so two taps inside one frame both pass a
 * `disabled` check that has not updated yet.
 */
let inFlight = false;

/**
 * Builds the member's biodata sheet as a PDF and hands it to the share sheet.
 *
 * The server sends the sheet as HTML and the PDF is produced here, by the
 * platform's own WebView renderer. That keeps a PDF layout engine off the
 * backend, and it is also the only thing that reliably renders the sheet's
 * Devanagari lines and the inline kundali chart - a server-side PDF library
 * would need font shaping we would have to get right ourselves.
 *
 * @throws Error with a message worth showing the member
 */
export async function downloadBiodata(): Promise<void> {
  // A second request while the first is still open is a double-tap, not an
  // intent to build two sheets. Returning quietly is right: the member is
  // already looking at the share sheet, and an error about it would be noise
  // about something that is working.
  if (inFlight) {
    return;
  }
  inFlight = true;

  try {
    const token = await AsyncStorage.getItem('auth_token');

    const response = await fetch(`${API_URL}/user/biodata`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // The backend names the missing field ("Add your time of birth..."),
      // which is far more useful than a generic failure.
      throw new Error(body || 'Could not build your biodata');
    }

    const html = await response.text();

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // On web there is no share sheet - the print dialog is the download.
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save or share your biodata',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // No share sheet on this device - the system print dialog still offers
      // "Save as PDF", so the member is not left with a file they cannot reach.
      await Print.printAsync({ uri });
    }
  } finally {
    inFlight = false;
  }
}
