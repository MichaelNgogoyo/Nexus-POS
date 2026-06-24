package com.pos.desktop;

import com.pos.desktop.auth.AuthService;
import com.pos.desktop.auth.SessionStore;
import com.pos.desktop.config.AppConfig;
import com.pos.desktop.core.DatabaseManager;
import com.pos.desktop.core.LocalEntityStore;
import com.pos.desktop.core.NetworkClient;
import com.pos.desktop.core.SyncQueueStore;
import com.pos.desktop.core.SyncService;
import com.pos.desktop.model.EntityType;
import com.pos.desktop.model.InventoryItem;
import com.pos.desktop.model.Product;
import com.pos.desktop.model.ReportEntry;
import com.pos.desktop.model.Sale;
import com.pos.desktop.model.UserAccount;
import com.pos.desktop.service.ModuleService;
import com.pos.desktop.ui.LoginPane;
import com.pos.desktop.ui.MainPane;
import com.pos.desktop.ui.controller.LoginController;
import com.pos.desktop.ui.controller.DashboardController;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PosDesktopApplication extends Application {
    private static final Logger log = LoggerFactory.getLogger(PosDesktopApplication.class);

    private AppConfig config;
    private DatabaseManager databaseManager;
    private LocalEntityStore entityStore;
    private SyncQueueStore queueStore;
    private SessionStore sessionStore;
    private NetworkClient networkClient;
    private SyncService syncService;
    private AuthService authService;

    private ModuleService<Product> productService;
    private ModuleService<InventoryItem> inventoryService;
    private ModuleService<Sale> salesService;
    private ModuleService<ReportEntry> reportsService;
    private ModuleService<UserAccount> usersService;

    @Override
    public void init() {
        log.info("Bootstrapping POS Desktop");
        config = AppConfig.fromProperties();
        networkClient = new NetworkClient(config);
        databaseManager = new DatabaseManager(config);
        entityStore = new LocalEntityStore(databaseManager);
        queueStore = new SyncQueueStore(databaseManager);
        sessionStore = new SessionStore();
        syncService = new SyncService(networkClient, queueStore, entityStore, sessionStore, config);
        authService = new AuthService(networkClient, sessionStore, entityStore, queueStore, config);

        productService = new ModuleService<>(EntityType.PRODUCT, Product.class, entityStore, queueStore, networkClient, sessionStore);
        inventoryService = new ModuleService<>(EntityType.INVENTORY, InventoryItem.class, entityStore, queueStore, networkClient, sessionStore);
        salesService = new ModuleService<>(EntityType.SALE, Sale.class, entityStore, queueStore, networkClient, sessionStore);
        reportsService = new ModuleService<>(EntityType.REPORT, ReportEntry.class, entityStore, queueStore, networkClient, sessionStore);
        usersService = new ModuleService<>(EntityType.USER, UserAccount.class, entityStore, queueStore, networkClient, sessionStore);
    }

    @Override
    public void start(Stage stage) {
        syncService.start();
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/login.fxml"));
            loader.setControllerFactory(param -> new LoginController(authService, v -> showMain(stage)));
            Scene scene = new Scene(loader.load(), 400, 400);
            scene.getStylesheets().add(getClass().getResource("/ui.css").toExternalForm());
            stage.setTitle("POS Desktop");
            stage.setScene(scene);
            stage.setMinWidth(400);
            stage.setMinHeight(400);
            stage.setMaxWidth(400);
            stage.setMaxHeight(400);
            stage.setResizable(false);
            stage.show();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load login UI", e);
        }
    }

    private void showMain(Stage stage) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/dashboard.fxml"));
            loader.setControllerFactory(param -> new DashboardController(productService, sessionStore, networkClient, syncService));
            Scene scene = new Scene(loader.load(), 1200, 800);
            scene.getStylesheets().add(getClass().getResource("/ui.css").toExternalForm());
            stage.setScene(scene);
            stage.setMinWidth(960);
            stage.setMinHeight(640);
            stage.setMaxWidth(Double.MAX_VALUE);
            stage.setMaxHeight(Double.MAX_VALUE);
            stage.setResizable(true);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load dashboard UI", e);
        }
    }

    @Override
    public void stop() {
        log.info("Shutting down POS Desktop");
        syncService.close();
        databaseManager.close();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
