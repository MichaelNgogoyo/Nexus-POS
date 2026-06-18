import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCategories, createCategory, deleteCategory } from '../../services/api';
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
            <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-xl border border-border-primary">
              <span className="text-text-primary font-medium">{cat.name}</span>
              <button
                onClick={() => delMutation.mutate(cat.id)}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-text-muted col-span-3">No categories yet. Add one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
