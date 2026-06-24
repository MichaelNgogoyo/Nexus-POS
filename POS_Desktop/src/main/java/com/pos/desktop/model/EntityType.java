package com.pos.desktop.model;

public enum EntityType {
    PRODUCT("product"),
    INVENTORY("inventory"),
    SALE("../sale"),
    REPORT("reports"),
    USER("user");

    private final String apiPath;

    EntityType(String apiPath) {
        this.apiPath = apiPath;
    }

    public String apiPath() {
        return apiPath;
    }
}
