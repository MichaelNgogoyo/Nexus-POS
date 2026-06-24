package com.pos.desktop.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pos.desktop.auth.SessionStore;
import com.pos.desktop.core.LocalEntityStore;
import com.pos.desktop.core.NetworkClient;
import com.pos.desktop.core.SyncQueueStore;
import com.pos.desktop.model.EntityType;
import com.pos.desktop.model.OperationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

public class ModuleService<T> {
    private static final Logger log = LoggerFactory.getLogger(ModuleService.class);

    private final EntityType type;
    private final Class<T> clazz;
    private final LocalEntityStore entityStore;
    private final SyncQueueStore queueStore;
    private final NetworkClient networkClient;
    private final SessionStore sessionStore;
    private final ObjectMapper mapper;

    public ModuleService(EntityType type, Class<T> clazz, LocalEntityStore entityStore, SyncQueueStore queueStore, NetworkClient networkClient, SessionStore sessionStore) {
        this.type = type;
        this.clazz = clazz;
        this.entityStore = entityStore;
        this.queueStore = queueStore;
        this.networkClient = networkClient;
        this.sessionStore = sessionStore;
        this.mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public List<T> fetchAll() {
        Optional<String> response = networkClient.get("/" + type.apiPath(), sessionStore.token());
        if (response.isPresent()) {
            try {
                List<T> items = mapper.readValue(
                        response.get(),
                        mapper.getTypeFactory().constructCollectionType(List.class, clazz));
                // Persist locally for offline use
                for (T item : items) {
                    String id = extractId(item);
                    if (id != null) {
                        entityStore.upsert(type, id, item, false);
                    }
                }
                return items;
            } catch (Exception e) {
                log.error("Failed to parse remote {} list", type, e);
            }
        }
        // Remote failed: fall back to cached entities
        return entityStore.list(type, clazz);
    }

    public void upsert(String id, T payload) {
        entityStore.upsert(type, id, payload, !networkClient.isOnline());
        if (networkClient.isOnline()) {
            networkClient.putJson("/" + type.apiPath() + "/" + id, toJson(payload), sessionStore.token());
        } else {
            queueStore.enqueue(type, id, OperationType.UPSERT, payload);
        }
    }

    public void delete(String id) {
        entityStore.delete(type, id);
        if (networkClient.isOnline()) {
            networkClient.delete("/" + type.apiPath() + "/" + id, sessionStore.token());
        } else {
            queueStore.enqueue(type, id, OperationType.DELETE, Collections.emptyMap());
        }
    }

    private String toJson(T payload) {
        try {
            return mapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize payload", e);
        }
    }

    private String extractId(T payload) {
        try {
            Object id = payload.getClass().getMethod("id").invoke(payload);
            return id == null ? null : String.valueOf(id);
        } catch (Exception e) {
            log.warn("Unable to extract id from payload of type {}", payload.getClass().getSimpleName());
            return null;
        }
    }
}
