import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowDownOutline,
  arrowForwardOutline,
  arrowUpOutline,
  checkmarkOutline,
  eyeOutline,
  logOutOutline,
  removeOutline,
  trashOutline,
} from 'ionicons/icons';

import type { Establishment, MenuItem, OpeningPeriod } from '../models/establishment';
import { ApiError, ApiService } from '../services/api.service';
import { EstablishmentService } from '../services/establishment.service';

const DAYS = [
  ['mon', 'Segunda'],
  ['tue', 'Terça'],
  ['wed', 'Quarta'],
  ['thu', 'Quinta'],
  ['fri', 'Sexta'],
  ['sat', 'Sábado'],
  ['sun', 'Domingo'],
] as const;

const copyEntry = (entry: Establishment): Establishment => JSON.parse(JSON.stringify(entry)) as Establishment;

@Component({
  selector: 'app-restaurant-dashboard',
  templateUrl: './restaurant-dashboard.page.html',
  styleUrls: ['./admin-shared.scss', './restaurant-dashboard.page.scss'],
  imports: [FormsModule, RouterLink, IonRouterLinkWithHref, IonContent, IonButton, IonIcon],
})
export class RestaurantDashboardPage implements OnInit {
  private readonly router = inject(Router);
  private readonly entries = inject(EstablishmentService);
  private readonly api = inject(ApiService);
  private menuSaveChain: Promise<void> = Promise.resolve();

  protected readonly days = DAYS;
  protected draft: Establishment | null = null;
  protected section: 'profile' | 'menu' = 'profile';
  protected cuisineText = '';
  protected newCategoryName = '';
  protected newItemCategoryId = '';
  protected newItemName = '';
  protected newItemDescription = '';
  protected newItemPrice: number | null = null;
  protected savedMessage = '';
  protected loadError = '';

  constructor() {
    addIcons({
      addOutline,
      arrowDownOutline,
      arrowForwardOutline,
      arrowUpOutline,
      checkmarkOutline,
      eyeOutline,
      logOutOutline,
      removeOutline,
      trashOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const entry = await this.entries.getMine();
      this.draft = copyEntry(entry);
      this.cuisineText = entry.cuisines.join(', ');
      this.newItemCategoryId = entry.categories[0]?.id ?? '';
      this.ensureHours();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        void this.router.navigateByUrl('/gestao/entrar');
      } else if (error instanceof ApiError && error.status === 404) {
        void this.router.navigateByUrl('/gestao/cadastro?perfil=1');
      } else {
        this.loadError = error instanceof Error ? error.message : 'Não foi possível carregar a gestão.';
      }
    }
  }

  protected saveProfile(): void {
    if (!this.draft) return;
    this.draft.cuisines = this.cuisineText.split(',').map((cuisine) => cuisine.trim()).filter(Boolean);
    this.persistProfile('Perfil atualizado e salvo no Supabase.');
  }

  protected saveMenu(): void {
    this.persistMenu('Cardápio atualizado e salvo no Supabase.');
  }

  protected toggleClosed(): void {
    if (!this.draft) return;
    this.draft.temporarilyClosed = !this.draft.temporarilyClosed;
    this.persistProfile(this.draft.temporarilyClosed ? 'Estabelecimento marcado como fechado.' : 'Estabelecimento marcado como aberto conforme os horários.');
  }

  protected async togglePublished(): Promise<void> {
    if (!this.draft) return;
    try {
      this.draft.published = await this.entries.publish(!this.draft.published);
      this.showSavedMessage(this.draft.published ? 'Página publicada no catálogo.' : 'Página retirada do catálogo.');
    } catch (error) {
      this.showSavedMessage(error instanceof Error ? error.message : 'Não foi possível alterar a publicação.');
    }
  }

  protected addCategory(): void {
    if (!this.draft) return;
    const name = this.newCategoryName.trim();
    if (!name || this.draft.categories.some((category) => category.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return;
    const category = this.entries.createEmptyCategory(name);
    this.draft.categories = [...this.draft.categories, category];
    this.newCategoryName = '';
    this.newItemCategoryId = category.id;
    this.saveMenu();
  }

  protected removeCategory(categoryId: string): void {
    if (!this.draft) return;
    this.draft.categories = this.draft.categories.filter((category) => category.id !== categoryId);
    if (this.newItemCategoryId === categoryId) this.newItemCategoryId = this.draft.categories[0]?.id ?? '';
    this.saveMenu();
  }

  protected moveCategory(index: number, offset: number): void {
    if (!this.draft) return;
    const target = index + offset;
    if (target < 0 || target >= this.draft.categories.length) return;
    const next = [...this.draft.categories];
    [next[index], next[target]] = [next[target], next[index]];
    this.draft.categories = next;
    this.saveMenu();
  }

  protected addItem(): void {
    if (!this.draft) return;
    const category = this.draft.categories.find((item) => item.id === this.newItemCategoryId);
    if (!category || !this.newItemName.trim() || this.newItemPrice === null || this.newItemPrice < 0) return;
    const item: MenuItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: this.newItemName.trim(),
      description: this.newItemDescription.trim() || undefined,
      price: Number(this.newItemPrice),
      available: true,
    };
    this.draft.categories = this.draft.categories.map((current) => current.id === category.id
      ? { ...current, items: [...current.items, item] }
      : current);
    this.newItemName = '';
    this.newItemDescription = '';
    this.newItemPrice = null;
    this.saveMenu();
  }

  protected removeItem(categoryId: string, itemId: string): void {
    if (!this.draft) return;
    this.draft.categories = this.draft.categories.map((category) => category.id === categoryId
      ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
      : category);
    this.saveMenu();
  }

  protected toggleItem(item: MenuItem): void {
    item.available = !item.available;
    this.saveMenu();
  }

  protected moveItem(categoryId: string, index: number, offset: number): void {
    if (!this.draft) return;
    const category = this.draft.categories.find((item) => item.id === categoryId);
    if (!category) return;
    const target = index + offset;
    if (target < 0 || target >= category.items.length) return;
    const items = [...category.items];
    [items[index], items[target]] = [items[target], items[index]];
    this.draft.categories = this.draft.categories.map((item) => item.id === categoryId ? { ...item, items } : item);
    this.saveMenu();
  }

  protected async signOut(): Promise<void> {
    await this.api.signOut();
    await this.router.navigateByUrl('/home');
  }

  private persistProfile(message: string): void {
    if (!this.draft) return;
    void this.entries.saveProfile(copyEntry(this.draft)).then(() => this.showSavedMessage(message)).catch((error: unknown) => {
      this.showSavedMessage(error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    });
  }

  private persistMenu(message: string): void {
    if (!this.draft) return;
    const categories = copyEntry(this.draft).categories;
    this.menuSaveChain = this.menuSaveChain.then(async () => {
      await this.entries.saveMenu(categories);
      this.showSavedMessage(message);
    }).catch((error: unknown) => {
      this.showSavedMessage(error instanceof Error ? error.message : 'Não foi possível salvar o cardápio.');
    });
  }

  private showSavedMessage(message: string): void {
    this.savedMessage = message;
    window.setTimeout(() => {
      if (this.savedMessage === message) this.savedMessage = '';
    }, 3200);
  }

  private ensureHours(): void {
    if (!this.draft) return;
    for (const [key] of DAYS) {
      const periods = this.draft.hours[key] ?? [];
      this.draft.hours[key] = periods.length ? periods : [{ opens: '09:00', closes: '18:00' } satisfies OpeningPeriod];
    }
  }
}
