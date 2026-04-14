import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { IssuesResponse, IssuesSummary } from '../../models/api';

@Injectable({ providedIn: 'root' })
export class CommandCenterApiService {
  private readonly http = inject(HttpClient);

  getIssuesSummary(): Observable<IssuesSummary> {
    return this.http.get<IssuesResponse>('/api/issues').pipe(
      map((response) => ({
        total: response.total,
        urgent: response.urgent.length,
        active: response.active.length,
        deferred: response.deferred.length,
        updatedAt: response.updatedAt,
        source: response.source,
      }))
    );
  }
}
