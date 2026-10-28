import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, arrowForwardOutline, checkmarkOutline, closeOutline, removeOutline } from 'ionicons/icons';

import type { Establishment, MenuCategory, MenuItem, OpeningPeriod } from '../models/establishment';
import { ApiService } from '../services/api.service';
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

@Component({
  selector: 'app-restaurant-signup',
  templateUrl: './restaurant-signup.page.html',
  styleUrls: ['./admin-shared.scss', './restaurant-signup.page.scss'],
  imports: [FormsModule, RouterLink, IonRouterLinkWithHref, IonContent, IonButton, IonIcon],
})
export class RestaurantSignupPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly data = inject(EstablishmentService);

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
  protected submitting = false;
  private draft: Establishment | null = null;

  constructor() {
    addIcons({ addOutline, arrowForwardOutline, checkmarkOutline, closeOutline, removeOutline });
    if (this.route.snapshot.queryParamMap.get('perfil') === '1') this.step = 3;
  }

  protected async continueAccount(): Promise<void> {
    this.errorMessage = '';
    if (!this.email.includes('@') || this.password.length < 8) {
      this.errorMessage = 'Informe um e-mail válido e uma senha com pelo menos 8 caracteres.';
      return;
    }
    this.submitting = true;
    try {
      const result = await this.api.signUp(this.email.trim(), this.password);
      this.step = result.emailConfirmationRequired ? 2 : 3;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível criar a conta.';
    } finally {
      this.submitting = false;
    }
  }

  protected goToSignIn(): void {
    void this.router.navigateByUrl('/gestao/entrar?confirmacao=1');
  }

  protected toggleCuisine(cuisine: string): void {
    this.cuisines = this.cuisines.includes(cuisine)
      ? this.cuisines.filter((item) => item !== cuisine)
      : [...this.cuisines, cuisine];
  }

  protected async continueProfile(): Promise<void> {
    this.errorMessage = '';
    if (!this.name.trim() || !this.city.trim() || !this.address.trim() || this.cuisines.length === 0) {
      this.errorMessage = 'Preencha o nome, o tipo de comida, a cidade e o endereço.';
      return;
    }
    const hours: Record<string, OpeningPeriod[]> = Object.fromEntries(
      DAYS.map(([key]) => [key, [{ opens: this.openTime, closes: this.closeTime }]]),
    );
    this.submitting = true;
    try {
      this.draft = await this.data.create({
        name: this.name.trim(),
        cuisines: [...this.cuisines],
        address: this.address.trim(),
        neighborhood: this.neighborhood.trim() || this.city.trim(),
        city: this.city.trim(),
        phone: this.phone.trim() || undefined,
        whatsapp: this.whatsapp.replace(/\D/g, '') || undefined,
        description: this.description.trim() || undefined,
        image: this.image.trim() || undefined,
        latitude: null,
        longitude: null,
        hours,
      });
      this.step = 4;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível salvar o perfil.';
    } finally {
      this.submitting = false;
    }
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
      id: crypto.randomUUID(),
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

  protected async publish(): Promise<void> {
    this.errorMessage = '';
    if (!this.draft) {
      this.errorMessage = 'Salve o perfil antes de publicar o cardápio.';
      return;
    }
    const hasMenuItem = this.categories.some((category) => category.items.length > 0);
    if (!this.categories.length || !hasMenuItem) {
      this.errorMessage = 'Adicione ao menos uma categoria com um item antes de publicar.';
      return;
    }

    this.submitting = true;
    try {
      await this.data.saveMenu(this.categories);
      await this.data.publish(true);
      await this.router.navigateByUrl('/gestao');
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível publicar o cardápio.';
    } finally {
      this.submitting = false;
    }
  }
}
