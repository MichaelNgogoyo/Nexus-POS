let listener = null;

export function setToastListener(fn) {
    listener = fn;
}

export function emitToast(message, variant = "info") {
    if (typeof listener === "function") {
        listener(message, variant);
    }
}
