package com.pos.desktop.ui.controller;

import com.pos.desktop.auth.SessionStore;
import com.pos.desktop.core.NetworkClient;
import com.pos.desktop.core.SyncService;
import com.pos.desktop.model.Product;
import com.pos.desktop.service.ModuleService;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.ChoiceBox;
import javafx.scene.control.Label;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Optional;

public class DashboardController {
    @FXML private Label userLabel;
    @FXML private Button syncButton;
    @FXML private FlowPane productFlow;
    @FXML private Label cashierCountLabel;
    @FXML private Label productCountLabel;
    @FXML private Label revenueLabel;
    @FXML private Label orderCountLabel;
    @FXML private Label todayRevenueLabel;
    @FXML private ChoiceBox<String> yearChoice;

    private final ModuleService<Product> productService;
    private final SessionStore sessionStore;
    private final NetworkClient networkClient;
    private final SyncService syncService;

    public DashboardController(ModuleService<Product> productService,
                               SessionStore sessionStore,
                               NetworkClient networkClient,
                               SyncService syncService) {
        this.productService = productService;
        this.sessionStore = sessionStore;
        this.networkClient = networkClient;
        this.syncService = syncService;
    }

    @FXML
    private void initialize() {
        userLabel.setText(sessionStore.user().map(u -> "Signed in as " + u.username()).orElse(""));
        yearChoice.getItems().setAll("2024", "2025", "2026", "2027");
        yearChoice.getSelectionModel().select("2026");
        syncButton.setOnAction(e -> {
            syncService.triggerOnce();
            loadProducts();
        });
        loadProducts();
    }

    private void loadProducts() {
        List<Product> products = productService.fetchAll();
        productCountLabel.setText(String.valueOf(products.size()));
        cashierCountLabel.setText("4");
        revenueLabel.setText("6535");
        orderCountLabel.setText("18");
        todayRevenueLabel.setText("5399.0 aujourd'hui");
        Platform.runLater(() -> {
            productFlow.getChildren().clear();
            for (Product p : products) {
                productFlow.getChildren().add(buildProductCard(p));
            }
        });
    }

    private VBox buildProductCard(Product product) {
        VBox card = new VBox(6);
        card.getStyleClass().add("product-card");
        card.setPadding(new Insets(10));
        card.setPrefWidth(220);

        ImageView imageView = new ImageView();
        imageView.setFitWidth(200);
        imageView.setFitHeight(140);
        imageView.setPreserveRatio(true);
        imageView.getStyleClass().add("product-image");
        loadImage(product, imageView);

        Text name = new Text(product.name());
        name.getStyleClass().add("product-name");

        Text price = new Text(String.format("$%.2f", product.price()));
        price.getStyleClass().add("product-price");

        Text qty = new Text("Qty: " + product.quantity());
        qty.getStyleClass().add("product-qty");

        card.getChildren().addAll(imageView, name, price, qty);
        return card;
    }

    private void loadImage(Product product, ImageView imageView) {
        String path = "/api/product/" + product.id() + "/image";
        Optional<byte[]> bytes = networkClient.getBytes(path, sessionStore.token());
        bytes.ifPresent(data -> imageView.setImage(new Image(new ByteArrayInputStream(data))));
    }
}
