import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, lockClosedOutline } from 'ionicons/icons';

import { DemoSessionService, EstablishmentService } from '../services/establishment.service';

@Component({
  selector: 'app-restaurant-login',
  templateUrl: './restaurant-login.page.html',
  styleUrls: ['./admin-shared.scss', './restaurant-login.page.scss'],
  imports: [FormsModule, RouterLink, IonRouterLinkWithHref, IonContent, IonButton, IonIcon],
})
export class RestaurantLoginPage {
  private readonly router = inject(Router);
  private readonly entries = inject(EstablishmentService);
  private readonly session = inject(DemoSessionService);

  protected email = '';
  protected password = '';
  protected errorMessage = '';

  constructor() {
    addIcons({ arrowForwardOutline, lockClosedOutline });
  }

  protected signIn(): void {
    if (!this.email.includes('@') || this.password.length < 6) {
      this.errorMessage = 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.';
      return;
    }
    const activeSlug = this.entries.getAll()[0]?.slug;
    if (!activeSlug) {
      this.errorMessage = 'Ainda não há um estabelecimento de demonstração.';
      return;
    }
    this.session.signIn(activeSlug);
    void this.router.navigateByUrl('/gestao');
  }

  protected enterDemo(): void {
    const first = this.entries.getAll()[0];
    if (!first) return;
    this.session.signIn(first.slug);
    void this.router.navigateByUrl('/gestao');
  }
}
