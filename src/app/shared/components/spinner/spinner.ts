import { Component } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    @if (loadingService.loading()) {
      <div class="spinner-overlay" role="status">
        <div class="spinner-blocker" (click)="$event.stopPropagation()">
          <div class="spinner"></div>
        </div>
      </div>
    }
  `,
  styleUrl: './spinner.scss'
})
export class SpinnerComponent {
  constructor(public loadingService: LoadingService) {}
}