import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import {ReactKeycloakProvider} from "@react-keycloak/web";
import keycloak from "./auth/keycloak.js";
import {initTheme} from "./theme/theme";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

initTheme();

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,      // data stays fresh for 5 minutes
            refetchOnWindowFocus: false,    // don't refetch when switching tabs/windows
            refetchOnMount: false,          // don't refetch when component remounts if data is fresh
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <ReactKeycloakProvider authClient={keycloak}>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <App/>
            </QueryClientProvider>
        </BrowserRouter>
    </ReactKeycloakProvider>
);