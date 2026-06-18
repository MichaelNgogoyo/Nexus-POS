const listeners = new Set();

export function emitToast(message, type = 'info') {
    listeners.forEach(fn => fn({ message, type }));
}

export function subscribeToast(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
