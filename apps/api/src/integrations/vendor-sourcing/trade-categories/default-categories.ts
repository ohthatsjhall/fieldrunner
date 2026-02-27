export type DefaultCategory = {
  name: string;
  searchQueries: string[];
  googlePlacesType: string | null;
  relatedCategories: string[];
};

export const DEFAULT_TRADE_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Plumbing',
    searchQueries: ['plumber', 'plumbing contractor', 'plumbing service'],
    googlePlacesType: 'plumber',
    relatedCategories: ['General Maintenance'],
  },
  {
    name: 'Electrical',
    searchQueries: ['electrician', 'electrical contractor', 'electrical service'],
    googlePlacesType: 'electrician',
    relatedCategories: ['General Maintenance'],
  },
  {
    name: 'HVAC',
    searchQueries: ['hvac contractor', 'heating and cooling', 'air conditioning repair'],
    googlePlacesType: null,
    relatedCategories: ['Electrical', 'General Maintenance'],
  },
  {
    name: 'General Maintenance',
    searchQueries: ['handyman', 'general contractor', 'maintenance service'],
    googlePlacesType: null,
    relatedCategories: ['Plumbing', 'Electrical'],
  },
  {
    name: 'Roofing',
    searchQueries: ['roofer', 'roofing contractor', 'roof repair'],
    googlePlacesType: 'roofing_contractor',
    relatedCategories: ['General Maintenance'],
  },
  {
    name: 'Landscaping',
    searchQueries: ['landscaper', 'landscaping service', 'lawn care'],
    googlePlacesType: null,
    relatedCategories: [],
  },
  {
    name: 'Painting',
    searchQueries: ['painter', 'painting contractor', 'house painter'],
    googlePlacesType: 'painter',
    relatedCategories: ['General Maintenance'],
  },
  {
    name: 'Locksmith',
    searchQueries: ['locksmith', 'lock repair', 'key service'],
    googlePlacesType: 'locksmith',
    relatedCategories: [],
  },
  {
    name: 'Pest Control',
    searchQueries: ['pest control', 'exterminator', 'pest removal'],
    googlePlacesType: null,
    relatedCategories: [],
  },
  {
    name: 'Janitorial',
    searchQueries: ['janitorial service', 'commercial cleaning', 'cleaning service'],
    googlePlacesType: null,
    relatedCategories: [],
  },
];
