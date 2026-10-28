import { Injectable, signal } from '@angular/core';

import type { Establishment, MenuCategory, ViewerLocation } from '../models/establishment';
import { ApiService } from './api.service';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

@Injectable({ providedIn: 'root' })
export class EstablishmentService {
  private readonly entries = signal<Establishment[]>([]);
  private readonly viewer = signal<ViewerLocation | null>(null);

  readonly establishments = this.entries.asReadonly();
  readonly viewerLocation = this.viewer.asReadonly();

  constructor(private readonly api: ApiService) {}

  async loadCatalog(): Promise<void> {
    this.entries.set(await this.api.request<Establishment[]>('/api/establishments'));
  }

  async getBySlug(slug: string): Promise<Establishment> {
    return this.api.request<Establishment>(`/api/establishments/${encodeURIComponent(slug)}`);
  }

  async getMine(): Promise<Establishment> {
    return this.api.request<Establishment>('/api/me/establishment');
  }

  getAll(): Establishment[] {
    return this.entries();
  }

  getDistanceKm(entry: Establishment): number | null {
    const viewer = this.viewer();
    if (!viewer || entry.latitude === null || entry.longitude === null) return null;
    return this.distanceBetween(viewer.latitude, viewer.longitude, entry.latitude, entry.longitude);
  }

  setViewerLocation(location: ViewerLocation | null): void {
    this.viewer.set(location);
  }

  async create(data: Omit<Establishment, 'id' | 'slug' | 'categories'>): Promise<Establishment> {
    return this.api.request<Establishment>('/api/me/establishment', {
      method: 'POST',
      body: {
        name: data.name,
        cuisines: data.cuisines,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
        phone: data.phone ?? null,
        whatsapp: data.whatsapp ?? null,
        description: data.description ?? null,
        image: data.image ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        hours: data.hours,
      },
    });
  }

  async saveProfile(entry: Establishment): Promise<Establishment> {
    return this.api.request<Establishment>('/api/me/establishment', {
      method: 'PATCH',
      body: {
        name: entry.name,
        cuisines: entry.cuisines,
        address: entry.address,
        neighborhood: entry.neighborhood,
        city: entry.city,
        phone: entry.phone ?? null,
        whatsapp: entry.whatsapp ?? null,
        description: entry.description ?? null,
        image: entry.image ?? null,
        latitude: entry.latitude,
        longitude: entry.longitude,
        temporarily_closed: entry.temporarilyClosed ?? false,
        hours: entry.hours,
      },
    });
  }

  async saveMenu(categories: MenuCategory[]): Promise<Establishment> {
    return this.api.request<Establishment>('/api/me/menu', { method: 'PUT', body: { categories } });
  }

  async publish(published: boolean): Promise<boolean> {
    const result = await this.api.request<{ published: boolean }>(
      `/api/me/establishment/${published ? 'publish' : 'unpublish'}`, { method: 'POST' },
    );
    return result.published;
  }

  createEmptyCategory(name: string): MenuCategory {
    return { id: crypto.randomUUID(), name, items: [] };
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

  private distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(lat2 - lat1);
    const longitudeDelta = radians(lon2 - lon1);
    const a = Math.sin(latitudeDelta / 2) ** 2 +
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
