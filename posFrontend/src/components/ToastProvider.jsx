import { useState, useEffect, useCallback } from 'react';
import { emitToast } from './toastBus';

export function useToast() {
    const push = useCallback((message, type = 'info') => emitToast(message, type), []);
    return { push };
}

import { subscribeToast } from './toastBus';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

let idCounter = 0;

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const styles = {
    success: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', Icon: CheckCircleRoundedIcon },
    error:   { bg: 'bg-red-500/10 border-red-500/30 text-red-400', Icon: ErrorRoundedIcon },
    warning: { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', Icon: WarningRoundedIcon },
    info:    { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', Icon: InfoRoundedIcon },
  };
  const { bg, Icon } = styles[toast.type] ?? styles.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium backdrop-blur-sm ${bg} min-w-[260px] max-w-sm`}>
      <Icon sx={{ fontSize: 18 }} className="shrink-0" />
      <span className="flex-1 text-text-primary">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 text-text-muted">✕</button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToast(({ message, type }) => {
      const id = ++idCounter;
      setToasts(prev => [...prev, { id, message, type }]);
    });
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map(t => <Toast key={t.id} toast={t} onRemove={remove} />)}
      </div>
    </>
  );
}
