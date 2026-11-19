import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCategories, createCategory, deleteCategory, getCategoryImageUrl, uploadCategoryImage } from '../../services/api';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';

export default function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories().then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (n) => createCategory(n),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setName(''); },
  });

  const delMutation = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const imageMutation = useMutation({
    mutationFn: ({ id, file }) => uploadCategoryImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Categories</h1>

      <div className="flex gap-3 mb-6">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 px-4 py-2 rounded-xl bg-bg-secondary border border-border-primary text-text-primary focus:outline-none focus:border-brand-primary"
          onKeyDown={e => e.key === 'Enter' && name.trim() && addMutation.mutate(name.trim())}
        />
        <button
          onClick={() => name.trim() && addMutation.mutate(name.trim())}
          disabled={addMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <AddRoundedIcon sx={{ fontSize: 18 }} /> Add
        </button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 px-3 py-3 bg-bg-secondary rounded-xl border border-border-primary">
              {cat.imageUrl || cat.imageURL ? <img src={getCategoryImageUrl(cat.id)} alt="" className="w-14 h-14 rounded-lg object-cover bg-bg-primary" /> : <div className="w-14 h-14 rounded-lg bg-bg-primary text-text-muted grid place-items-center text-xs">No image</div>}
              <div className="min-w-0 flex-1"><span className="block text-text-primary font-medium truncate">{cat.name}</span><label className="inline-flex mt-1 cursor-pointer text-xs font-semibold text-brand-primary hover:underline">{imageMutation.isPending ? 'Uploading…' : cat.imageUrl || cat.imageURL ? 'Change image' : 'Add image'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageMutation.isPending} onChange={(event) => { const file = event.target.files?.[0]; if (file) imageMutation.mutate({ id: cat.id, file }); event.target.value = ''; }} /></label></div>
              <button
                type="button"
                onClick={() => delMutation.mutate(cat.id)}
                disabled={delMutation.isPending}
                aria-label={`Delete ${cat.name}`}
                className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-text-muted col-span-3">No categories yet. Add one above.</p>
          )}
        </div>
      )}
      {imageMutation.isError && <p className="mt-3 text-sm text-red-600" role="alert">Category image upload failed. {imageMutation.error?.response?.data?.message || 'Use a JPEG, PNG, or WebP image under 5 MB.'}</p>}
    </div>
  );
}
