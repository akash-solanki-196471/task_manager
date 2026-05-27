import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Task } from '../../models/task.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class AdminDashboardComponent implements OnInit {
  isUserSubmitting = false;
  isTaskSubmitting = false;
  isCommentSubmitting = false;
  users: User[] = [];
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  today: Date = new Date();
  
  userForm: FormGroup;
  taskForm: FormGroup;
  commentForm: FormGroup;
  
  showUserModal = false;
  showTaskModal = false;
  showDetailModal = false;
  
  editingUser: User | null = null;
  editingTask: Task | null = null;
  selectedTask: Task | null = null;
  selectedUser: User | null = null;
  
  searchTerm: string = '';
  filterPriority: string = 'all';
  filterStatus: string = 'all';
  activeTab: string = 'all';

  stats = {
    totalUsers: 0,
    totalTasks: 0,
    revertedTasks: 0,
    overdueTasks: 0,
    completedTasks: 0
  };

  constructor(
    private userService: UserService,
    private taskService: TaskService,
    public authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['user', Validators.required]
    });

    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      priority: ['medium', Validators.required],
      status: ['Pending', Validators.required],
      assignedTo: [null],
      dueAt: [''],
      reminderAt: ['']
    });

    this.commentForm = this.fb.group({
      text: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadTasks();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.stats.totalUsers = users.length;
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Failed to load users')
    });
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.calculateStats();
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: () => this.toastr.error('Failed to load tasks')
    });
  }

  calculateStats(): void {
    const now = new Date();
    this.stats.totalTasks = this.tasks.length;
    this.stats.revertedTasks = this.tasks.filter(t => t.status === 'Reverted').length;
    this.stats.completedTasks = this.tasks.filter(t => t.status === 'Approved' || t.status === 'Done').length;
    this.stats.overdueTasks = this.tasks.filter(t => t.dueAt && new Date(t.dueAt) < now && t.status !== 'Approved' && t.status !== 'Done').length;
  }

  applyFilters(): void {
    this.filteredTasks = this.tasks.filter(task => {
      let matchesSearch = true;
      let matchesPriority = true;
      let matchesStatus = true;
      let matchesUser = true;

      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        matchesSearch = task.title.toLowerCase().includes(search) ||
                       (task.description?.toLowerCase().includes(search) ?? false) ||
                       (task.assignedTo?.username.toLowerCase().includes(search) ?? false);
      }

      if (this.filterPriority !== 'all') {
        matchesPriority = task.priority === this.filterPriority;
      }

      if (this.filterStatus !== 'all') {
        matchesStatus = task.status === this.filterStatus;
      }

      if (this.activeTab !== 'all') {
        if (this.activeTab === 'pending') matchesStatus = task.status === 'Pending';
        if (this.activeTab === 'reverted') matchesStatus = task.status === 'Reverted';
        if (this.activeTab === 'completed') matchesStatus = task.status === 'Approved' || task.status === 'Done';
      }

      if (this.selectedUser) {
        matchesUser = task.assignedTo?._id === this.selectedUser._id;
      }

      return matchesSearch && matchesPriority && matchesStatus && matchesUser;
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  openCreateUserModal(): void {
    console.log('Opening create user modal');
    this.showTaskModal = false; // Close others
    this.showDetailModal = false;
    this.editingUser = null;
    this.userForm.reset({ role: 'user' });
    this.showUserModal = true;
    this.cdr.detectChanges();
  }

  openEditUserModal(user: User): void {
    this.showTaskModal = false;
    this.showDetailModal = false;
    this.editingUser = user;
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      role: user.role
    });
    this.showUserModal = true;
    this.cdr.detectChanges();
  }

  openCreateTaskModal(): void {
    this.showUserModal = false;
    this.showDetailModal = false;
    this.editingTask = null;
    this.taskForm.reset({ priority: 'medium', status: 'Pending' });
    this.showTaskModal = true;
    this.cdr.detectChanges();
  }

  openEditTaskModal(task: Task): void {
    this.showUserModal = false;
    this.showDetailModal = false;
    this.editingTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assignedTo: task.assignedTo?._id || null,
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : '',
      reminderAt: task.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : ''
    });
    this.showTaskModal = true;
    this.cdr.detectChanges();
  }

  openDetailModal(task: Task): void {
    this.selectedTask = task;
    this.commentForm.reset();
    this.showDetailModal = true;
  }

  closeModal(): void {
    console.log('Closing all modals');
    this.showUserModal = false;
    this.showTaskModal = false;
    this.showDetailModal = false;
    this.editingUser = null;
    this.editingTask = null;
    this.selectedTask = null;
    this.isUserSubmitting = false;
    this.isTaskSubmitting = false;
    this.isCommentSubmitting = false;
    this.cdr.detectChanges();
  }

  saveUser(): void {
    if (this.userForm.invalid || this.isUserSubmitting) return;
    this.isUserSubmitting = true;
    const userData = this.userForm.value;

    if (this.editingUser) {
      this.userService.updateUser(this.editingUser._id!, userData).subscribe({
        next: () => {
          this.toastr.success('User updated');
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Update failed');
          this.isUserSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.createUser(userData).subscribe({
        next: () => {
          this.toastr.success('User created');
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Creation failed');
          this.isUserSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.toastr.success('User deleted');
          this.loadUsers();
        },
        error: () => this.toastr.error('Delete failed')
      });
    }
  }

  saveTask(): void {
    if (this.taskForm.invalid || this.isTaskSubmitting) return;
    this.isTaskSubmitting = true;
    const taskData = this.taskForm.value;

    if (this.editingTask) {
      this.taskService.updateTask(this.editingTask._id!, taskData).subscribe({
        next: () => {
          this.toastr.success('Task updated');
          this.loadTasks();
          this.closeModal();
        },
        error: () => {
          this.toastr.error('Update failed');
          this.isTaskSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.taskService.createTask(taskData).subscribe({
        next: () => {
          this.toastr.success('Task created');
          this.loadTasks();
          this.closeModal();
        },
        error: () => {
          this.toastr.error('Creation failed');
          this.isTaskSubmitting = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteTask(id: string): void {
    if (confirm('Delete this task?')) {
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.toastr.success('Task removed');
          this.loadTasks();
        },
        error: () => this.toastr.error('Delete failed')
      });
    }
  }

  addComment(): void {
    if (this.commentForm.invalid || !this.selectedTask) return;
    const text = this.commentForm.value.text;
    this.taskService.addComment(this.selectedTask._id!, text).subscribe({
      next: (updatedTask) => {
        this.selectedTask = updatedTask;
        this.commentForm.reset();
        this.loadTasks();
      },
      error: () => this.toastr.error('Failed to add comment')
    });
  }

  approveTask(task: Task): void {
    this.taskService.updateStatus(task._id!, 'Approved').subscribe({
      next: () => {
        this.toastr.success('Task approved');
        this.loadTasks();
      },
      error: () => this.toastr.error('Action failed')
    });
  }

  viewEmployeeTasks(user: User): void {
    this.selectedUser = user;
    this.applyFilters();
  }

  clearUserFilter(): void {
    this.selectedUser = null;
    this.applyFilters();
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/login';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'bg-secondary';
      case 'In Progress': return 'bg-primary';
      case 'Reverted': return 'bg-warning text-dark';
      case 'Approved': return 'bg-success';
      case 'Done': return 'bg-success';
      case 'Scheduled': return 'bg-dark';
      default: return 'bg-light text-dark';
    }
  }
}