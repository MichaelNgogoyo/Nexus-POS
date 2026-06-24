package com.pos.desktop.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pos.desktop.model.EntityType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class LocalEntityStore {
    private static final Logger log = LoggerFactory.getLogger(LocalEntityStore.class);

    private final DatabaseManager db;
    private final ObjectMapper mapper;

    public LocalEntityStore(DatabaseManager db) {
        this.db = db;
        this.mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public <T> void upsert(EntityType type, String id, T payload, boolean dirty) {
        String sql = "INSERT INTO entities (id, entity_type, payload, updated_at, dirty) VALUES (?,?,?,?,?) " +
                "ON CONFLICT(id, entity_type) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, dirty = excluded.dirty";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, type.name());
            ps.setString(3, mapper.writeValueAsString(payload));
            ps.setString(4, LocalDateTime.now().toString());
            ps.setInt(5, dirty ? 1 : 0);
            ps.executeUpdate();
        } catch (Exception e) {
            log.error("Failed to upsert {} with id {}", type, id, e);
            throw new IllegalStateException(e);
        }
    }

    public void markClean(EntityType type, String id) {
        String sql = "UPDATE entities SET dirty = 0 WHERE id = ? AND entity_type = ?";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, type.name());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    public void delete(EntityType type, String id) {
        String sql = "DELETE FROM entities WHERE id = ? AND entity_type = ?";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, type.name());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    public <T> List<T> list(EntityType type, Class<T> clazz) {
        List<T> items = new ArrayList<>();
        String sql = "SELECT payload FROM entities WHERE entity_type = ? ORDER BY updated_at DESC";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type.name());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String payload = rs.getString("payload");
                    items.add(mapper.readValue(payload, clazz));
                }
            }
        } catch (Exception e) {
            log.error("Failed to list entities for type {}", type, e);
        }
        return items;
    }

    public <T> List<T> listDirty(EntityType type, Class<T> clazz) {
        List<T> items = new ArrayList<>();
        String sql = "SELECT payload FROM entities WHERE entity_type = ? AND dirty = 1";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type.name());
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    items.add(mapper.readValue(rs.getString("payload"), clazz));
                }
            }
        } catch (Exception e) {
            log.error("Failed to list dirty entities for type {}", type, e);
        }
        return items;
    }
}
