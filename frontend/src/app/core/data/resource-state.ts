import { Signal } from '@angular/core';

import { SourceMeta } from '../../models/api';

export type ResourceStage = 'loading' | 'refreshing' | 'ready' | 'empty' | 'unavailable';

export interface ResourceState<T> {
  stage: ResourceStage;
  data: T | null;
  source: SourceMeta | null;
  error: string | null;
  updatedAt: number | string | null;
  hasData: boolean;
  isEmpty: boolean;
}

export interface DashboardResource<T> {
  state: Signal<ResourceState<T>>;
  data: Signal<T | null>;
  source: Signal<SourceMeta | null>;
  error: Signal<string | null>;
  isLoading: Signal<boolean>;
  isRefreshing: Signal<boolean>;
  isEmpty: Signal<boolean>;
  isUnavailable: Signal<boolean>;
  hasData: Signal<boolean>;
  refresh: () => void;
}
