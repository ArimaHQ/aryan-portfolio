'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import { SuperAdminLink } from '@/components/navigation/SuperAdminLink';
import { listProjects, createProject, updateProject, deleteProject } from '@/lib/projects-api';
import type { ProjectResponse, ProjectCreate, ProjectUpdate } from '@/lib/projects-api';

export default function ProjectsPage() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selected, setSelected] = useState<ProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [createForm, setCreateForm] = useState<ProjectCreate>({
    name: '',
    description: '',
    status: 'planning',
    owner_id: null,
  });

  const [updateForm, setUpdateForm] = useState<ProjectUpdate>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listProjects({ limit: 100 });
      setProjects(data.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      await createProject(createForm);
      setCreateForm({ name: '', description: '', status: 'planning', owner_id: null });
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to create project.');
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
      const updated = await updateProject(selected.id, updateForm);
      setSelected(updated);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    setFormError(null);
    try {
      await deleteProject(selected.id);
      setSelected(null);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectProject = async (project: ProjectResponse) => {
    setSelected(project);
    setUpdateForm({
      name: project.name,
      description: project.description,
      status: project.status,
      owner_id: project.owner_id,
    });
  };

  if (!isInitialized || isLoading) {
    return (
      <main className="lab-loading-page">
        <span className="lab-loading-mark">AF</span>
        <div>
          <p>Executive OS</p>
          <strong>Loading projects</strong>
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
          <h1>Projects unavailable</h1>
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
          <Link className="active" href="/projects"><i>02</i>Projects</Link>
          <SuperAdminLink href="/executive"><i>03</i>Executive mode</SuperAdminLink>
          <Link href="/growth-studio"><i>04</i>Growth studio</Link>
        </nav>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ projects</b></div>
          <div><i />Live backend data</div>
        </header>

        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Workspace</p>
            <h1>Projects</h1>
            <p>Manage and track your Arima workspace projects.</p>
          </div>
          <div>
            <button type="button" onClick={() => setIsCreating((v) => !v)}>
              {isCreating ? 'Hide form' : 'New project'}
            </button>
          </div>
        </div>

        {isCreating && (
          <section className="lab-panel" style={{ marginBottom: 24 }}>
            <p className="lab-eyebrow">Create</p>
            <h2>New project</h2>
            <form onSubmit={handleCreate}>
              <label>
                Name
                <input
                  required
                  maxLength={255}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={2000}
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
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Owner ID
                <input
                  value={createForm.owner_id ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, owner_id: e.target.value || null }))}
                />
              </label>
              {formError && <p className="lab-error-text">{formError}</p>}
              <div>
                <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create project'}</button>
                <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        <div className="lab-layout">
          <section className="lab-panel">
            <p className="lab-eyebrow">Projects</p>
            <h2>Project list</h2>
            {projects.length === 0 ? (
              <p className="lab-muted">No projects found.</p>
            ) : (
              <ul className="holding-strip">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button type="button" onClick={() => selectProject(project)} className={selected?.id === project.id ? 'active' : undefined}>
                      <strong>{project.name}</strong>
                      <small>{project.status}</small>
                      <small>{new Date(project.created_at).toLocaleDateString()}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selected && (
            <section className="lab-panel">
              <p className="lab-eyebrow">Detail</p>
              <h2>Edit project</h2>
              <form onSubmit={handleUpdate}>
                <label>
                  Name
                  <input
                    required
                    maxLength={255}
                    value={updateForm.name ?? ''}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    maxLength={2000}
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
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label>
                  Owner ID
                  <input
                    value={updateForm.owner_id ?? selected.owner_id}
                    onChange={(e) => setUpdateForm((f) => ({ ...f, owner_id: e.target.value || null }))}
                  />
                </label>
                {formError && <p className="lab-error-text">{formError}</p>}
                <div>
                  <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save changes'}</button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete project'}
                  </button>
                  <button type="button" onClick={() => setSelected(null)}>Close</button>
                </div>
              </form>
            </section>
          )}
        </div>

        <footer className="lab-footer">Arima Executive OS · Projects are scoped to your permitted access.</footer>
      </section>
    </main>
  );
}
