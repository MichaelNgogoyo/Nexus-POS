import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import {ReactKeycloakProvider} from "@react-keycloak/web";
import keycloak from "./auth/keycloak.js";

ReactDOM.createRoot(document.getElementById('root')).render(
    <ReactKeycloakProvider authClient={keycloak}>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </ReactKeycloakProvider>
);