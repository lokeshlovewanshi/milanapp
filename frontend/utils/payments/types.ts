/**
 * The contract every payment provider implements.
 *
 * The point of this file is that nothing above it knows the word "Paytm".
 * Switching to Razorpay, Cashfree or Stripe should be a change to which
 * provider the server names in its order response - not an edit to the
 * subscription screen.
 */

export type CheckoutPlan = {
  id: string;
  label: string;
  /** Whole rupees, for display only. The charge is whatever the server says. */
  price: number;
  months: number | null;
};

/**
 * What the backend hands back when it opens an order.
 *
 * `checkoutUrl` is deliberately the whole story. Every Indian gateway has some
 * flow that ends in "send the customer to a page and get them back afterwards",
 * and the pages that need a signed POST (Paytm's does) are built server-side
 * where the merchant key already lives. Doing it any other way means a native
 * SDK per provider and a new app build every time the provider changes.
 *
 * `params` carries anything a provider needs beyond the URL, verbatim, so this
 * type never grows a field per gateway.
 */
export type PaymentOrder = {
  /** Provider id, e.g. "paytm". Chosen by the server, not the app. */
  provider: string;
  orderId: string;
  /** In paise, as every Indian gateway counts. Display only. */
  amountPaise: number;
  /** Page that starts the payment. Usually on our own domain. */
  checkoutUrl: string;
  /** Deep link the provider returns the customer to. */
  returnUrl: string;
  params?: Record<string, string>;
};

export type CheckoutOutcome =
  | { status: 'success'; orderId: string }
  | { status: 'pending'; orderId: string }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

export interface PaymentProvider {
  /** Matches the `provider` field the server sends. */
  readonly id: string;
  /** Shown to the user, e.g. "Paytm". */
  readonly label: string;
  /**
   * Runs the provider's checkout and reports how it ended.
   *
   * A "success" here means the customer finished the flow, not that money
   * moved. Only the server knows that, and only after the gateway's webhook -
   * so callers must confirm with the backend before granting anything.
   */
  checkout(order: PaymentOrder): Promise<CheckoutOutcome>;
}
