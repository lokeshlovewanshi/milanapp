import { openHostedCheckout } from './hostedCheckout';
import type { CheckoutOutcome, PaymentOrder, PaymentProvider } from './types';

/**
 * Razorpay, through its hosted checkout.
 *
 * Here to prove the seam is real rather than because it is in use: this file is
 * the entire cost of switching provider on the client, and it is thirty lines
 * of reading a different query parameter. The server decides which provider is
 * live, so moving is a server change plus whichever of these is registered.
 */
export const razorpay: PaymentProvider = {
  id: 'razorpay',
  label: 'Razorpay',

  checkout(order: PaymentOrder): Promise<CheckoutOutcome> {
    return openHostedCheckout(order, (params) => {
      const paymentId = params.get('razorpay_payment_id');
      const status = (params.get('status') ?? '').toLowerCase();

      if (paymentId || status === 'success') return { status: 'success', orderId: order.orderId };
      if (status === 'pending') return { status: 'pending', orderId: order.orderId };
      if (status === 'failed') {
        return { status: 'failed', message: params.get('error_description') || 'Payment failed.' };
      }
      return null;
    });
  },
};
