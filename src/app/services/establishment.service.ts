import { Injectable, signal } from '@angular/core';

import type { Establishment, MenuCategory, ViewerLocation } from '../models/establishment';

const STORAGE_KEY = 'mycardapio.establishments.v1';
const SESSION_KEY = 'mycardapio.demo-session';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const OPEN_EVERY_DAY = {
  mon: [{ opens: '09:00', closes: '22:00' }],
  tue: [{ opens: '09:00', closes: '22:00' }],
  wed: [{ opens: '09:00', closes: '22:00' }],
  thu: [{ opens: '09:00', closes: '22:00' }],
  fri: [{ opens: '09:00', closes: '23:00' }],
  sat: [{ opens: '09:00', closes: '23:00' }],
  sun: [{ opens: '09:00', closes: '21:00' }],
};

const SAMPLE_ESTABLISHMENTS: Establishment[] = [
  {
    id: 'casa-do-caju',
    slug: 'casa-do-caju',
    name: 'Casa do Caju',
    cuisines: ['Nordestina', 'Brasileira'],
    address: 'Rua dos Tabajaras, 128',
    neighborhood: 'Praia de Iracema',
    city: 'Fortaleza',
    phone: '+558530001001',
    whatsapp: '558530001001',
    description: 'Comida cearense de casa, feita com ingredientes da estação.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85',
    latitude: -3.7192,
    longitude: -38.5123,
    hours: OPEN_EVERY_DAY,
    categories: [
      {
        id: 'entradas',
        name: 'Entradas',
        items: [
          { id: 'dadinho', name: 'Dadinho de tapioca', description: 'Com geleia de pimenta da casa.', price: 24, available: true },
          { id: 'macaxeira', name: 'Macaxeira dourada', description: 'Manteiga de garrafa e cheiro-verde.', price: 19, available: true },
        ],
      },
      {
        id: 'pratos-executivos',
        name: 'Pratos executivos',
        items: [
          { id: 'carne-de-sol', name: 'Carne de sol da casa', description: 'Arroz de leite, feijão verde e farofa de castanha.', price: 48, available: true },
          { id: 'peixe-coco', name: 'Peixe no leite de coco', description: 'Peixe grelhado, pirão leve e arroz branco.', price: 44, available: false },
        ],
      },
      {
        id: 'bebidas',
        name: 'Bebidas e drinks',
        items: [
          { id: 'cajuina', name: 'Cajuína gelada', description: 'Garrafa de 300 ml.', price: 12, available: true },
          { id: 'caipirinha', name: 'Caipirinha de caju', description: 'Cachaça, limão e caju fresco.', price: 26, available: true },
        ],
      },
    ],
  },
  {
    id: 'mare-mansa',
    slug: 'mare-mansa',
    name: 'Maré Mansa',
    cuisines: ['Frutos do mar', 'Brasileira'],
    address: 'Av. Beira-Mar, 640',
    neighborhood: 'Meireles',
    city: 'Fortaleza',
    phone: '+558530001002',
    whatsapp: '558530001002',
    description: 'Peixe fresco, receitas do litoral e mesa sem pressa.',
    image: 'https://images.unsplash.com/photo-1515003197210-e0cd7184f8b5?auto=format&fit=crop&w=1200&q=85',
    latitude: -3.7247,
    longitude: -38.4981,
    hours: OPEN_EVERY_DAY,
    categories: [
      {
        id: 'para-comecar',
        name: 'Para começar',
        items: [
          { id: 'bolinho-peixe', name: 'Bolinho de peixe', description: 'Seis unidades com molho de limão.', price: 29, available: true },
        ],
      },
      {
        id: 'pratos',
        name: 'Pratos executivos',
        items: [
          { id: 'moqueca', name: 'Moqueca da Maré', description: 'Peixe, camarão, leite de coco e arroz.', price: 62, available: true },
          { id: 'peixe-grelhado', name: 'Peixe na brasa', description: 'Legumes tostados e vinagrete de coentro.', price: 54, available: true },
        ],
      },
      {
        id: 'sucos',
        name: 'Sucos e drinks',
        items: [
          { id: 'coco', name: 'Água de coco', price: 10, available: true },
          { id: 'seriguela', name: 'Suco de seriguela', description: 'Polpa da fruta, batida na hora.', price: 14, available: true },
        ],
      },
    ],
  },
  {
    id: 'bule-verde',
    slug: 'bule-verde',
    name: 'Bule Verde',
    cuisines: ['Café', 'Confeitaria'],
    address: 'Rua Silva Paulet, 910',
    neighborhood: 'Aldeota',
    city: 'Fortaleza',
    phone: '+558530001003',
    description: 'Café passado com calma e fornadas pequenas todos os dias.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
    latitude: -3.7356,
    longitude: -38.5007,
    hours: {
      ...OPEN_EVERY_DAY,
      sun: [{ opens: '09:00', closes: '15:00' }],
    },
    categories: [
      {
        id: 'cafes',
        name: 'Cafés',
        items: [
          { id: 'coado', name: 'Coado da semana', description: 'Grãos brasileiros, torra média.', price: 12, available: true },
          { id: 'latte', name: 'Latte gelado', description: 'Espresso duplo e leite gelado.', price: 18, available: true },
        ],
      },
      {
        id: 'forno',
        name: 'Saindo do forno',
        items: [
          { id: 'bolo-milho', name: 'Bolo de milho cremoso', description: 'Fatia generosa, receita da casa.', price: 16, available: true },
          { id: 'pao-queijo', name: 'Pão de queijo', description: 'Queijo coalho e parmesão.', price: 9, available: true },
        ],
      },
    ],
  },
  {
    id: 'quintal-de-acai',
    slug: 'quintal-de-acai',
    name: 'Quintal de Açaí',
    cuisines: ['Açaí', 'Sobremesas'],
    address: 'Rua Canuto de Aguiar, 515',
    neighborhood: 'Varjota',
    city: 'Fortaleza',
    whatsapp: '558530001004',
    description: 'Açaí batido na casa e acompanhamentos feitos por perto.',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=85',
    latitude: -3.7294,
    longitude: -38.4872,
    temporarilyClosed: true,
    hours: OPEN_EVERY_DAY,
    categories: [
      {
        id: 'acai',
        name: 'Açaí',
        items: [
          { id: 'acai-puro', name: 'Açaí puro', description: '300 ml, sem xarope de guaraná.', price: 22, available: true },
          { id: 'acai-granola', name: 'Açaí com granola', description: 'Banana, granola e mel à parte.', price: 29, available: true },
        ],
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class EstablishmentService {
  private readonly entries = signal<Establishment[]>(this.readEntries());
  private readonly viewer = signal<ViewerLocation | null>(null);

  readonly establishments = this.entries.asReadonly();
  readonly viewerLocation = this.viewer.asReadonly();

  getAll(): Establishment[] {
    return this.entries();
  }

  getBySlug(slug: string): Establishment | undefined {
    return this.entries().find((entry) => entry.slug === slug);
  }

  getDistanceKm(entry: Establishment): number | null {
    const viewer = this.viewer();
    return viewer ? this.distanceBetween(viewer.latitude, viewer.longitude, entry.latitude, entry.longitude) : null;
  }

  setViewerLocation(location: ViewerLocation | null): void {
    this.viewer.set(location);
  }

  save(entry: Establishment): void {
    const entries = this.entries();
    const index = entries.findIndex((item) => item.id === entry.id);
    const next = index < 0 ? [...entries, entry] : entries.map((item) => (item.id === entry.id ? entry : item));
    this.entries.set(next);
    this.writeEntries(next);
  }

  createDemoEntry(data: Omit<Establishment, 'id'>): Establishment {
    const entry: Establishment = { ...data, id: `local-${Date.now()}` };
    this.save(entry);
    return entry;
  }

  createEmptyCategory(name: string): MenuCategory {
    return { id: `categoria-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, items: [] };
  }

  isOpenNow(entry: Establishment, at = new Date()): boolean {
    if (entry.temporarilyClosed) return false;

    const dayKey = WEEKDAY_KEYS[at.getDay()];
    const today = entry.hours[dayKey] ?? [];
    const currentMinutes = at.getHours() * 60 + at.getMinutes();
    if (today.some((period) => this.isInsidePeriod(currentMinutes, period.opens, period.closes))) return true;

    const previousDay = WEEKDAY_KEYS[(at.getDay() + 6) % 7];
    return (entry.hours[previousDay] ?? []).some((period) => {
      const opens = this.toMinutes(period.opens);
      const closes = this.toMinutes(period.closes);
      return closes <= opens && currentMinutes < closes;
    });
  }

  private readEntries(): Establishment[] {
    if (typeof window === 'undefined') return SAMPLE_ESTABLISHMENTS;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return SAMPLE_ESTABLISHMENTS;
      const parsed = JSON.parse(saved) as Establishment[];
      return Array.isArray(parsed) && parsed.length ? parsed : SAMPLE_ESTABLISHMENTS;
    } catch {
      return SAMPLE_ESTABLISHMENTS;
    }
  }

  private writeEntries(entries: Establishment[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // The preview still works for the current session when browser storage is unavailable.
    }
  }

  private distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(lat2 - lat1);
    const longitudeDelta = radians(lon2 - lon1);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private isInsidePeriod(current: number, opens: string, closes: string): boolean {
    const start = this.toMinutes(opens);
    const end = this.toMinutes(closes);
    return end <= start ? current >= start || current < end : current >= start && current < end;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

@Injectable({ providedIn: 'root' })
export class DemoSessionService {
  private activeSlug: string | null = null;

  signIn(slug: string): void {
    this.activeSlug = slug;
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_KEY, slug);
  }

  signOut(): void {
    this.activeSlug = null;
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(SESSION_KEY);
  }

  getActiveSlug(): string | null {
    if (this.activeSlug) return this.activeSlug;
    if (typeof window === 'undefined') return null;
    this.activeSlug = window.sessionStorage.getItem(SESSION_KEY);
    return this.activeSlug;
  }
}
