import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonRouterLinkWithHref,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  callOutline,
  locationOutline,
  navigateOutline,
  timeOutline,
} from 'ionicons/icons';

import type { Establishment } from '../models/establishment';
import { EstablishmentService } from '../services/establishment.service';

@Component({
  selector: 'app-establishment-detail',
  templateUrl: './establishment-detail.page.html',
  styleUrls: ['./establishment-detail.page.scss'],
  imports: [RouterLink, IonRouterLinkWithHref, IonHeader, IonToolbar, IonContent, IonButton, IonIcon],
})
export class EstablishmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(EstablishmentService);

  protected readonly entry = signal<Establishment | undefined>(undefined);
  protected readonly loading = signal(true);
  protected readonly activeCategory = signal('');

  constructor() {
    addIcons({ arrowBackOutline, arrowForwardOutline, callOutline, locationOutline, navigateOutline, timeOutline });
    this.route.paramMap.subscribe((params) => {
      this.loading.set(true);
      void this.data.getBySlug(params.get('slug') ?? '').then((entry) => {
        this.entry.set(entry);
        this.activeCategory.set(entry.categories[0]?.id ?? '');
      }).catch(() => {
        this.entry.set(undefined);
      }).finally(() => this.loading.set(false));
    });
  }

  protected openNow(entry: Establishment): boolean {
    return this.data.isOpenNow(entry);
  }

  protected selectCategory(id: string): void {
    this.activeCategory.set(id);
    document.getElementById(`menu-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected mapUrl(entry: Establishment): string {
    const destination = `${entry.address}, ${entry.neighborhood}, ${entry.city}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }

  protected phoneUrl(entry: Establishment): string | null {
    return entry.phone ? `tel:${entry.phone}` : null;
  }

  protected whatsappUrl(entry: Establishment): string | null {
    return entry.whatsapp ? `https://wa.me/${entry.whatsapp.replace(/\D/g, '')}` : null;
  }

  protected price(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
