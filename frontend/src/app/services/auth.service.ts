import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterCredentials, AuthResponse } from '../models/user.model';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  checkHealth(): Observable<any> {
    return this.http.get('/api/health');
  }

  private loadStoredUser(): void {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (userStr && token) {
        const user = JSON.parse(userStr);
        if (!this.jwtHelper.isTokenExpired(token)) {
          this.currentUserSubject.next(user);
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.error('Error loading stored user:', e);
      this.logout();
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify({
          _id: response._id,
          username: response.username,
          email: response.email,
          role: response.role
        }));
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next({
          _id: response._id,
          username: response.username,
          email: response.email,
          role: response.role,
          token: response.token
        });
      })
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, credentials).pipe(
      tap(response => {
        localStorage.setItem('user', JSON.stringify({
          _id: response._id,
          username: response.username,
          email: response.email,
          role: response.role
        }));
        localStorage.setItem('token', response.token);
        this.currentUserSubject.next({
          _id: response._id,
          username: response.username,
          email: response.email,
          role: response.role,
          token: response.token
        });
      })
    );
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'admin';
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserId(): string | null {
    const user = this.currentUserSubject.value;
    return user?._id || null;
  }
}