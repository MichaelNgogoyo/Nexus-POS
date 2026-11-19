import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminPanelSettingsRounded, OpenInNewRounded, PaletteRounded } from '@mui/icons-material';
import { runtimeConfig } from '../../config/runtimeConfig.js';
import { getPlatformSettings, updatePlatformSettings } from '../../services/api.js';
import { THEME_PRESETS } from '../../theme/theme.js';
import { ROUTES } from '../../routes.js';

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['platform-settings'], queryFn: async () => (await getPlatformSettings()).data });
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { if (settings.data) setDraft({ defaultThemePreset: settings.data.defaultThemePreset, defaultThemeMode: settings.data.defaultThemeMode }); }, [settings.data]);
  const save = useMutation({ mutationFn: async (body) => (await updatePlatformSettings(body)).data, onSuccess: (data) => { queryClient.setQueryData(['platform-settings'], data); setMessage('Platform defaults saved. Users with explicit preferences keep their own choices.'); } });
  const keycloakAdminUrl = `${runtimeConfig.keycloakUrl.replace(/\/$/, '')}/admin/${encodeURIComponent(runtimeConfig.keycloakRealm)}/console`;

  return <main className="min-h-screen bg-bg-primary px-4 py-8 text-text-primary sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><AdminPanelSettingsRounded className="text-brand-primary" sx={{ fontSize: 36 }} /><div><p className="text-sm text-text-muted">Platform controls</p><h1 className="text-3xl font-bold">Super Admin</h1><p className="mt-1 text-text-secondary">Restricted controls for platform-wide defaults and identity administration.</p></div></div><Link className="btn-secondary" to={ROUTES.PROFILE}>My profile</Link></header>
    <section className="card p-5 sm:p-6"><h2 className="mb-1 text-xl font-semibold">Platform access</h2><p className="mb-4 text-sm text-text-secondary">Users and role assignments remain authoritative in Keycloak. Give the SUPER_ADMIN realm role only to trusted platform operators.</p><a href={keycloakAdminUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">Open Keycloak administration <OpenInNewRounded fontSize="small" /></a></section>
    <section className="card p-5 sm:p-6"><div className="mb-5 flex items-center gap-2"><PaletteRounded className="text-brand-primary"/><div><h2 className="text-xl font-semibold">Default appearance</h2><p className="text-sm text-text-secondary">Applied to staff profiles until they save a personal preference.</p></div></div>
      {settings.isPending && <p className="text-text-secondary">Loading platform settings…</p>}
      {settings.isError && <p role="alert" className="text-accent-error">Platform settings could not be loaded. Confirm the account has the SUPER_ADMIN realm role.</p>}
      {draft && <><div className="grid gap-3 sm:grid-cols-2">{Object.entries(THEME_PRESETS).map(([key, theme]) => <button type="button" key={key} onClick={() => setDraft((old) => ({ ...old, defaultThemePreset: key }))} className={`rounded-xl border p-4 text-left transition hover:shadow-md ${draft.defaultThemePreset === key ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-border-primary'}`}><strong>{theme.label}</strong><p className="mt-1 text-sm text-text-secondary">Default staff theme</p></button>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><strong>Default color mode</strong><p className="text-sm text-text-secondary">Initial mode for new or unconfigured profiles.</p></div><div className="flex gap-2">{['light','dark'].map((mode) => <button key={mode} className={`btn-secondary capitalize ${draft.defaultThemeMode === mode ? 'ring-2 ring-brand-primary' : ''}`} onClick={() => setDraft((old) => ({ ...old, defaultThemeMode: mode }))}>{mode}</button>)}</div></div><div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => save.mutate(draft)} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save platform defaults'}</button></div></>}
      {message && <p role="status" className="mt-3 text-sm text-accent-success">{message}</p>}{save.isError && <p role="alert" className="mt-3 text-sm text-accent-error">Could not save platform defaults.</p>}
    </section>
    <section className="card p-5"><h2 className="font-semibold">Authorization boundary</h2><p className="mt-1 text-sm text-text-secondary">Platform settings, user provisioning, and audit access are protected by server-side SUPER_ADMIN checks. Restaurant roles continue to use their operational permissions.</p></section>
  </div></main>;
}
