import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, lockClosedOutline } from 'ionicons/icons';

import { ApiError, ApiService } from '../services/api.service';
import { EstablishmentService } from '../services/establishment.service';

@Component({
  selector: 'app-restaurant-login',
  templateUrl: './restaurant-login.page.html',
  styleUrls: ['./admin-shared.scss', './restaurant-login.page.scss'],
  imports: [FormsModule, RouterLink, IonRouterLinkWithHref, IonContent, IonButton, IonIcon],
})
export class RestaurantLoginPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly entries = inject(EstablishmentService);

  protected email = '';
  protected password = '';
  protected errorMessage = '';
  protected confirmationNotice = '';
  protected submitting = false;

  constructor() {
    addIcons({ arrowForwardOutline, lockClosedOutline });
    if (this.route.snapshot.queryParamMap.has('confirmacao')) {
      this.confirmationNotice = 'E-mail confirmado. Entre com sua conta para concluir o cadastro do estabelecimento.';
    }
  }

  protected async signIn(): Promise<void> {
    if (!this.email.includes('@') || this.password.length < 6) {
      this.errorMessage = 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.';
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    try {
      await this.api.signIn(this.email.trim(), this.password);
      try {
        await this.entries.getMine();
        await this.router.navigateByUrl('/gestao');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          await this.router.navigateByUrl('/gestao/cadastro?perfil=1');
        } else {
          throw error;
        }
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.';
    } finally {
      this.submitting = false;
    }
  }
}
