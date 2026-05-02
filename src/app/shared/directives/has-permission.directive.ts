import {
  Directive,
  Input,
  OnChanges,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';

import {
  PermissionCheckMode,
  PermissionRequirement
} from '../../core/auth/permissions/permission.model';

import { PermissionService } from '../../core/auth/permissions/permission.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnChanges {
  @Input('hasPermission')
  requirement: PermissionRequirement | PermissionRequirement[] | null = null;

  @Input()
  hasPermissionMode: PermissionCheckMode = 'all';

  private hasView = false;

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly permissionService: PermissionService
  ) {}

  ngOnChanges(): void {
    this.updateView();
  }

  private updateView(): void {
    const hasAccess = this.permissionService.hasPermission(
      this.requirement,
      this.hasPermissionMode
    );

    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}