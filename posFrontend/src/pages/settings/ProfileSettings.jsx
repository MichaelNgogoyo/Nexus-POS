import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import { AccountCircleRounded, DeleteOutlineRounded, LockResetRounded, PaletteRounded, PhotoCameraRounded } from '@mui/icons-material';
import { runtimeConfig } from '../../config/runtimeConfig.js';
import { applyTheme, getCurrentThemeState, THEME_PRESETS } from '../../theme/theme.js';
import { deleteMyAvatar, getMyAvatar, getMyProfile, saveMyAppearance, uploadMyAvatar } from '../../services/api.js';
import { ROUTES } from '../../routes.js';

const DESCRIPTIONS = {
  apple: 'Clean neutral tones with subtle blue accents.', executive: 'Enterprise blue for clear operational screens.',
  charcoal: 'Dark-first, high-contrast workspace.', emerald: 'Calm green accents for everyday work.',
  sapphire: 'Balanced blue styling for operations.', platinum: 'Minimal slate tones with less visual noise.',
};

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const { keycloak } = useKeycloak();
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: async () => (await getMyProfile()).data });
  const [appearance, setAppearance] = useState(() => getCurrentThemeState());
  const [notice, setNotice] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (profile.data) setAppearance({ preset: profile.data.themePreset, mode: profile.data.themeMode });
  }, [profile.data]);

  useEffect(() => {
    let url;
    let active = true;
    if (profile.data?.hasAvatar) {
      getMyAvatar().then(({ data }) => {
        if (!active) return;
        url = URL.createObjectURL(data);
        setAvatarUrl(url);
      }).catch(() => setAvatarUrl(''));
    } else setAvatarUrl('');
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [profile.data?.hasAvatar]);

  const saveAppearanceMutation = useMutation({
    mutationFn: async (value) => (await saveMyAppearance(value)).data,
    onSuccess: (saved) => {
      const next = { preset: saved.themePreset, mode: saved.themeMode };
      setAppearance(next);
      applyTheme(next);
      queryClient.setQueryData(['my-profile'], saved);
      setNotice('Your appearance has been saved to your staff profile.');
    },
  });
  const uploadMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setNotice('Profile picture updated.');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      setNotice('Profile picture removed.');
    },
  });

  const passwordUrl = `${runtimeConfig.keycloakUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(runtimeConfig.keycloakRealm)}/account/#/security/signingin`;
  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setFileError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFileError('Choose a PNG or JPEG image no larger than 2 MB.');
      return;
    }
    uploadMutation.mutate(file);
  };

  if (profile.isPending) return <div className="min-h-screen grid place-items-center text-text-secondary">Loading profile…</div>;
  if (profile.isError) return <div className="min-h-screen p-8 text-accent-error">Could not load your profile. Refresh and try again.</div>;

  return <main className="min-h-screen bg-bg-primary px-4 py-8 text-text-primary sm:px-8">
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-text-muted">Staff account</p><h1 className="text-3xl font-bold">Profile & preferences</h1><p className="mt-1 text-text-secondary">Manage your own account details and POS appearance.</p></div>
        <Link className="btn-secondary" to={keycloak?.tokenParsed?.realm_access?.roles?.includes('SUPER_ADMIN') ? ROUTES.SUPER_ADMIN : ROUTES.HOME}>Back to workspace</Link>
      </header>

      {notice && <div role="status" className="rounded-xl border border-accent-success/30 bg-accent-success/10 px-4 py-3 text-sm">{notice}</div>}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl ? <img src={avatarUrl} alt="Your profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-border-primary" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-bg-tertiary text-3xl text-text-muted"><AccountCircleRounded fontSize="inherit" /></div>}
          <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{profile.data.username || 'Staff account'}</h2><p className="text-sm text-text-secondary">{profile.data.email || 'No email in Keycloak profile'}</p><p className="mt-1 text-xs text-text-muted">Profile identity is managed by Keycloak.</p></div>
          <label className="btn-primary inline-flex cursor-pointer items-center gap-2">
            <PhotoCameraRounded fontSize="small" /> {uploadMutation.isPending ? 'Uploading…' : 'Change picture'}
            <input className="sr-only" type="file" accept="image/png,image/jpeg" onChange={chooseAvatar} disabled={uploadMutation.isPending} />
          </label>
          {profile.data.hasAvatar && <button className="btn-secondary inline-flex items-center gap-2" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}><DeleteOutlineRounded fontSize="small" /> Remove</button>}
        </div>
        {(fileError || uploadMutation.isError) && <p role="alert" className="mt-3 text-sm text-accent-error">{fileError || 'Picture upload failed. Check MinIO connectivity and try again.'}</p>}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2"><PaletteRounded className="text-brand-primary" /><div><h2 className="text-xl font-semibold">Appearance</h2><p className="text-sm text-text-secondary">These preferences follow your Keycloak staff account on this device.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(THEME_PRESETS).map(([key, preset]) => <button key={key} type="button" onClick={() => setAppearance((old) => ({ ...old, preset: key }))} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${appearance.preset === key ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-border-primary'}`}>
            <strong>{preset.label}</strong><p className="mt-1 text-sm text-text-secondary">{DESCRIPTIONS[key]}</p><div className="mt-3 flex gap-2">{({ apple: ['#0071e3','#f5f5f7'], executive: ['#2563eb','#f4f7fb'], charcoal: ['#8aa4ff','#191a1d'], emerald: ['#0f766e','#f5fbf8'], sapphire: ['#3558d8','#f3f6fc'], platinum: ['#475569','#f7f7f8'] })[key].map((color) => <span key={color} className="h-4 w-4 rounded-full border border-border-primary" style={{ background: color }} />)}</div>
          </button>)}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border-primary pt-5">
          <div><p className="font-medium">Color mode</p><p className="text-sm text-text-secondary">Choose the mode you prefer at work.</p></div>
          <div className="flex gap-2">{['light','dark'].map((mode) => <button key={mode} type="button" onClick={() => setAppearance((old) => ({ ...old, mode }))} className={`btn-secondary capitalize ${appearance.mode === mode ? 'ring-2 ring-brand-primary' : ''}`}>{mode}</button>)}</div>
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => saveAppearanceMutation.mutate(appearance)} disabled={saveAppearanceMutation.isPending}>{saveAppearanceMutation.isPending ? 'Saving…' : 'Save appearance'}</button></div>
        {saveAppearanceMutation.isError && <p role="alert" className="mt-3 text-right text-sm text-accent-error">Could not save appearance. Try again.</p>}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div><h2 className="text-xl font-semibold">Password & sign-in</h2><p className="mt-1 text-sm text-text-secondary">Password changes are handled securely by Keycloak.</p></div>
        <a className="btn-secondary inline-flex items-center gap-2" href={passwordUrl} target="_blank" rel="noreferrer"><LockResetRounded fontSize="small" /> Change password</a>
      </section>
    </div>
  </main>;
}
