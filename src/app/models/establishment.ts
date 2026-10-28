export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface OpeningPeriod {
  opens: string;
  closes: string;
}

export interface Establishment {
  id: string;
  slug: string;
  name: string;
  cuisines: string[];
  address: string;
  neighborhood: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  description?: string;
  image?: string;
  latitude: number;
  longitude: number;
  temporarilyClosed?: boolean;
  hours: Record<string, OpeningPeriod[]>;
  categories: MenuCategory[];
}

export interface ViewerLocation {
  latitude: number;
  longitude: number;
}
