package com.pos.desktop.core;

import com.pos.desktop.auth.SessionStore;
import com.pos.desktop.config.AppConfig;
import com.pos.desktop.model.OperationType;
import com.pos.desktop.model.SyncJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class SyncService implements AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    private final NetworkClient networkClient;
    private final SyncQueueStore queueStore;
    private final LocalEntityStore entityStore;
    private final SessionStore sessionStore;
    private final AppConfig config;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final AtomicBoolean syncing = new AtomicBoolean(false);

    public SyncService(NetworkClient networkClient, SyncQueueStore queueStore, LocalEntityStore entityStore, SessionStore sessionStore, AppConfig config) {
        this.networkClient = networkClient;
        this.queueStore = queueStore;
        this.entityStore = entityStore;
        this.sessionStore = sessionStore;
        this.config = config;
    }

    public void start() {
        scheduler.scheduleAtFixedRate(this::processQueue, 5, config.getSyncIntervalSeconds(), TimeUnit.SECONDS);
    }

    public void triggerOnce() {
        scheduler.submit(this::processQueue);
    }

    private void processQueue() {
        if (!syncing.compareAndSet(false, true)) {
            return;
        }
        try {
            if (!networkClient.isOnline()) {
                log.debug("Offline; postponing sync run.");
                return;
            }
            List<SyncJob> jobs = queueStore.nextBatch(config.getSyncBatchSize());
            if (jobs.isEmpty()) {
                return;
            }
            log.info("Syncing {} queued operations", jobs.size());
            for (SyncJob job : jobs) {
                boolean success = handle(job);
                if (success) {
                    queueStore.delete(job.id());
                    entityStore.markClean(job.entityType(), job.entityId());
                } else {
                    queueStore.incrementAttempts(job.id());
                }
            }
        } finally {
            syncing.set(false);
        }
    }

    private boolean handle(SyncJob job) {
        String path = job.entityType().apiPath() + "/" + job.entityId();
        Optional<String> token = sessionStore.token();
        return switch (job.operation()) {
            case UPSERT -> networkClient.putJson(path, job.payload(), token).isPresent();
            case DELETE -> networkClient.delete(path, token).isPresent();
        };
    }

    @Override
    public void close() {
        scheduler.shutdownNow();
    }
}
