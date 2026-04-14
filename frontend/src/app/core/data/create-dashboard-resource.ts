import { computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, timer } from 'rxjs';

import { ApiEnvelope, SourceMeta } from '../../models/api';
import { DashboardResource, ResourceState } from './resource-state';

interface CreateDashboardResourceConfig<TResponse extends ApiEnvelope, TData> {
  load: () => Observable<TResponse>;
  selectData: (response: TResponse) => TData;
  isEmpty?: (data: TData, response: TResponse) => boolean;
  intervalMs: number;
}

function defaultIsEmpty(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (data && typeof data === 'object' && 'total' in data && typeof data.total === 'number') {
    return data.total === 0;
  }
  return data == null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.error || error.message || 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

function getErrorSource(error: unknown, fallback: SourceMeta | null): SourceMeta | null {
  if (error instanceof HttpErrorResponse) {
    return error.error?.source || fallback;
  }
  return fallback;
}

export function createDashboardResource<TResponse extends ApiEnvelope, TData>(
  config: CreateDashboardResourceConfig<TResponse, TData>
): DashboardResource<TData> {
  const state = signal<ResourceState<TData>>({
    stage: 'loading',
    data: null,
    source: null,
    error: null,
    updatedAt: null,
    hasData: false,
    isEmpty: false,
  });

  let inFlight = false;

  const runLoad = () => {
    if (inFlight) return;

    inFlight = true;
    const previous = state();

    state.set({
      ...previous,
      stage: previous.hasData || previous.isEmpty ? 'refreshing' : 'loading',
    });

    config.load().subscribe({
      next: (response) => {
        const data = config.selectData(response);
        const isEmpty = config.isEmpty ? config.isEmpty(data, response) : defaultIsEmpty(data);
        const updatedAt = response.updatedAt ?? response.source.updatedAt ?? null;
        const preserveExisting = !response.ok && previous.hasData;

        state.set({
          stage: response.ok
            ? (isEmpty ? 'empty' : 'ready')
            : previous.isEmpty
              ? 'empty'
              : preserveExisting
                ? 'ready'
                : 'unavailable',
          data: response.ok ? data : preserveExisting ? previous.data : null,
          source: response.source,
          error: response.ok ? response.source.error || null : response.error || response.source.error || 'Request failed',
          updatedAt: response.ok ? updatedAt : preserveExisting ? previous.updatedAt : updatedAt,
          hasData: response.ok ? !isEmpty : preserveExisting,
          isEmpty: response.ok ? isEmpty : previous.isEmpty,
        });
      },
      error: (error: unknown) => {
        const source = getErrorSource(error, previous.source);
        const message = getErrorMessage(error);

        state.set({
          stage: previous.isEmpty ? 'empty' : previous.hasData ? 'ready' : 'unavailable',
          data: previous.data,
          source,
          error: message,
          updatedAt: previous.updatedAt,
          hasData: previous.hasData,
          isEmpty: previous.isEmpty,
        });
        inFlight = false;
      },
      complete: () => {
        inFlight = false;
      },
    });
  };

  timer(0, config.intervalMs).subscribe(() => runLoad());

  return {
    state: state.asReadonly(),
    data: computed(() => state().data),
    source: computed(() => state().source),
    error: computed(() => state().error),
    isLoading: computed(() => state().stage === 'loading'),
    isRefreshing: computed(() => state().stage === 'refreshing'),
    isEmpty: computed(() => state().stage === 'empty'),
    isUnavailable: computed(() => state().stage === 'unavailable'),
    hasData: computed(() => state().hasData),
    refresh: () => runLoad(),
  };
}
