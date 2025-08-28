import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import NavBar from "./components/NavBar.jsx";
import {ReactKeycloakProvider} from "@react-keycloak/web";
import keycloak from "./auth/keycloak.js";

ReactDOM.createRoot(document.getElementById('root')).render(
    <ReactKeycloakProvider authClient={keycloak}>
        <BrowserRouter>
            <NavBar/>
            <App/>

        </BrowserRouter>
    </ReactKeycloakProvider>
);
