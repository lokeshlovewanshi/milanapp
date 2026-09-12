import * as WebBrowser from 'expo-web-browser';
import type { CheckoutOutcome, PaymentOrder } from './types';

/**
 * The shared half of every provider: open a page, wait for the customer to come
 * back, and work out what the return URL is telling us.
 *
 * openAuthSessionAsync rather than a WebView. It uses the platform's own secure
 * tab (Custom Tabs on Android, SFSafariViewController on iOS), which is what
 * banks' 3-D Secure and UPI intent handoffs expect - several banks refuse to
 * render inside an embedded WebView at all, and a UPI app cannot hand control
 * back to one. It also means no extra native dependency and no app rebuild when
 * the provider changes.
 */
export async function openHostedCheckout(
  order: PaymentOrder,
  /** Reads the provider's own status wording out of the return URL. */
  readStatus: (params: URLSearchParams) => CheckoutOutcome | null
): Promise<CheckoutOutcome> {
  const result = await WebBrowser.openAuthSessionAsync(order.checkoutUrl, order.returnUrl);

  // The customer backed out, or Android killed the tab. Not an error - they
  // simply did not pay, and saying "payment failed" here would be a lie that
  // sends people to support.
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { status: 'cancelled' };
  }

  let params: URLSearchParams;
  try {
    params = new URL(result.url).searchParams;
  } catch {
    // A return URL we cannot parse is not proof of failure either way, so it is
    // treated as pending and settled against the server.
    return { status: 'pending', orderId: order.orderId };
  }

  return readStatus(params) ?? { status: 'pending', orderId: order.orderId };
}
