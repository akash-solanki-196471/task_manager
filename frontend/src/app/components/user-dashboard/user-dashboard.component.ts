import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { User } from '../../models/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard-component.html',
  styleUrls: ['./user-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class UserDashboardComponent implements OnInit {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  today: Date = new Date();
  
  commentForm: FormGroup;
  taskForm: FormGroup;
  showDetailModal = false;
  showTaskModal = false;
  selectedTask: Task | null = null;
  editingTask: Task | null = null;
  isTaskSubmitting = false;
  users: User[] = [];
  
  searchTerm: string = '';
  activeTab: string = 'pending'; // Default tab

  // Personal todo list properties
  personalTodos: Array<{ id: string; text: string; completed: boolean; priority: string; createdAt: Date }> = [];
  newTodoText: string = '';
  newTodoPriority: string = 'medium';

  stats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    reminders: 0
  };

  constructor(
    private taskService: TaskService,
    private userService: UserService,
    public authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.commentForm = this.fb.group({
      text: ['', Validators.required]
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
  }

  ngOnInit(): void {
    this.loadTasks();
    this.loadUsers();
    this.startReminderCheck();
    this.loadPersonalTodos();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
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
    this.stats.total = this.tasks.length;
    this.stats.pending = this.tasks.filter(t => t.status === 'Pending' || t.status === 'Reverted').length;
    this.stats.inProgress = this.tasks.filter(t => t.status === 'In Progress').length;
    this.stats.completed = this.tasks.filter(t => t.status === 'Approved' || t.status === 'Done').length;
    this.stats.reminders = this.tasks.filter(t => t.reminderAt && new Date(t.reminderAt) > new Date()).length;
  }

  applyFilters(): void {
    this.filteredTasks = this.tasks.filter(task => {
      let matchesSearch = true;
      let matchesTab = true;

      if (this.searchTerm) {
        const search = this.searchTerm.toLowerCase();
        matchesSearch = task.title.toLowerCase().includes(search) ||
                       (task.description?.toLowerCase().includes(search) ?? false);
      }

      if (this.activeTab === 'pending') {
        const isPendingOrReverted = task.status === 'Pending' || task.status === 'Reverted';
        if (!isPendingOrReverted) {
          matchesTab = false;
        } else if (task.reminderAt) {
          const reminderDate = new Date(task.reminderAt);
          const todayDate = new Date();
          const isSameDay = reminderDate.getDate() === todayDate.getDate() &&
                            reminderDate.getMonth() === todayDate.getMonth() &&
                            reminderDate.getFullYear() === todayDate.getFullYear();
          matchesTab = isSameDay;
        } else {
          matchesTab = true;
        }
      }
      else if (this.activeTab === 'in-progress') matchesTab = task.status === 'In Progress';
      else if (this.activeTab === 'completed') matchesTab = task.status === 'Approved' || task.status === 'Done';
      else if (this.activeTab === 'scheduled') matchesTab = task.status === 'Scheduled' || (task.reminderAt != null);

      return matchesSearch && matchesTab;
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'personal') {
      this.loadPersonalTodos();
    } else {
      this.applyFilters();
    }
  }

  openDetailModal(task: Task): void {
    this.selectedTask = task;
    this.commentForm.reset();
    this.showDetailModal = true;
  }

  closeModal(): void {
    this.showDetailModal = false;
    this.showTaskModal = false;
    this.selectedTask = null;
    this.editingTask = null;
    this.isTaskSubmitting = false;
  }

  openCreateTaskModal(): void {
    this.showDetailModal = false;
    this.editingTask = null;
    const currentUser = this.authService.getCurrentUser();
    this.taskForm.reset({ 
      priority: 'medium', 
      status: 'Pending',
      assignedTo: currentUser?._id || null
    });
    this.showTaskModal = true;
    this.cdr.detectChanges();
  }

  openEditTaskModal(task: Task): void {
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

  updateStatus(task: Task, status: string): void {
    this.taskService.updateStatus(task._id!, status).subscribe({
      next: (updatedTask) => {
        this.toastr.success(`Status updated to ${status}`);
        // Refresh the open detail modal immediately without waiting for loadTasks()
        if (this.selectedTask?._id === updatedTask._id) {
          this.selectedTask = updatedTask;
          this.cdr.detectChanges();
        }
        this.loadTasks();
      },
      error: () => this.toastr.error('Failed to update status')
    });
  }

  requestClarification(task: Task): void {
    // Revert status to Reverted (this triggers backend reassignment to Admin)
    this.taskService.updateStatus(task._id!, 'Reverted').subscribe({
      next: () => {
        this.toastr.info('Clarification requested. Task sent to Admin.');
        this.loadTasks();
        this.closeModal();
      },
      error: () => this.toastr.error('Failed to request clarification')
    });
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

  startReminderCheck(): void {
    setInterval(() => {
      const now = new Date();
      this.tasks.forEach(task => {
        if (task.reminderAt) {
          const reminderDate = new Date(task.reminderAt);
          // If reminder is within the next minute
          if (reminderDate > now && (reminderDate.getTime() - now.getTime()) < 60000) {
            this.toastr.info(`Reminder: ${task.title}`, 'Task Due Soon', { timeOut: 0 });
          }
        }
      });
    }, 60000);
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

  loadPersonalTodos(): void {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      const key = `personal_todos_${user._id}`;
      const saved = localStorage.getItem(key);
      this.personalTodos = saved ? JSON.parse(saved) : [];
    }
  }

  savePersonalTodos(): void {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      const key = `personal_todos_${user._id}`;
      localStorage.setItem(key, JSON.stringify(this.personalTodos));
    }
  }

  addPersonalTodo(): void {
    if (!this.newTodoText || !this.newTodoText.trim()) return;
    const newTodo = {
      id: '_' + Math.random().toString(36).substr(2, 9),
      text: this.newTodoText.trim(),
      completed: false,
      priority: this.newTodoPriority,
      createdAt: new Date()
    };
    this.personalTodos.push(newTodo);
    this.savePersonalTodos();
    this.newTodoText = '';
    this.newTodoPriority = 'medium';
    this.toastr.success('Personal todo added successfully');
  }

  togglePersonalTodo(todo: any): void {
    todo.completed = !todo.completed;
    this.savePersonalTodos();
  }

  deletePersonalTodo(id: string): void {
    this.personalTodos = this.personalTodos.filter(t => t.id !== id);
    this.savePersonalTodos();
    this.toastr.success('Personal todo deleted');
  }
}