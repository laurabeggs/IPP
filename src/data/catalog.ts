import type {
  Device,
  Merchant,
  TimeRange,
} from '../types/flow';

export const devices: Device[] = [
  {
    id: 'e285',
    name: 'E285 handheld',
    formFactor: 'handheld',
    screen: { width: 320, height: 480 },
  },
  {
    id: 's1f2',
    name: 'S1F2 countertop',
    formFactor: 'countertop',
    screen: { width: 800, height: 480 },
  },
  {
    id: 'ams1',
    name: 'AMS1 unattended',
    formFactor: 'unattended',
    screen: { width: 640, height: 480 },
  },
  {
    id: 'tap-to-pay',
    name: 'Tap to Pay on mobile',
    formFactor: 'mobile',
    screen: { width: 390, height: 844 },
  },
];

export const languages = ['en-US', 'nl-NL', 'fr-FR', 'de-DE'];

export const currencies = ['EUR', 'USD', 'GBP'];

export const firmwareVersions = ['1.60', '1.61', '1.62'];

export const timeRanges: TimeRange[] = [
  { id: '24h', label: 'Last 24 hours', volumeShare: 0.034 },
  { id: '5d', label: 'Last 5 days', volumeShare: 0.17 },
  { id: '30d', label: 'Last 30 days', volumeShare: 1 },
];

export const merchants: Merchant[] = [
  {
    id: 'northwind-retail',
    name: 'Northwind Retail',
    segment: 'Fashion retail, 420 stores',
    config: {
      device: 's1f2',
      language: 'nl-NL',
      currency: 'EUR',
      firmware: '1.62',
    },
    topFlowIds: ['basic-card-payment', 'refund', 'payment-with-receipt'],
  },
  {
    id: 'harbour-cafes',
    name: 'Harbour Cafés',
    segment: 'Food and beverage, 90 locations',
    config: {
      device: 'e285',
      language: 'en-US',
      currency: 'GBP',
      firmware: '1.61',
    },
    topFlowIds: ['payment-with-receipt', 'basic-card-payment'],
  },
  {
    id: 'meridian-fuel',
    name: 'Meridian Fuel',
    segment: 'Unattended fuel, 1,200 pumps',
    config: {
      device: 'ams1',
      language: 'de-DE',
      currency: 'EUR',
      firmware: '1.60',
    },
    topFlowIds: ['unattended-preauth', 'basic-card-payment'],
  },
];
