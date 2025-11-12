import { type AirlineKey } from "./airlines";

type Tips = {
  manageUrl: string;
  helpUrl: string;
  bullets: string[];
  footnote: string;
  lastReviewed: string;
};

export const airlineTips: Record<AirlineKey, Tips> = {
  AA: {
    manageUrl: 'https://www.aa.com/reservation/view/find-your-reservation',
    helpUrl: 'https://www.aa.com/i18n/travel-info/policy/change-fee.jsp',
    bullets: [
      'Go to Find your trip - enter confirmation code + last name.',
      'Choose "Change trip" and keep the same flights/cabin.',
      'Stop at the review page to see any "price difference" or trip credit.',
      'Do not confirm unless you want the credit applied to your account.'
    ],
    footnote: 'Basic Economy is usually ineligible for changes; some options may be limited after check-in or on partner-operated segments.',
    lastReviewed: '2025-11-12'
  },
  DL: {
    manageUrl: 'https://www.delta.com/my-trips/trip-details',
    helpUrl: 'https://www.delta.com/us/en/change-cancel/change-flight',
    bullets: [
      'Open My Trips with confirmation code + last name.',
      'Select "Modify" - "Start flight change" and keep the same segments.',
      'Preview shows an eCredit or price difference before you commit.',
      'Back out if you\'re only checking the amount.'
    ],
    footnote: 'Basic Economy is typically not changeable; same-day change/standby rules differ from repricing for credit.',
    lastReviewed: '2025-11-12'
  },
  UA: {
    manageUrl: 'https://www.united.com/en/us/manageres/mytrips',
    helpUrl: 'https://www.united.com/en/us/fly/travel/change-flight.html',
    bullets: [
      'Open My trips - select your reservation.',
      'Click "Change flight" and keep the same flights/cabin.',
      'United will display any "future flight credit" before purchase.',
      'Exit if you only needed the preview amount.'
    ],
    footnote: 'Basic Economy generally cannot be changed; codeshares and split PNRs may limit what you see online.',
    lastReviewed: '2025-11-12'
  },
  AS: {
    manageUrl: 'https://www.alaskaair.com/booking/reservation-lookup',
    helpUrl: 'https://www.alaskaair.com/content/travel-info/policies/changes-and-cancellations',
    bullets: [
      'Go to Manage trip - enter confirmation code + last name.',
      'Choose "Make changes to this trip" and keep the same flights.',
      'Look for the residual value/price difference before confirmation.',
      'Close the window if you\'re just checking.'
    ],
    footnote: 'Basic Economy ("Saver") is typically not eligible; partner flights and post check-in changes may be restricted.',
    lastReviewed: '2025-11-12'
  }
};
