import { openHostedCheckout } from './hostedCheckout';
import type { CheckoutOutcome, PaymentOrder, PaymentProvider } from './types';

/**
 * Paytm, through its hosted payment page.
 *
 * Paytm's page has to be reached by a signed POST carrying a transaction token,
 * and the checksum that signs it needs the merchant key - which must never
 * reach a phone. So the backend mints the token, serves a one-shot page that
 * posts into Paytm, and hands this app only that page's URL. Everything here is
 * about getting the customer there and reading the answer on the way back.
 *
 * Nothing in this file is trusted for granting a membership. Paytm's own
 * server-to-server callback is the only thing that settles a payment; the
 * status below decides what the user is told while that lands.
 */
export const paytm: PaymentProvider = {
  id: 'paytm',
  label: 'Paytm',

  checkout(order: PaymentOrder): Promise<CheckoutOutcome> {
    return openHostedCheckout(order, (params) => {
      // Paytm returns STATUS as TXN_SUCCESS / TXN_FAILURE / PENDING. The
      // backend may normalise it to `status` before redirecting back; both
      // spellings are read so either arrangement works.
      const raw = (params.get('STATUS') ?? params.get('status') ?? '').toUpperCase();
      const message = params.get('RESPMSG') ?? params.get('message') ?? undefined;

      if (raw.includes('SUCCESS')) return { status: 'success', orderId: order.orderId };
      if (raw.includes('PENDING')) return { status: 'pending', orderId: order.orderId };
      if (raw.includes('FAIL') || raw.includes('CANCEL')) {
        return { status: 'failed', message: message || 'Paytm declined the payment.' };
      }
      // Unrecognised: let the caller settle it against the server rather than
      // guessing, since a wrong guess either charges silently or refuses money
      // that was taken.
      return null;
    });
  },
};
