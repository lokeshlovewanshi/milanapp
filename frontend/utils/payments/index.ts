import { paymentAPI } from '../api';
import { paytm } from './paytm';
import { razorpay } from './razorpay';
import type { CheckoutOutcome, CheckoutPlan, PaymentOrder, PaymentProvider } from './types';

export type { CheckoutOutcome, CheckoutPlan, PaymentOrder, PaymentProvider } from './types';

/**
 * Every provider the app can drive.
 *
 * Adding one is a file next to paytm.ts and a line here. Choosing which is
 * live is not done here at all - the server names it in the order it creates,
 * so a switch takes effect for everyone at once without an app release, and a
 * customer midway through checkout is never handed to the wrong gateway.
 */
const PROVIDERS: PaymentProvider[] = [paytm, razorpay];

const providerFor = (id: string): PaymentProvider | undefined =>
  PROVIDERS.find((p) => p.id === id.toLowerCase());

/** Which gateway the app would use, for copy like "Pay with Paytm". */
export const defaultProviderLabel =
  providerFor(process.env.EXPO_PUBLIC_PAYMENT_PROVIDER ?? 'paytm')?.label ?? 'card or UPI';

/**
 * True once the backend has payment endpoints and merchant credentials.
 *
 * Read from the environment rather than probed, because a screen should not
 * have to make a network call to decide whether to show a price. Set
 * EXPO_PUBLIC_PAYMENTS_ENABLED=1 when the server side is live.
 */
export const isPaymentConfigured = process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === '1';

/**
 * Buy a plan.
 *
 * The order of operations is the part that matters:
 *
 *  1. The server creates the order and decides the amount. A price sent up
 *     from the app is a price somebody can edit before it is charged.
 *  2. The provider's page takes the money.
 *  3. The server - told by the gateway's own callback, not by this app -
 *     records the membership.
 *  4. This asks the server what actually happened.
 *
 * Step 4 exists because the return URL is a hint, not a receipt: a customer can
 * close the tab after paying, and a determined one can forge the parameters.
 * Nothing is unlocked on the strength of what came back in that URL.
 */
export async function startCheckout(plan: CheckoutPlan): Promise<CheckoutOutcome> {
  if (!isPaymentConfigured) {
    throw new Error(
      'Payments are not switched on yet. The plans are ready; the gateway account and the server endpoints are the remaining piece.'
    );
  }

  const res = await paymentAPI.createOrder(plan.id);
  const order: PaymentOrder = res.data;

  const provider = providerFor(order.provider);
  if (!provider) {
    throw new Error(`This app cannot handle "${order.provider}" payments. Please update the app.`);
  }

  const outcome = await provider.checkout(order);
  if (outcome.status === 'cancelled' || outcome.status === 'failed') return outcome;

  // Settle it against the server, which is the only party that heard from the
  // gateway directly.
  try {
    const confirmed = await paymentAPI.getOrder(order.orderId);
    const state = String(confirmed.data?.status ?? '').toLowerCase();
    if (state === 'paid') return { status: 'success', orderId: order.orderId };
    if (state === 'failed') {
      return { status: 'failed', message: confirmed.data?.message || 'The payment did not go through.' };
    }
    return { status: 'pending', orderId: order.orderId };
  } catch {
    // The payment may well have worked - we just could not check. Saying
    // "pending" keeps the door open instead of telling someone who paid that
    // they did not.
    return { status: 'pending', orderId: order.orderId };
  }
}
