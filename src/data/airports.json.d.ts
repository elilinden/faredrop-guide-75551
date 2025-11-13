declare const airports: Array<{
  iata?: string;
  name: string;
  city?: string;
  country?: string;
  iso?: string;
  status?: number;
  continent?: string;
  type?: string;
  size?: string;
  lon?: string;
  lat?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}>;

export default airports;
