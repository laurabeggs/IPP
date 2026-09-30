import type { Feature, FlowStep } from '../types/flow';

/**
 * Sentinel used by inserted steps where they hand back to the rest of the
 * flow. The resolver in src/lib/features.ts replaces it with the anchor
 * step's own next step, or with a shared "Take card" exit screen when the
 * anchor used to end the flow.
 */
export const REJOIN = '@rejoin';

/**
 * The optional checkout features a configuration can switch on. Each feature
 * names the flows it applies to and, per flow, the step its screens are
 * spliced in after and the screens each option inserts.
 *
 * Screenshot convention: same as base flows, drop a capture in
 *   public/screens/<flow id>/<step id>.png
 * and it replaces the placeholder for that step, no code changes needed.
 *
 * Every number in `metrics` is placeholder data invented for this prototype.
 * Replace it once real reporting is wired up.
 */
export const features: Feature[] = [
  {
    id: 'tipping',
    name: 'Tipping',
    description: 'Shoppers add a tip on the terminal after the payment is approved.',
    defaultOptionId: 'percentages',
    options: [
      {
        id: 'percentages',
        label: 'Suggested percentages',
        description: 'Buttons for three suggested percentages, no keypad.',
      },
      {
        id: 'custom',
        label: 'Custom amount',
        description: 'The shopper types any tip amount on a keypad.',
      },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'see-amount',
        stepsByOption: {
          percentages: [
            {
              id: 'choose-tip',
              title: 'Add a tip?',
              shopperDescription:
                'The shopper is offered three suggested tip percentages, or no tip at all.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              branches: [
                { label: 'Add tip', targetStepId: 'tip-total', share: 0.34 },
                { label: 'No tip', targetStepId: REJOIN, share: 0.66 },
              ],
              metrics: {
                impressions30d: 4_290_000,
                dropOffRate: 0.021,
                avgDurationSeconds: 7.4,
                errors: [
                  { code: 'TIP_TIMEOUT', label: 'Tip choice timed out', rate: 0.016 },
                ],
              },
            },
            {
              id: 'tip-total',
              title: 'Tip added',
              shopperDescription:
                'The shopper sees the tip on top of the payment amount and confirms the new total.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 1_459_000,
                dropOffRate: 0.008,
                avgDurationSeconds: 3.1,
                errors: [],
              },
            },
          ],
          custom: [
            {
              id: 'choose-tip',
              title: 'Add a tip?',
              shopperDescription:
                'The shopper is asked whether they want to add a tip before the total is charged.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              branches: [
                { label: 'Add tip', targetStepId: 'enter-tip-amount', share: 0.34 },
                { label: 'No tip', targetStepId: REJOIN, share: 0.66 },
              ],
              metrics: {
                impressions30d: 4_290_000,
                dropOffRate: 0.021,
                avgDurationSeconds: 7.4,
                errors: [
                  { code: 'TIP_TIMEOUT', label: 'Tip choice timed out', rate: 0.016 },
                ],
              },
            },
            {
              id: 'enter-tip-amount',
              title: 'Enter tip amount',
              shopperDescription:
                'The shopper types the tip amount they want to add on a keypad.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: 'tip-total',
              metrics: {
                impressions30d: 1_461_000,
                dropOffRate: 0.034,
                avgDurationSeconds: 11.8,
                errors: [
                  { code: 'TIP_KEYPAD', label: 'Tip amount not accepted', rate: 0.019 },
                ],
              },
            },
            {
              id: 'tip-total',
              title: 'Tip added',
              shopperDescription:
                'The shopper sees the tip on top of the payment amount and confirms the new total.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 1_459_000,
                dropOffRate: 0.008,
                avgDurationSeconds: 3.1,
                errors: [],
              },
            },
          ],
        },
      },
      {
        flowId: 'payment-with-receipt',
        afterStepId: 'success',
        stepsByOption: {
          percentages: [
            {
              id: 'choose-tip',
              title: 'Add a tip?',
              shopperDescription:
                'Before the receipt choice, the shopper is offered three suggested tip percentages.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              branches: [
                { label: 'Add tip', targetStepId: 'tip-total', share: 0.31 },
                { label: 'No tip', targetStepId: REJOIN, share: 0.69 },
              ],
              metrics: {
                impressions30d: 836_000,
                dropOffRate: 0.019,
                avgDurationSeconds: 6.8,
                errors: [],
              },
            },
            {
              id: 'tip-total',
              title: 'Tip added',
              shopperDescription:
                'The shopper confirms the payment total with the tip included.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 259_000,
                dropOffRate: 0.006,
                avgDurationSeconds: 3.0,
                errors: [],
              },
            },
          ],
          custom: [
            {
              id: 'choose-tip',
              title: 'Add a tip?',
              shopperDescription:
                'Before the receipt choice, the shopper is asked whether they want to add a tip.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              branches: [
                { label: 'Add tip', targetStepId: 'enter-tip-amount', share: 0.31 },
                { label: 'No tip', targetStepId: REJOIN, share: 0.69 },
              ],
              metrics: {
                impressions30d: 836_000,
                dropOffRate: 0.019,
                avgDurationSeconds: 6.8,
                errors: [],
              },
            },
            {
              id: 'enter-tip-amount',
              title: 'Enter tip amount',
              shopperDescription:
                'The shopper types the tip amount they want to add on a keypad.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: 'tip-total',
              metrics: {
                impressions30d: 259_000,
                dropOffRate: 0.041,
                avgDurationSeconds: 12.4,
                errors: [
                  { code: 'TIP_KEYPAD', label: 'Tip amount not accepted', rate: 0.024 },
                ],
              },
            },
            {
              id: 'tip-total',
              title: 'Tip added',
              shopperDescription:
                'The shopper confirms the payment total with the tip included.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 248_000,
                dropOffRate: 0.006,
                avgDurationSeconds: 3.0,
                errors: [],
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'giving',
    name: 'Giving',
    description: 'Shoppers can round up their payment for a charity after approval.',
    defaultOptionId: 'round-up',
    options: [
      {
        id: 'round-up',
        label: 'Round up',
        description: 'The shopper rounds the total up to the nearest whole unit.',
      },
      {
        id: 'fixed',
        label: 'Fixed amount',
        description: 'The shopper adds a fixed donation to the total.',
      },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'success',
        stepsByOption: {
          'round-up': [
            {
              id: 'giving-choice',
              title: 'Round up for charity?',
              shopperDescription:
                'The shopper is invited to round the payment up to the nearest whole unit for charity.',
              propertyOverrides: { owningTeam: 'Checkout Experience' },
              branches: [
                { label: 'Round up', targetStepId: 'giving-thanks', share: 0.18 },
                { label: 'No thanks', targetStepId: REJOIN, share: 0.82 },
              ],
              metrics: {
                impressions30d: 4_288_000,
                dropOffRate: 0.017,
                avgDurationSeconds: 5.2,
                errors: [],
              },
            },
            {
              id: 'giving-thanks',
              title: 'Thanks for giving',
              shopperDescription:
                'The shopper sees the rounded-up total and a thank you for the donation.',
              propertyOverrides: { owningTeam: 'Checkout Experience' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 772_000,
                dropOffRate: 0.003,
                avgDurationSeconds: 2.6,
                errors: [],
              },
            },
          ],
          fixed: [
            {
              id: 'giving-choice',
              title: 'Add €1 for charity?',
              shopperDescription:
                'The shopper is invited to add a fixed one euro donation to the payment.',
              propertyOverrides: { owningTeam: 'Checkout Experience' },
              branches: [
                { label: 'Add €1', targetStepId: 'giving-thanks', share: 0.12 },
                { label: 'No thanks', targetStepId: REJOIN, share: 0.88 },
              ],
              metrics: {
                impressions30d: 4_288_000,
                dropOffRate: 0.017,
                avgDurationSeconds: 5.2,
                errors: [],
              },
            },
            {
              id: 'giving-thanks',
              title: 'Thanks for giving',
              shopperDescription:
                'The shopper sees the total with the donation included and a thank you message.',
              propertyOverrides: { owningTeam: 'Checkout Experience' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 516_000,
                dropOffRate: 0.003,
                avgDurationSeconds: 2.6,
                errors: [],
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'installments',
    name: 'Installments',
    description: 'Shoppers can split the payment into instalments after presenting their card.',
    defaultOptionId: '3',
    options: [
      { id: '3', label: '3 instalments' },
      { id: '6', label: '6 instalments' },
      { id: '12', label: '12 instalments' },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'present-card',
        stepsByOption: {
          '3': [
            installmentChoice(
              'Pay in 3 instalments?',
              'The shopper is offered to split the payment into 3 instalments instead of paying in full.',
            ),
            installmentConfirmed(
              'Instalments confirmed',
              'The shopper confirms the 3 instalment plan and the payment continues in the background.',
            ),
          ],
          '6': [
            installmentChoice(
              'Pay in 6 instalments?',
              'The shopper is offered to split the payment into 6 instalments instead of paying in full.',
            ),
            installmentConfirmed(
              'Instalments confirmed',
              'The shopper confirms the 6 instalment plan and the payment continues in the background.',
            ),
          ],
          '12': [
            installmentChoice(
              'Pay in 12 instalments?',
              'The shopper is offered to split the payment into 12 instalments instead of paying in full.',
            ),
            installmentConfirmed(
              'Instalments confirmed',
              'The shopper confirms the 12 instalment plan and the payment continues in the background.',
            ),
          ],
        },
      },
    ],
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    description: 'Shoppers see their loyalty balance after the payment is approved.',
    defaultOptionId: 'points',
    options: [
      { id: 'points', label: 'Points balance' },
      { id: 'stamp', label: 'Stamp card' },
    ],
    insertions: [
      {
        flowId: 'payment-with-receipt',
        afterStepId: 'success',
        stepsByOption: {
          points: [
            {
              id: 'loyalty-earned',
              title: 'Points earned',
              shopperDescription:
                'The shopper sees how many loyalty points they earned with this payment and their new balance.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 838_000,
                dropOffRate: 0.012,
                avgDurationSeconds: 3.4,
                errors: [],
              },
            },
          ],
          stamp: [
            {
              id: 'loyalty-earned',
              title: 'Stamp earned',
              shopperDescription:
                'The shopper sees they earned a stamp on their digital stamp card, and how many are left for a reward.',
              propertyOverrides: { owningTeam: 'Receipts and Loyalty' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 838_000,
                dropOffRate: 0.012,
                avgDurationSeconds: 3.4,
                errors: [],
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'dcc',
    name: 'Dynamic currency conversion',
    description:
      'Shoppers paying with a foreign card are offered the amount in their own currency.',
    defaultOptionId: 'offer-home',
    options: [
      {
        id: 'offer-home',
        label: 'Offer home currency',
        description: 'The terminal offers to charge the card in its own currency.',
      },
      {
        id: 'card-first',
        label: 'Card currency first',
        description: 'The terminal charges in the card currency without an offer.',
      },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'present-card',
        stepsByOption: {
          'offer-home': [
            {
              id: 'dcc-offer',
              title: 'Choose your currency',
              shopperDescription:
                'The card is charged in a foreign currency, so the shopper is offered to pay in their own currency at a shown conversion rate.',
              propertyOverrides: { owningTeam: 'Terminal Payments' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_688_000,
                dropOffRate: 0.024,
                avgDurationSeconds: 5.6,
                errors: [
                  { code: 'DCC_RATE', label: 'Conversion rate unavailable', rate: 0.011 },
                ],
              },
            },
          ],
          'card-first': [
            {
              id: 'dcc-offer',
              title: 'Charged in card currency',
              shopperDescription:
                'The shopper is told the payment is charged directly in the card currency, with no conversion offer.',
              propertyOverrides: { owningTeam: 'Terminal Payments' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_688_000,
                dropOffRate: 0.024,
                avgDurationSeconds: 5.6,
                errors: [
                  { code: 'DCC_RATE', label: 'Conversion rate unavailable', rate: 0.011 },
                ],
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'surcharge',
    name: 'Surcharge',
    description: 'Shoppers are told about and accept a surcharge before paying.',
    defaultOptionId: 'fixed',
    options: [
      { id: 'fixed', label: 'Fixed fee' },
      { id: 'percentage', label: 'Percentage fee' },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'see-amount',
        stepsByOption: {
          fixed: [
            {
              id: 'surcharge-notice',
              title: 'Surcharge applies',
              shopperDescription:
                'The shopper is told a fixed 50 cent surcharge applies to this payment, on top of the amount.',
              propertyOverrides: { owningTeam: 'Terminal Payments' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_760_000,
                dropOffRate: 0.032,
                avgDurationSeconds: 6.1,
                errors: [],
              },
            },
          ],
          percentage: [
            {
              id: 'surcharge-notice',
              title: 'Surcharge applies',
              shopperDescription:
                'The shopper is told a 2% surcharge applies to this payment, and sees the resulting total.',
              propertyOverrides: { owningTeam: 'Terminal Payments' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_760_000,
                dropOffRate: 0.032,
                avgDurationSeconds: 6.1,
                errors: [],
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 'cvm',
    name: 'Card verification method',
    description:
      'How the shopper verifies themselves after presenting their card: PIN, signature, or their phone.',
    defaultOptionId: 'pin',
    options: [
      { id: 'pin', label: 'PIN' },
      { id: 'signature', label: 'Signature' },
      { id: 'cdcvm', label: 'Verify on phone' },
      { id: 'none', label: 'No verification' },
    ],
    insertions: [
      {
        flowId: 'basic-card-payment',
        afterStepId: 'present-card',
        stepsByOption: {
          pin: [
            {
              id: 'enter-pin',
              title: 'Enter PIN',
              shopperDescription: 'The shopper enters their PIN to verify the payment.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_690_000,
                dropOffRate: 0.029,
                avgDurationSeconds: 9.2,
                errors: [
                  { code: 'PIN_RETRY', label: 'PIN entered incorrectly', rate: 0.021 },
                  { code: 'PIN_LOCKED', label: 'Too many attempts', rate: 0.004 },
                ],
              },
            },
          ],
          signature: [
            {
              id: 'sign-receipt',
              title: 'Sign the receipt',
              shopperDescription:
                'The shopper signs on the terminal to verify the payment.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_690_000,
                dropOffRate: 0.011,
                avgDurationSeconds: 8.4,
                errors: [],
              },
            },
          ],
          cdcvm: [
            {
              id: 'verify-on-phone',
              title: 'Verify on your phone',
              shopperDescription:
                'The shopper confirms the payment with a biometric check on their own phone.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 4_690_000,
                dropOffRate: 0.062,
                avgDurationSeconds: 12.6,
                errors: [
                  { code: 'CDCVM_TIMEOUT', label: 'Phone verification timed out', rate: 0.038 },
                ],
              },
            },
          ],
          none: [],
        },
      },
      {
        flowId: 'refund',
        afterStepId: 'present-card',
        stepsByOption: {
          pin: [
            {
              id: 'enter-pin',
              title: 'Enter PIN',
              shopperDescription: 'The shopper enters their PIN to verify the refund.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 211_000,
                dropOffRate: 0.041,
                avgDurationSeconds: 9.8,
                errors: [
                  { code: 'PIN_RETRY', label: 'PIN entered incorrectly', rate: 0.03 },
                ],
              },
            },
          ],
          signature: [
            {
              id: 'sign-receipt',
              title: 'Sign the receipt',
              shopperDescription:
                'The shopper signs on the terminal to verify the refund.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 211_000,
                dropOffRate: 0.018,
                avgDurationSeconds: 8.9,
                errors: [],
              },
            },
          ],
          cdcvm: [
            {
              id: 'verify-on-phone',
              title: 'Verify on your phone',
              shopperDescription:
                'The shopper confirms the refund with a biometric check on their own phone.',
              propertyOverrides: { owningTeam: 'Terminal Security' },
              nextStepId: REJOIN,
              metrics: {
                impressions30d: 211_000,
                dropOffRate: 0.072,
                avgDurationSeconds: 13.1,
                errors: [
                  { code: 'CDCVM_TIMEOUT', label: 'Phone verification timed out', rate: 0.041 },
                ],
              },
            },
          ],
          none: [],
        },
      },
    ],
  },
];

function installmentChoice(title: string, shopperDescription: string): FlowStep {
  return {
    id: 'installments-choice',
    title,
    shopperDescription,
    propertyOverrides: { owningTeam: 'Terminal Payments' },
    branches: [
      { label: 'Instalments', targetStepId: 'installments-confirmed', share: 0.12 },
      { label: 'Pay in full', targetStepId: REJOIN, share: 0.88 },
    ],
    metrics: {
      impressions30d: 4_690_000,
      dropOffRate: 0.026,
      avgDurationSeconds: 8.4,
      errors: [],
    },
  };
}

function installmentConfirmed(title: string, shopperDescription: string): FlowStep {
  return {
    id: 'installments-confirmed',
    title,
    shopperDescription,
    propertyOverrides: { owningTeam: 'Terminal Payments' },
    nextStepId: REJOIN,
    metrics: {
      impressions30d: 563_000,
      dropOffRate: 0.009,
      avgDurationSeconds: 4.2,
      errors: [],
    },
  };
}
