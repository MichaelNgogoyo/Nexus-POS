package com.pos.desktop.ui;

import com.pos.desktop.model.InventoryItem;
import com.pos.desktop.model.Product;
import com.pos.desktop.model.ReportEntry;
import com.pos.desktop.model.Sale;
import com.pos.desktop.model.UserAccount;
import com.pos.desktop.service.ModuleService;
import com.pos.desktop.ui.components.ModulePane;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Tab;
import javafx.scene.control.TabPane;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.shape.Circle;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class MainPane extends BorderPane {
    public MainPane(ModuleService<Product> products,
                    ModuleService<InventoryItem> inventory,
                    ModuleService<Sale> sales,
                    ModuleService<ReportEntry> reports,
                    ModuleService<UserAccount> users,
                    com.pos.desktop.auth.SessionStore sessionStore,
                    com.pos.desktop.core.NetworkClient networkClient,
                    com.pos.desktop.core.SyncService syncService) {
        setPadding(new Insets(0));

        HBox toolbar = buildToolbar(sessionStore, networkClient, syncService);
        TabPane tabs = new TabPane();

        ModulePane productsPane = new ModulePane("Products", "Browse and manage catalog", () -> stringify(products.fetchAll()), syncService::triggerOnce);
        ModulePane inventoryPane = new ModulePane("Inventory", "Stock levels and thresholds", () -> stringify(inventory.fetchAll()), syncService::triggerOnce);
        ModulePane salesPane = new ModulePane("Sales", "Recent transactions", () -> stringify(sales.fetchAll()), syncService::triggerOnce);
        ModulePane reportsPane = new ModulePane("Reports", "Performance snapshots", () -> stringify(reports.fetchAll()), syncService::triggerOnce);
        ModulePane usersPane = new ModulePane("Users", "Staff and access", () -> stringify(users.fetchAll()), syncService::triggerOnce);

        tabs.getTabs().add(tab("Products", productsPane));
        tabs.getTabs().add(tab("Inventory", inventoryPane));
        tabs.getTabs().add(tab("Sales", salesPane));
        tabs.getTabs().add(tab("Reports", reportsPane));
        tabs.getTabs().add(tab("Users", usersPane));

        VBox root = new VBox(toolbar, tabs);
        VBox.setVgrow(tabs, Priority.ALWAYS);
        setCenter(root);
    }

    private Tab tab(String title, ModulePane pane) {
        Tab tab = new Tab(title, pane);
        tab.setClosable(false);
        return tab;
    }

    private List<String> stringify(List<?> items) {
        return items.stream().map(Object::toString).collect(Collectors.toList());
    }

    private HBox buildToolbar(com.pos.desktop.auth.SessionStore sessionStore,
                              com.pos.desktop.core.NetworkClient networkClient,
                              com.pos.desktop.core.SyncService syncService) {
        Label brand = new Label("POS Desktop");
        brand.getStyleClass().add("brand-title");

        Label userLabel = new Label(sessionStore.user().map(UserAccount::username).orElse("Anonymous"));
        userLabel.getStyleClass().add("brand-subtitle");

        Circle statusDot = new Circle(6);
        updateStatusDot(statusDot, networkClient.isOnline());
        Button statusBtn = new Button("Status");
        statusBtn.getStyleClass().add("pill-button-secondary");
        statusBtn.setOnAction(e -> updateStatusDot(statusDot, networkClient.isOnline()));

        Button syncNow = new Button("Sync now");
        syncNow.getStyleClass().add("pill-button");
        syncNow.setOnAction(e -> syncService.triggerOnce());

        HBox left = new HBox(8, statusDot, brand, userLabel);
        left.setAlignment(Pos.CENTER_LEFT);

        HBox right = new HBox(8, statusBtn, syncNow);
        right.setAlignment(Pos.CENTER_RIGHT);

        HBox bar = new HBox(16, left, right);
        bar.setPadding(new Insets(12));
        bar.getStyleClass().add("top-toolbar");
        HBox.setHgrow(right, Priority.ALWAYS);

        return bar;
    }

    private void updateStatusDot(Circle dot, boolean online) {
        dot.setFill(online ? javafx.scene.paint.Color.web("#22c55e") : javafx.scene.paint.Color.web("#f97316"));
    }
}
