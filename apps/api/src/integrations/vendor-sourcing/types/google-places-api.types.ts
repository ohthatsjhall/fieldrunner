/** Google Places API (New) Text Search response types */

export type GooglePlacesTextSearchResponse = {
  places: GooglePlace[];
  nextPageToken?: string;
};

export type GooglePlace = {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  addressComponents?: GoogleAddressComponent[];
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  types: string[];
  regularOpeningHours?: GoogleOpeningHours;
  currentOpeningHours?: GoogleOpeningHours;
  businessStatus?: string;
  googleMapsUri?: string;
};

export type GoogleAddressComponent = {
  longText: string;
  shortText: string;
  types: string[];
};

export type GoogleOpeningHours = {
  openNow?: boolean;
  periods?: GoogleOpeningPeriod[];
  weekdayDescriptions?: string[];
};

export type GoogleOpeningPeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};
