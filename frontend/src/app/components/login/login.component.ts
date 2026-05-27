import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  loading = false;
  isLoginMode = true;
  returnUrl: string = '/';

  // System Status variables
  backendStatus: 'checking' | 'online' | 'offline' = 'checking';
  dbStatus: 'checking' | 'connected' | 'disconnected' = 'checking';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Check backend and DB status on load
    this.checkSystemHealth();

    // Get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // Check if already logged in
    if (this.authService.isAuthenticated()) {
      setTimeout(() => {
        this.redirectBasedOnRole();
      });
    }
  }

  checkSystemHealth(): void {
    this.backendStatus = 'checking';
    this.dbStatus = 'checking';

    this.authService.checkHealth().subscribe({
      next: (status) => {
        this.backendStatus = 'online';
        this.dbStatus = status.mongodb === 'connected' ? 'connected' : 'disconnected';
      },
      error: (err) => {
        console.error('System health check failed:', err);
        this.backendStatus = 'offline';
        this.dbStatus = 'disconnected';
        this.toastr.warning('Could not connect to the backend server. Please ensure it is running.', 'System Warning');
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.toastr.error('Please fill in the form correctly.', 'Validation Error');
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success('Login successful!');
        this.redirectBasedOnRole();
      },
      error: (error) => {
        this.loading = false;
        console.error('Login error:', error);
        const errMsg = error.error?.message || 'Login failed. Please check your credentials.';
        this.toastr.error(errMsg, 'Login Error');
      }
    });
  }

  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      this.toastr.error('Please fill in the form correctly.', 'Validation Error');
      return;
    }

    this.loading = true;
    const { confirmPassword, ...registerData } = this.registerForm.value;
    
    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success('Registration successful!');
        this.redirectBasedOnRole();
      },
      error: (error) => {
        this.loading = false;
        console.error('Registration error:', error);
        const errMsg = error.error?.message || 'Registration failed.';
        this.toastr.error(errMsg, 'Registration Error');
      }
    });
  }

  private redirectBasedOnRole(): void {
    const isAdmin = this.authService.isAdmin();
    const targetRoute = isAdmin ? '/admin' : '/dashboard';
    
    // Avoid redundant navigation if already at target
    if (this.router.url === targetRoute) {
      this.loading = false;
      return;
    }

    console.log(`Redirecting to ${targetRoute} (isAdmin: ${isAdmin})`);
    this.router.navigate([targetRoute]).then(success => {
      this.loading = false;
      if (!success) {
        this.toastr.error('Navigation to dashboard failed.', 'Navigation Error');
      }
    }).catch(err => {
      this.loading = false;
      this.toastr.error('Navigation error occurred.', 'Navigation Error');
      console.error('Navigation error:', err);
    });
  }

  // Convenience getters for form controls
  get l() { return this.loginForm.controls; }
  get r() { return this.registerForm.controls; }
}