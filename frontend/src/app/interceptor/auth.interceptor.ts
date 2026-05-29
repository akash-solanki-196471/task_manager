import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private injector: Injector
  ) {}

  private get toastr(): ToastrService {
    return this.injector.get(ToastrService);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    let cloned = req;
    if (token) {
      cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';
        
        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          if (error.status === 401) {
            errorMessage = 'Invalid email or password.';
            if (!req.url.includes('/api/auth/login')) {
              errorMessage = 'Session expired. Please login again.';
              this.authService.logout();
              this.router.navigate(['/login']);
            }
          } else if (error.status === 403) {
            errorMessage = 'You do not have permission to perform this action.';
          } else if (error.status === 404) {
            errorMessage = 'Resource not found.';
          } else if (error.status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = error.error?.message || error.message || 'Unknown error occurred';
          }
        }
        
        // Don't show global toast for login and register requests, as those components handle presenting their own specific errors
        if (!req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/register')) {
          try {
            this.toastr.error(errorMessage, 'Error');
          } catch (toastrError) {
            console.error('Toastr notification failed:', toastrError);
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}