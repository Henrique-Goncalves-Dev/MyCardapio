import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, arrowForwardOutline, checkmarkOutline, closeOutline, removeOutline } from 'ionicons/icons';

import type { MenuCategory, MenuItem, OpeningPeriod } from '../models/establishment';
import { DemoSessionService, EstablishmentService } from '../services/establishment.service';

const DAYS = [
  ['mon', 'Segunda'],
  ['tue', 'Terça'],
  ['wed', 'Quarta'],
  ['thu', 'Quinta'],
  ['fri', 'Sexta'],
  ['sat', 'Sábado'],
  ['sun', 'Domingo'],
] as const;

@Component({
  selector: 'app-restaurant-signup',
  templateUrl: './restaurant-signup.page.html',
  styleUrls: ['./admin-shared.scss', './restaurant-signup.page.scss'],
  imports: [FormsModule, RouterLink, IonRouterLinkWithHref, IonContent, IonButton, IonIcon],
})
export class RestaurantSignupPage {
  private readonly router = inject(Router);
  private readonly data = inject(EstablishmentService);
  private readonly session = inject(DemoSessionService);

  protected readonly days = DAYS;
  protected readonly cuisineOptions = [
    'Nordestina',
    'Brasileira',
    'Frutos do mar',
    'Café',
    'Confeitaria',
    'Açaí',
    'Sobremesas',
    'Italiana',
    'Asiática',
    'Outro',
  ];
  protected step = 1;
  protected email = '';
  protected password = '';
  protected name = '';
  protected city = 'Fortaleza';
  protected neighborhood = '';
  protected address = '';
  protected phone = '';
  protected whatsapp = '';
  protected description = '';
  protected image = '';
  protected cuisines: string[] = [];
  protected openTime = '09:00';
  protected closeTime = '22:00';
  protected categories: MenuCategory[] = [];
  protected newCategoryName = 'Pratos executivos';
  protected selectedCategoryId = '';
  protected newItemName = '';
  protected newItemDescription = '';
  protected newItemPrice: number | null = null;
  protected errorMessage = '';

  constructor() {
    addIcons({ addOutline, arrowForwardOutline, checkmarkOutline, closeOutline, removeOutline });
  }

  protected continueAccount(): void {
    this.errorMessage = '';
    if (!this.email.includes('@') || this.password.length < 6) {
      this.errorMessage = 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.';
      return;
    }
    this.step = 2;
  }

  protected confirmDemoEmail(): void {
    this.step = 3;
    this.errorMessage = '';
  }

  protected toggleCuisine(cuisine: string): void {
    this.cuisines = this.cuisines.includes(cuisine)
      ? this.cuisines.filter((item) => item !== cuisine)
      : [...this.cuisines, cuisine];
  }

  protected continueProfile(): void {
    this.errorMessage = '';
    if (!this.name.trim() || !this.city.trim() || !this.address.trim() || this.cuisines.length === 0) {
      this.errorMessage = 'Preencha o nome, o tipo de comida, a cidade e o endereço.';
      return;
    }
    this.step = 4;
  }

  protected addCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name || this.categories.some((category) => category.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return;
    const category = this.data.createEmptyCategory(name);
    this.categories = [...this.categories, category];
    this.selectedCategoryId = category.id;
    this.newCategoryName = '';
  }

  protected removeCategory(id: string): void {
    this.categories = this.categories.filter((category) => category.id !== id);
    if (this.selectedCategoryId === id) this.selectedCategoryId = this.categories[0]?.id ?? '';
  }

  protected addItem(): void {
    this.errorMessage = '';
    const category = this.categories.find((item) => item.id === this.selectedCategoryId);
    if (!category || !this.newItemName.trim() || this.newItemPrice === null || this.newItemPrice < 0) {
      this.errorMessage = 'Escolha uma categoria e informe nome e preço do item.';
      return;
    }
    const item: MenuItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: this.newItemName.trim(),
      description: this.newItemDescription.trim() || undefined,
      price: Number(this.newItemPrice),
      available: true,
    };
    this.categories = this.categories.map((current) => current.id === category.id ? { ...current, items: [...current.items, item] } : current);
    this.newItemName = '';
    this.newItemDescription = '';
    this.newItemPrice = null;
  }

  protected removeItem(categoryId: string, itemId: string): void {
    this.categories = this.categories.map((category) => category.id === categoryId
      ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
      : category);
  }

  protected publish(): void {
    const hasMenuItem = this.categories.some((category) => category.items.length > 0);
    if (!this.categories.length || !hasMenuItem) {
      this.errorMessage = 'Adicione ao menos uma categoria com um item antes de publicar.';
      return;
    }

    const slugBase = this.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const hours: Record<string, OpeningPeriod[]> = Object.fromEntries(
      DAYS.map(([key]) => [key, [{ opens: this.openTime, closes: this.closeTime }]]),
    );
    const entry = this.data.createDemoEntry({
      slug: `${slugBase || 'novo-estabelecimento'}-${Date.now().toString().slice(-4)}`,
      name: this.name.trim(),
      cuisines: [...this.cuisines],
      address: this.address.trim(),
      neighborhood: this.neighborhood.trim() || this.city.trim(),
      city: this.city.trim(),
      phone: this.phone.trim() || undefined,
      whatsapp: this.whatsapp.replace(/\D/g, '') || undefined,
      description: this.description.trim() || undefined,
      image: this.image.trim() || undefined,
      latitude: -3.7319,
      longitude: -38.5267,
      hours,
      categories: this.categories,
    });
    this.session.signIn(entry.slug);
    void this.router.navigateByUrl('/gestao');
  }
}
