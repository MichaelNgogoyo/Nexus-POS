import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
    url: 'http://localhost:8081',
    realm: 'pos',
    clientId: 'poskeycloakid'
});

export default keycloak;