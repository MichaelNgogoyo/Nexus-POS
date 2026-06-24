package com.pos.desktop.ui.components;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;

import java.util.List;
import java.util.function.Supplier;

public class ModulePane extends BorderPane {
    private final ListView<String> listView = new ListView<>();
    private final Label countLabel = new Label();
    private Supplier<List<String>> loader;

    public ModulePane(String title, String subtitle, Supplier<List<String>> loader, Runnable onSync) {
        this.loader = loader;

        Label header = new Label(title);
        header.getStyleClass().add("module-title");

        Label sub = new Label(subtitle);
        sub.getStyleClass().add("module-subtitle");

        Button refresh = new Button("Refresh");
        refresh.getStyleClass().add("pill-button");
        refresh.setOnAction(e -> reload());

        Button sync = new Button("Sync now");
        sync.getStyleClass().add("pill-button-secondary");
        sync.setOnAction(e -> onSync.run());

        HBox actions = new HBox(8, refresh, sync);
        actions.setAlignment(Pos.CENTER_RIGHT);

        VBox titles = new VBox(2, header, sub);

        HBox top = new HBox(20, titles, actions);
        top.setPadding(new Insets(12));
        top.getStyleClass().add("module-toolbar");
        top.setAlignment(Pos.CENTER_LEFT);
        HBox.setHgrow(actions, javafx.scene.layout.Priority.ALWAYS);

        listView.getStyleClass().add("module-list");

        VBox body = new VBox(6, countLabel, listView);
        body.setPadding(new Insets(12));

        setTop(top);
        setCenter(body);
        reload();
    }

    public void reload() {
        List<String> items = loader.get();
        listView.getItems().setAll(items);
        countLabel.setText(items.size() + " items");
    }

    public void updateLoader(Supplier<List<String>> loader) {
        this.loader = loader;
    }
}
