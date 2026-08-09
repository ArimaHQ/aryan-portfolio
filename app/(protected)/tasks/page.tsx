'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { listTasks, createTask, updateTask, deleteTask } from '@/lib/tasks-api';
import type { TaskResponse, TaskCreate, TaskUpdate } from '@/lib/tasks-api';

export default function TasksPage() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [selected, setSelected] = useState<TaskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [createForm, setCreateForm] = useState<TaskCreate>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    project_id: '',
    assigned_to: null,
    due_date: null,
  });

  const [updateForm, setUpdateForm] = useState<TaskUpdate>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listTasks({
        project: filterProject || undefined,
        status: filterStatus || undefined,
        limit: 100,
      });
      setTasks(data.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isInitialized, isAuthenticated, load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSaving(true);
    try {
      await createTask(createForm);
      setCreateForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        project_id: filterProject,
        assigned_to: null,
        due_date: null,
      });
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to create task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setFormError(null);
    setIsSaving(true);
    try {
      const updated = await updateTask(selected.id, updateForm);
      setSelected(updated);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to update task.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    setFormError(null);
    try {
      await deleteTask(selected.id);
      setSelected(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to delete task.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectTask = (task: TaskResponse) => {
    setSelected(task);
    setUpdateForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      due_date: task.due_date,
    });
  };

  if (!isInitialized || isLoading) {
    return (
      <main className="lab-loading-page">
        <span className="lab-loading-mark">AF</span>
        <div>
          <p>Executive OS</p>
          <strong>Loading tasks</strong>
          <i />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="lab-error-page">
        <section>
          <p>Executive OS</p>
          <h1>Tasks unavailable</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/">
          <i>AF</i>
          <span>ARIMA<br />EXECUTIVE OS</span>
        </Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/projects"><i>02</i>Projects</Link>
          <Link className="active" href="/tasks"><i>03</i>Tasks</Link>
          <Link href="/executive"><i>04</i>Executive mode</Link>
          <Link href="/growth-studio"><i>05</i>Growth studio</Link>
        </nav>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ tasks</b></div>
          <div><i />Live backend data</div>
        </header>

        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Workspace</p>
            <h1>Tasks</h1>
            <p>Track and manage work across your projects.</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsCreating((v) => !v)}>
              {isCreating ? 'Hide form' : 'New task'}
            </button>
          </div>
        </div>

        <div className="lab-layout" style={{ marginBottom: 24 }}>
          <section className="lab-panel">
            <p className="lab-eyebrow">Filters</p>
            <h2>Refine</h2>
            <label>
              Project ID
              <input
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              />
            </label>
            <label>
              Status
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <button type="button" onClick={() => { setFilterProject(''); setFilterStatus(''); }}>Clear</button>
          </section>
        </div>

        {isCreating && (
          <section className="lab-panel" style={{ marginBottom: 24 }}>
            <p className="lab-eyebrow">Create</p>
            <h2>New task</h2>
            <form onSubmit={handleCreate}>
              <label>
                Title
                <input
                  required
                  maxLength={255}
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={5000}
                  value={createForm.description ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label>
                Status
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label>
                Priority
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Project ID
                <input
                  value={createForm.project_id ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, project_id: e.target.value || '' }))}
                />
              </label>
              <label>
                Assigned To
                <input
                  value={createForm.assigned_to ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, assigned_to: e.target.value || null }))}
                />
              </label>
              <label>
                Due Date
                <input
                  type="datetime-local"
                  value={createForm.due_date ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, due_date: e.target.value || null }))}
                />
              </label>
              {formError && <p className="lab-error-text">{formError}</p>}
              <div>
                <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create task'}</button>
                <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        <div className="lab-layout">
          <section className="lab-panel">
            <p className="lab-eyebrow">Tasks</p>
            <h2>Task list</h2>
            {tasks.length === 0 ? (
              <p className="lab-muted">No tasks found.</p>
            ) : (
              <ul className="holding-strip">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <button type="button" onClick={() => selectTask(task)} className={selected?.id === task.id ? 'active' : undefined}>
                      <strong>{task.title}</strong>
                      <small>{task.status}</small>
                      <small>{task.priority}</small>
                      <small>{new Date(task.created_at).toLocaleDateString()}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected && (
            <section className="lab-panel">
              <p className="lab-eyebrow">Detail</p>
              <h2>Edit task</h2>
              <form onSubmit={handleUpdate}>
                <label>
                  Title
                  <input
                    required
                    maxLength={255}
                    value={updateForm.title ?? ''}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    maxLength={5000}
                    value={updateForm.description ?? ''}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={updateForm.status ?? selected.status}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>
                <label>
                  Priority
                  <select
                    value={updateForm.priority ?? selected.priority}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  Project ID
                  <input
                    value={updateForm.project_id ?? selected.project_id}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, project_id: e.target.value || null }))}
                  />
                </label>
                <label>
                  Assigned To
                  <input
                    value={updateForm.assigned_to ?? selected.assigned_to ?? ''}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, assigned_to: e.target.value || null }))}
                  />
                </label>
                <label>
                  Due Date
                  <input
                    type="datetime-local"
                    value={updateForm.due_date ?? selected.due_date ?? ''}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, due_date: e.target.value || null }))}
                  />
                </label>
                {formError && <p className="lab-error-text">{formError}</p>}
                <div>
                  <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete task'}
                  </button>
                  <button type="button" onClick={() => setSelected(null)}>Close</button>
                </div>
              </form>
            </section>
          )}
        </div>

        <footer className="lab-footer">Arima Executive OS · Tasks are scoped to your permitted access.</footer>
      </section>
    </main>
  );
}
