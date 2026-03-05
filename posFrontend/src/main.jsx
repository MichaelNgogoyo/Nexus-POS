import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import {ReactKeycloakProvider} from "@react-keycloak/web";
import keycloak, {keycloakInitOptions} from "./auth/keycloak.js";
import {initTheme} from "./theme/theme";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ToastProvider} from "./components/ToastProvider.jsx";
import {CartProvider} from "./context/CartContext.jsx";

initTheme();

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000,      // data stays fresh for 2 minutes by default
            refetchOnWindowFocus: true,    // refresh volatile data when returning to the tab
            refetchOnMount: true,
            retry: 1,
        },
    },
});

const AuthLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-secondary">
        <span className="text-sm">Checking session…</span>
    </div>
);

const keycloakEventLogger = (event, error) => {
    if (event === "onInitError") {
        console.error("Keycloak init error", error);
    }
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <ReactKeycloakProvider authClient={keycloak} initOptions={keycloakInitOptions} LoadingComponent={<AuthLoading />} onEvent={keycloakEventLogger}>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <CartProvider>
                        <App/>
                    </CartProvider>
                </ToastProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </ReactKeycloakProvider>
);