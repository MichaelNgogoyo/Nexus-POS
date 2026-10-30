import { createContext, useContext, useState, useEffect } from "react";
import { addItemToCart, getCartLineKey, removeCartItem } from "./cartUtils.js";

const CART_STORAGE_KEY = "pos_checkout_cart";

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved).map((item) => ({
                ...item,
                cartLineKey: item.cartLineKey || getCartLineKey(item.id, item.modifiers || [], item.notes || ''),
                modifiers: item.modifiers || [],
            })) : [];
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

    const addToCart = (product, options = {}) => {
        setCart((previous) => addItemToCart(previous, product, options));
    };

    const removeFromCart = (lineKeyOrProductId) => {
        setCart((previous) => removeCartItem(previous, lineKeyOrProductId));
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
