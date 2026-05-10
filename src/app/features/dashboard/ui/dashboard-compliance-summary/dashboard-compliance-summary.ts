import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserScopeService } from '../../../../core/auth/services/user-scope.service';
import { CalibrationPlansService } from '../../../calibration-plans/data-access/calibration-plans.service';
import { CalibrationPlanItemsService } from '../../../calibration-plans/data-access/calibration-plan-items.service';

import {
  CalibrationPlan,
  CalibrationPlanItem,
  CalibrationPlanItemStatus
} from '../../../calibration-plans/domain/calibration-plan.model';

interface ComplianceKpi {
  title: string;
  value: number | string;
  description: string;
  icon: string;
  tone: 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'purple';
}

interface PmseComplianceSummary {
  pmseCompanyId: number;
  pmseCompanyName: string;
  totalItems: number;
  eligibleItems: number;
  completedItems: number;
  notCompletedItems: number;
  futurePendingItems: number;
  completionRate: number;
}

interface ComplianceSummary {
  totalItems: number;
  eligibleItems: number;
  completedItems: number;
  notCompletedItems: number;
  futurePendingItems: number;
  completionRate: number;
}

@Component({
  selector: 'app-dashboard-compliance-summary',
  standalone: true,
  imports: [
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard-compliance-summary.html',
  styleUrl: './dashboard-compliance-summary.scss'
})
export class DashboardComplianceSummaryComponent implements OnInit {
  private readonly plansService = inject(CalibrationPlansService);
  private readonly planItemsService = inject(CalibrationPlanItemsService);
  private readonly userScope = inject(UserScopeService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly plan = signal<CalibrationPlan | null>(null);
  readonly items = signal<CalibrationPlanItem[]>([]);

  readonly isCenaceUser = this.userScope.isCenaceUser;
  readonly isPmseUser = this.userScope.isPmseUser;
  readonly pmseCompanyName = this.userScope.pmseCompanyName;

  readonly summary = computed<ComplianceSummary>(() => {
    return this.buildSummary(this.items());
  });

  readonly kpis = computed<ComplianceKpi[]>(() => {
    const summary = this.summary();

    return [
      {
        title: 'Total ítems',
        value: summary.totalItems,
        description: 'Plan anual incluido en el periodo',
        icon: 'inventory_2',
        tone: 'neutral'
      },
      {
        title: 'Ítems exigibles',
        value: summary.eligibleItems,
        description: 'No incluye pendientes futuros',
        icon: 'event_available',
        tone: 'info'
      },
      {
        title: 'Cumplidos',
        value: summary.completedItems,
        description: `${summary.completionRate.toFixed(2)}% cumplimiento`,
        icon: 'task_alt',
        tone: 'success'
      },
      {
        title: 'No cumplidos',
        value: summary.notCompletedItems,
        description: 'Ítems vencidos sin cumplimiento',
        icon: 'warning',
        tone: 'danger'
      },
      {
        title: 'Pendientes por ejecutar',
        value: summary.futurePendingItems,
        description: 'Fechas futuras no vencidas',
        icon: 'pending_actions',
        tone: 'purple'
      }
    ];
  });

  readonly pmseSummaries = computed<PmseComplianceSummary[]>(() => {
    const groups = new Map<number, CalibrationPlanItem[]>();

    for (const item of this.items()) {
      if (!groups.has(item.pmseCompanyId)) {
        groups.set(item.pmseCompanyId, []);
      }

      groups.get(item.pmseCompanyId)!.push(item);
    }

    return [...groups.entries()]
      .map(([pmseCompanyId, items]) => {
        const summary = this.buildSummary(items);

        return {
          pmseCompanyId,
          pmseCompanyName: items[0]?.pmseCompanyName ?? 'PMSE sin nombre',
          totalItems: summary.totalItems,
          eligibleItems: summary.eligibleItems,
          completedItems: summary.completedItems,
          notCompletedItems: summary.notCompletedItems,
          futurePendingItems: summary.futurePendingItems,
          completionRate: summary.completionRate
        };
      })
      .sort((a, b) => {
        if (a.completionRate !== b.completionRate) {
          return a.completionRate - b.completionRate;
        }

        return b.notCompletedItems - a.notCompletedItems;
      });
  });

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.plansService.getAll({
      page: 1,
      take: 1,
      orderBy: 'Year desc'
    }).subscribe({
      next: response => {
        const currentPlan = response.result?.[0] ?? null;

        this.plan.set(currentPlan);

        if (!currentPlan) {
          this.items.set([]);
          this.isLoading.set(false);
          return;
        }

        this.loadItems(currentPlan.id);
      },
      error: () => {
        this.plan.set(null);
        this.items.set([]);
        this.errorMessage.set('No se pudo cargar el plan anual vigente.');
        this.isLoading.set(false);
      }
    });
  }

  private loadItems(calibrationPlanId: number): void {
    const planFilter = `CalibrationPlanId eq ${calibrationPlanId}`;
    const pmseFilter = this.userScope.getPmseFilter('PmseCompanyId');

    const filter = [planFilter, pmseFilter]
      .filter(Boolean)
      .map(value => `(${value})`)
      .join(' and ');

    this.planItemsService.getAll({
      page: 1,
      take: 5000,
      filter,
      orderBy: 'PmseCompanyName asc, PlannedEndDate asc'
    }).subscribe({
      next: response => {
        this.items.set(response.succeed ? response.result ?? [] : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.errorMessage.set('No se pudieron cargar los ítems del plan anual.');
        this.isLoading.set(false);
      }
    });
  }

  private buildSummary(items: CalibrationPlanItem[]): ComplianceSummary {
    const totalItems = items.length;

    const eligibleItems = items.filter(item => this.isEligibleItem(item)).length;
    const completedItems = items.filter(item =>
      this.isEligibleItem(item) &&
      Number(item.itemStatus) === CalibrationPlanItemStatus.Approved
    ).length;

    const notCompletedItems = Math.max(eligibleItems - completedItems, 0);
    const futurePendingItems = Math.max(totalItems - eligibleItems, 0);

    const completionRate =
      eligibleItems > 0
        ? (completedItems / eligibleItems) * 100
        : 0;

    return {
      totalItems,
      eligibleItems,
      completedItems,
      notCompletedItems,
      futurePendingItems,
      completionRate
    };
  }

  private isEligibleItem(item: CalibrationPlanItem): boolean {
    if (Number(item.itemStatus) === CalibrationPlanItemStatus.Approved) {
      return true;
    }

    const plannedEndDate = this.parseDateOnly(item.plannedEndDate);

    if (!plannedEndDate) {
      return false;
    }

    return plannedEndDate <= this.today();
  }

  private parseDateOnly(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value.substring(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private today(): Date {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }
}