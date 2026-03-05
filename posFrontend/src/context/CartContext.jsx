import { createContext, useContext, useState, useEffect } from "react";

const CART_STORAGE_KEY = "pos_checkout_cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch {
            // ignore storage errors
        }
    }, [cart]);

    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.id === productId);
            if (!existing) return prev;
            if (existing.quantity <= 1) return prev.filter((i) => i.id !== productId);
            return prev.map((i) =>
                i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
            );
        });
    };

    const clearCart = () => {
        setCart([]);
        localStorage.removeItem(CART_STORAGE_KEY);
    };

    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, setCart, addToCart, removeFromCart, clearCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
