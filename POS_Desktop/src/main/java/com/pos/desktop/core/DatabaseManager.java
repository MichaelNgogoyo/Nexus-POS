package com.pos.desktop.core;

import com.pos.desktop.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.stream.Collectors;

public class DatabaseManager implements AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(DatabaseManager.class);

    private final String url;

    public DatabaseManager(AppConfig config) {
        this.url = "jdbc:sqlite:" + config.getLocalDbPath();
        ensureDirectory(config.getLocalDbPath());
        initSchema();
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url);
    }

    private void ensureDirectory(String dbPath) {
        Path parent = Path.of(dbPath).toAbsolutePath().getParent();
        if (parent != null) {
            try {
                Files.createDirectories(parent);
            } catch (IOException e) {
                throw new IllegalStateException("Unable to create directory for SQLite database", e);
            }
        }
    }

    private void initSchema() {
        try (Connection conn = getConnection()) {
            String ddl = readResource("db/schema.sql");
            for (String statement : ddl.split(";")) {
                String trimmed = statement.trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                try (Statement st = conn.createStatement()) {
                    st.execute(trimmed);
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize local schema", e);
        }
    }

    private String readResource(String name) throws IOException {
        try (InputStream in = DatabaseManager.class.getClassLoader().getResourceAsStream(name)) {
            if (in == null) {
                throw new IOException("Resource not found: " + name);
            }
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
                return reader.lines().collect(Collectors.joining("\n"));
            }
        }
    }

    @Override
    public void close() {
        // DriverManager pooled connections close automatically when GC'ed; nothing explicit required.
        log.info("Database manager closed.");
    }
}
