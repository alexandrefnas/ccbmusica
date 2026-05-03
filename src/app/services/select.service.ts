import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectService {
  private openSelectSource = new Subject<any>();
  openSelect$ = this.openSelectSource.asObservable();

  notifyOpen(select: any) {
    this.openSelectSource.next(select);
  }
}