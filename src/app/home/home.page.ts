import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonRouterLinkWithHref,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, locationOutline, navigateOutline, searchOutline, timeOutline } from 'ionicons/icons';
import { RouterLink } from '@angular/router';

import type { Establishment } from '../models/establishment';
import { EstablishmentService } from '../services/establishment.service';

type LocationState = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    FormsModule,
    RouterLink,
    IonRouterLinkWithHref,
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonIcon,
  ],
})
export class HomePage implements OnInit {
  private readonly data = inject(EstablishmentService);
  private readonly entries = this.data.establishments;

  protected readonly query = signal('');
  protected readonly selectedCuisine = signal('Tudo');
  protected readonly locationState = signal<LocationState>('idle');
  protected readonly locationMessage = signal('');
  protected readonly catalogError = signal('');
  protected readonly cuisines = computed(() => ['Tudo', ...new Set(this.entries().flatMap((item) => item.cuisines))]);
  protected readonly results = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    const cuisine = this.selectedCuisine();
    const matches = this.entries().filter((entry) => {
      const cuisineMatch = cuisine === 'Tudo' || entry.cuisines.includes(cuisine);
      if (!cuisineMatch) return false;
      if (!term) return true;
      const fields = [
        entry.name,
        entry.city,
        entry.neighborhood,
        ...entry.cuisines,
        ...entry.categories.flatMap((category) => [category.name, ...category.items.map((item) => item.name)]),
      ];
      return fields.some((field) => field.toLocaleLowerCase('pt-BR').includes(term));
    });

    return matches.sort((a, b) => {
      if (term) {
        const scoreDifference = this.searchScore(b, term) - this.searchScore(a, term);
        if (scoreDifference !== 0) return scoreDifference;
      }
      const aDistance = this.data.getDistanceKm(a);
      const bDistance = this.data.getDistanceKm(b);
      if (aDistance !== null && bDistance !== null && aDistance !== bDistance) return aDistance - bDistance;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  });

  constructor() {
    addIcons({ arrowForwardOutline, locationOutline, navigateOutline, searchOutline, timeOutline });
  }

  ngOnInit(): void {
    void this.loadCatalog();
  }

  protected async loadCatalog(): Promise<void> {
    this.catalogError.set('');
    try {
      await this.data.loadCatalog();
    } catch {
      this.catalogError.set('Não foi possível carregar os cardápios. Confira se a API está iniciada e tente novamente.');
    }
  }

  protected search(value: string): void {
    this.query.set(value);
  }

  protected selectCuisine(cuisine: string): void {
    this.selectedCuisine.set(cuisine);
  }

  protected useLocation(): void {
    if (!navigator.geolocation) {
      this.locationState.set('unavailable');
      this.locationMessage.set('Este navegador não oferece localização. Busque por bairro, cidade ou prato.');
      return;
    }

    this.locationState.set('loading');
    this.locationMessage.set('Encontrando estabelecimentos perto de você…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.data.setViewerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        this.locationState.set('ready');
        this.locationMessage.set('Os estabelecimentos agora aparecem por distância.');
      },
      () => {
        this.locationState.set('denied');
        this.locationMessage.set('Sem acesso à localização. Você ainda pode buscar por nome, bairro, cidade ou prato.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  protected openNow(entry: Establishment): boolean {
    return this.data.isOpenNow(entry);
  }

  protected distanceLabel(entry: Establishment): string | null {
    const distance = this.data.getDistanceKm(entry);
    return distance === null ? null : `${distance < 10 ? distance.toFixed(1).replace('.', ',') : Math.round(distance)} km`;
  }

  private searchScore(entry: Establishment, term: string): number {
    const name = entry.name.toLocaleLowerCase('pt-BR');
    const cuisines = entry.cuisines.join(' ').toLocaleLowerCase('pt-BR');
    const location = `${entry.neighborhood} ${entry.city}`.toLocaleLowerCase('pt-BR');
    const dishes = entry.categories.flatMap((category) => [category.name, ...category.items.map((item) => item.name)]).join(' ').toLocaleLowerCase('pt-BR');
    return (name.startsWith(term) ? 8 : name.includes(term) ? 6 : 0) +
      (cuisines.includes(term) ? 4 : 0) +
      (location.includes(term) ? 3 : 0) +
      (dishes.includes(term) ? 2 : 0);
  }
}
