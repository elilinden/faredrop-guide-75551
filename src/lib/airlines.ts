export type AirlineKey = 'AA' | 'DL' | 'UA' | 'AS';

export const AIRLINE_NAMES: Record<AirlineKey, string> = {
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  AS: 'Alaska Airlines',
};

export const manageTripLinks: Record<AirlineKey, string> = {
  AA: 'https://www.aa.com/reservation/view/find-your-reservation',
  DL: 'https://www.delta.com/my-trips/trip-details',
  UA: 'https://www.united.com/en/us/manageres/mytrips',
  AS: 'https://www.alaskaair.com/booking/reservation-lookup',
};

export const changeFlowTips: Record<AirlineKey, string[]> = {
  AA: [
    'Open "Find your trip," enter confirmation code + last name.',
    'Choose "Change trip," keep same flights/cabin.',
    'On the review screen, look for a message showing a residual credit or price difference.',
  ],
  DL: [
    'Open "My Trips," find by confirmation code + last name.',
    'Choose "Modify flights," keep the same segments.',
    'Stop at the price summary—Delta shows the credit or difference before you confirm.',
  ],
  UA: [
    'Open "My trips," select your reservation.',
    'Choose "Change flight." Keep same flights to see the price difference.',
    'United shows any "future flight credit" you\'d receive before purchase.',
  ],
  AS: [
    'Open "Manage trip," enter confirmation code + last name.',
    'Click "Make changes to this trip" or "Use the value of this trip," keep same flights.',
    'Alaska shows any residual value before you commit.',
  ],
};

export const BRAND_OPTIONS = [
  'Basic Economy',
  'Main/Economy',
  'Premium Economy',
  'First/Business',
];

export function isBasicEconomy(brand: string | null): boolean {
  return brand?.toLowerCase().includes('basic') ?? false;
}

export function getAirlineColor(airline: AirlineKey): string {
  const colors: Record<AirlineKey, string> = {
    AA: 'airline-aa',
    DL: 'airline-dl',
    UA: 'airline-ua',
    AS: 'airline-as',
  };
  return colors[airline];
}
