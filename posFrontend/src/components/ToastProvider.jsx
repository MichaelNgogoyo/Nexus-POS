import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {emitToast, setToastListener} from "./toastBus";

const ToastContext = createContext(null);

export function ToastProvider({children}) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback((message, variant = "info", ttl = 4000) => {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, {id, message, variant}]);
        window.setTimeout(() => remove(id), ttl);
    }, [remove]);

    const value = useMemo(() => ({push, remove}), [push, remove]);

    useEffect(() => {
        setToastListener((message, variant) => push(message, variant));
        return () => setToastListener(null);
    }, [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed bottom-4 right-4 z-[1000] space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`rounded-xl px-4 py-3 shadow-lg border text-sm font-medium bg-bg-secondary border-border-primary text-text-primary ${toast.variant === "error" ? "border-accent-error/60 text-accent-error" : toast.variant === "success" ? "border-accent-success/60 text-accent-success" : ""}`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return ctx;
}
