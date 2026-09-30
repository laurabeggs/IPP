import type { PaymentFlow } from '../types/flow';

/**
 * The base flows, with no optional features switched on. Screens for tipping,
 * giving, installments, loyalty, currency conversion, surcharge, and card
 * verification come from `src/data/features.ts` and are inserted into these
 * flows when the feature is enabled.
 *
 * Screenshot convention: drop a screen capture in
 *   public/screens/<flow id>/<step id>.png
 * and it automatically replaces the placeholder for that step. For a
 * device-specific variant use
 *   public/screens/<flow id>/<step id>--<device id>.png
 * which takes priority when that device is selected. No code changes needed.
 *
 * Every number in `metrics` is placeholder data invented for this prototype.
 * Replace it once real reporting is wired up.
 */
export const flows: PaymentFlow[] = [
  {
    id: 'basic-card-payment',
    name: 'Basic card payment',
    summary:
      'The simplest terminal payment: the shopper sees the amount, presents their card, and gets an outcome.',
    properties: {
      devices: ['e285', 's1f2', 'ams1', 'tap-to-pay'],
      firmwareVersions: ['1.60', '1.61', '1.62'],
      languages: ['en-US', 'nl-NL', 'fr-FR', 'de-DE'],
      currencies: ['EUR', 'USD', 'GBP'],
      owningTeam: 'Terminal Payments',
    },
    steps: [
      {
        id: 'see-amount',
        title: 'See amount',
        shopperDescription:
          'The shopper approaches the checkout and sees the payment amount displayed on the terminal screen.',
        nextStepId: 'present-card',
        metrics: {
          impressions30d: 4_820_000,
          dropOffRate: 0.011,
          avgDurationSeconds: 3.4,
          errors: [
            { code: 'AMOUNT_TIMEOUT', label: 'Amount screen timed out', rate: 0.004 },
          ],
        },
      },
      {
        id: 'present-card',
        title: 'Present card',
        shopperDescription:
          'The shopper is prompted to present their card: tap, insert, or swipe.',
        nextStepId: 'processing',
        metrics: {
          impressions30d: 4_766_000,
          dropOffRate: 0.019,
          avgDurationSeconds: 6.1,
          errors: [
            { code: 'CARD_READ_FAIL', label: 'Card could not be read', rate: 0.012 },
            { code: 'CARD_TIMEOUT', label: 'No card presented in time', rate: 0.007 },
          ],
        },
      },
      {
        id: 'processing',
        title: 'Processing',
        shopperDescription:
          'The terminal contacts the card issuer and processes the payment while the shopper waits for an outcome.',
        branches: [
          { label: 'Approved', targetStepId: 'success', share: 0.94 },
          { label: 'Declined', targetStepId: 'declined', share: 0.06 },
        ],
        metrics: {
          impressions30d: 4_674_000,
          dropOffRate: 0.006,
          avgDurationSeconds: 4.7,
          errors: [
            { code: 'HOST_TIMEOUT', label: 'No response from host', rate: 0.005 },
            { code: 'CONNECTIVITY_LOST', label: 'Connectivity lost mid-payment', rate: 0.003 },
          ],
        },
      },
      {
        id: 'success',
        title: 'Success',
        shopperDescription:
          'The payment is approved. The shopper sees a confirmation and can take their receipt.',
        metrics: {
          impressions30d: 4_393_000,
          dropOffRate: 0.002,
          avgDurationSeconds: 2.9,
          errors: [],
        },
      },
      {
        id: 'declined',
        title: 'Declined',
        shopperDescription:
          'The payment is refused. The shopper is told the payment did not go through and can try another card.',
        propertyOverrides: { owningTeam: 'Checkout Experience' },
        metrics: {
          impressions30d: 281_000,
          dropOffRate: 0.38,
          avgDurationSeconds: 5.6,
          errors: [
            { code: 'REFUSED_FUNDS', label: 'Insufficient funds', rate: 0.41 },
            { code: 'REFUSED_ISSUER', label: 'Refused by issuer', rate: 0.33 },
          ],
        },
      },
    ],
  },
  {
    id: 'payment-with-receipt',
    name: 'Payment with receipt choice',
    summary:
      'A payment that ends with the shopper choosing how to receive the receipt.',
    properties: {
      devices: ['e285', 's1f2'],
      firmwareVersions: ['1.61', '1.62'],
      languages: ['en-US', 'nl-NL', 'fr-FR'],
      currencies: ['EUR', 'GBP', 'USD'],
      owningTeam: 'Checkout Experience',
    },
    steps: [
      {
        id: 'see-amount',
        title: 'See amount',
        shopperDescription: 'The shopper sees the amount to pay.',
        nextStepId: 'present-card',
        metrics: {
          impressions30d: 912_000,
          dropOffRate: 0.009,
          avgDurationSeconds: 3.1,
          errors: [],
        },
      },
      {
        id: 'present-card',
        title: 'Present card',
        shopperDescription: 'The shopper presents their card to pay the total.',
        nextStepId: 'processing',
        metrics: {
          impressions30d: 871_000,
          dropOffRate: 0.017,
          avgDurationSeconds: 6.3,
          errors: [
            { code: 'CARD_READ_FAIL', label: 'Card could not be read', rate: 0.011 },
          ],
        },
      },
      {
        id: 'processing',
        title: 'Processing',
        shopperDescription:
          'The payment is sent for authorisation while the shopper waits.',
        nextStepId: 'success',
        metrics: {
          impressions30d: 856_000,
          dropOffRate: 0.005,
          avgDurationSeconds: 4.9,
          errors: [
            { code: 'HOST_TIMEOUT', label: 'No response from host', rate: 0.006 },
          ],
        },
      },
      {
        id: 'success',
        title: 'Success',
        shopperDescription: 'The payment is approved and the total is confirmed.',
        nextStepId: 'receipt-choice',
        metrics: {
          impressions30d: 843_000,
          dropOffRate: 0.003,
          avgDurationSeconds: 2.8,
          errors: [],
        },
      },
      {
        id: 'receipt-choice',
        title: 'Choose receipt',
        shopperDescription:
          'The shopper chooses a printed receipt, a digital receipt, or no receipt.',
        propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
        branches: [
          { label: 'Printed', targetStepId: 'receipt-printed', share: 0.51 },
          { label: 'Digital', targetStepId: 'receipt-digital', share: 0.22 },
          { label: 'No receipt', targetStepId: 'receipt-skipped', share: 0.27 },
        ],
        metrics: {
          impressions30d: 840_000,
          dropOffRate: 0.024,
          avgDurationSeconds: 7.2,
          errors: [
            { code: 'RECEIPT_TIMEOUT', label: 'Receipt choice timed out', rate: 0.019 },
          ],
        },
      },
      {
        id: 'receipt-printed',
        title: 'Receipt printed',
        shopperDescription: 'The terminal prints the receipt for the shopper to take.',
        propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
        metrics: {
          impressions30d: 428_000,
          dropOffRate: 0.001,
          avgDurationSeconds: 3.6,
          errors: [
            { code: 'PRINTER_PAPER', label: 'Printer out of paper', rate: 0.022 },
          ],
        },
      },
      {
        id: 'receipt-digital',
        title: 'Digital receipt',
        shopperDescription:
          'The shopper enters an email address or scans a code to receive the receipt digitally.',
        propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
        metrics: {
          impressions30d: 185_000,
          dropOffRate: 0.086,
          avgDurationSeconds: 14.1,
          errors: [
            { code: 'EMAIL_INVALID', label: 'Email address not accepted', rate: 0.031 },
          ],
        },
      },
      {
        id: 'receipt-skipped',
        title: 'No receipt',
        shopperDescription: 'The shopper declines a receipt and the flow closes.',
        propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
        metrics: {
          impressions30d: 227_000,
          dropOffRate: 0.001,
          avgDurationSeconds: 1.9,
          errors: [],
        },
      },
    ],
  },
  {
    id: 'refund',
    name: 'Refund to card',
    summary:
      'A staff member starts a refund and the shopper presents the original card to receive the money back.',
    properties: {
      devices: ['e285', 's1f2'],
      firmwareVersions: ['1.60', '1.61', '1.62'],
      languages: ['en-US', 'nl-NL', 'de-DE'],
      currencies: ['EUR', 'USD'],
      owningTeam: 'Terminal Payments',
    },
    steps: [
      {
        id: 'refund-amount',
        title: 'See refund amount',
        shopperDescription:
          'The shopper sees the refund amount that the staff member has entered.',
        nextStepId: 'present-card',
        metrics: {
          impressions30d: 214_000,
          dropOffRate: 0.014,
          avgDurationSeconds: 4.2,
          errors: [],
        },
      },
      {
        id: 'present-card',
        title: 'Present card',
        shopperDescription:
          'The shopper presents the card that was used for the original payment.',
        nextStepId: 'processing',
        metrics: {
          impressions30d: 211_000,
          dropOffRate: 0.028,
          avgDurationSeconds: 7.4,
          errors: [
            { code: 'CARD_MISMATCH', label: 'Card does not match original payment', rate: 0.036 },
            { code: 'CARD_READ_FAIL', label: 'Card could not be read', rate: 0.013 },
          ],
        },
      },
      {
        id: 'processing',
        title: 'Processing refund',
        shopperDescription: 'The refund is sent to the issuer while the shopper waits.',
        branches: [
          { label: 'Refund accepted', targetStepId: 'refund-confirmed', share: 0.97 },
          { label: 'Refund failed', targetStepId: 'refund-failed', share: 0.03 },
        ],
        metrics: {
          impressions30d: 205_000,
          dropOffRate: 0.007,
          avgDurationSeconds: 5.8,
          errors: [
            { code: 'HOST_TIMEOUT', label: 'No response from host', rate: 0.008 },
          ],
        },
      },
      {
        id: 'refund-confirmed',
        title: 'Refund confirmed',
        shopperDescription:
          'The shopper is told the refund was accepted and when to expect the money.',
        metrics: {
          impressions30d: 197_000,
          dropOffRate: 0.002,
          avgDurationSeconds: 3.3,
          errors: [],
        },
      },
      {
        id: 'refund-failed',
        title: 'Refund failed',
        shopperDescription:
          'The refund could not be completed and the shopper is directed to staff.',
        propertyOverrides: { owningTeam: 'Checkout Experience' },
        metrics: {
          impressions30d: 6_200,
          dropOffRate: 0.29,
          avgDurationSeconds: 6.9,
          errors: [
            { code: 'REFUND_REFUSED', label: 'Refund refused by issuer', rate: 0.48 },
          ],
        },
      },
    ],
  },
  {
    id: 'unattended-preauth',
    name: 'Unattended pre-authorisation',
    summary:
      'An unattended flow: the shopper authorises a holding amount before fuelling and is charged the final amount afterwards.',
    properties: {
      devices: ['ams1'],
      firmwareVersions: ['1.60', '1.61'],
      languages: ['en-US', 'de-DE', 'fr-FR'],
      currencies: ['EUR'],
      owningTeam: 'Terminal Platform',
    },
    steps: [
      {
        id: 'see-instructions',
        title: 'See instructions',
        shopperDescription:
          'The shopper reads how the pre-authorisation works, including the holding amount.',
        nextStepId: 'present-card',
        metrics: {
          impressions30d: 1_140_000,
          dropOffRate: 0.043,
          avgDurationSeconds: 8.9,
          errors: [],
        },
      },
      {
        id: 'present-card',
        title: 'Present card',
        shopperDescription:
          'The shopper presents their card to authorise the holding amount.',
        nextStepId: 'preauth-processing',
        metrics: {
          impressions30d: 1_091_000,
          dropOffRate: 0.037,
          avgDurationSeconds: 9.6,
          errors: [
            { code: 'CARD_READ_FAIL', label: 'Card could not be read', rate: 0.028 },
            { code: 'CARD_UNSUPPORTED', label: 'Card type not accepted at pump', rate: 0.016 },
          ],
        },
      },
      {
        id: 'preauth-processing',
        title: 'Authorising hold',
        shopperDescription:
          'The terminal authorises the holding amount with the issuer.',
        branches: [
          { label: 'Hold approved', targetStepId: 'pump-authorised', share: 0.91 },
          { label: 'Hold refused', targetStepId: 'preauth-refused', share: 0.09 },
        ],
        metrics: {
          impressions30d: 1_051_000,
          dropOffRate: 0.009,
          avgDurationSeconds: 6.4,
          errors: [
            { code: 'HOST_TIMEOUT', label: 'No response from host', rate: 0.011 },
          ],
        },
      },
      {
        id: 'pump-authorised',
        title: 'Pump authorised',
        shopperDescription:
          'The shopper is told which pump is released and can start fuelling.',
        metrics: {
          impressions30d: 956_000,
          dropOffRate: 0.004,
          avgDurationSeconds: 3.8,
          errors: [],
        },
      },
      {
        id: 'preauth-refused',
        title: 'Hold refused',
        shopperDescription:
          'The holding amount was refused and the shopper is asked to try another card.',
        propertyOverrides: { owningTeam: 'Checkout Experience' },
        metrics: {
          impressions30d: 94_000,
          dropOffRate: 0.44,
          avgDurationSeconds: 7.1,
          errors: [
            { code: 'REFUSED_FUNDS', label: 'Insufficient funds for hold', rate: 0.52 },
          ],
        },
      },
    ],
  },
];

export function flowById(flowId: string): PaymentFlow | undefined {
  return flows.find((flow) => flow.id === flowId);
}
