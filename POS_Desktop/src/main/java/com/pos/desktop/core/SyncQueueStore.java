package com.pos.desktop.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.pos.desktop.model.EntityType;
import com.pos.desktop.model.OperationType;
import com.pos.desktop.model.SyncJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class SyncQueueStore {
    private static final Logger log = LoggerFactory.getLogger(SyncQueueStore.class);

    private final DatabaseManager db;
    private final ObjectMapper mapper;

    public SyncQueueStore(DatabaseManager db) {
        this.db = db;
        this.mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public void enqueue(EntityType type, String entityId, OperationType operation, Object payload) {
        String sql = "INSERT INTO sync_queue (entity_type, entity_id, operation, payload, created_at) VALUES (?,?,?,?,?)";
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, type.name());
            ps.setString(2, entityId);
            ps.setString(3, operation.name());
            ps.setString(4, mapper.writeValueAsString(payload));
            ps.setString(5, LocalDateTime.now().toString());
            ps.executeUpdate();
        } catch (Exception e) {
            log.error("Failed to enqueue sync job for {} {}", type, entityId, e);
            throw new IllegalStateException(e);
        }
    }

    public List<SyncJob> nextBatch(int limit) {
        String sql = "SELECT id, entity_type, entity_id, operation, payload, created_at, attempts FROM sync_queue ORDER BY created_at LIMIT ?";
        List<SyncJob> jobs = new ArrayList<>();
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    jobs.add(new SyncJob(
                            rs.getLong("id"),
                            EntityType.valueOf(rs.getString("entity_type")),
                            rs.getString("entity_id"),
                            OperationType.valueOf(rs.getString("operation")),
                            rs.getString("payload"),
                            LocalDateTime.parse(rs.getString("created_at")),
                            rs.getInt("attempts")));
                }
            }
        } catch (SQLException e) {
            log.error("Failed to fetch sync batch", e);
        }
        return jobs;
    }

    public void delete(long id) {
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement("DELETE FROM sync_queue WHERE id = ?")) {
            ps.setLong(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }

    public void incrementAttempts(long id) {
        try (Connection conn = db.getConnection(); PreparedStatement ps = conn.prepareStatement("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?")) {
            ps.setLong(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
    }
}
