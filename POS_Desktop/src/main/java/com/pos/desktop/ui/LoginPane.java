package com.pos.desktop.ui;

import com.pos.desktop.auth.AuthService;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;

public class LoginPane extends BorderPane {
    public LoginPane(AuthService authService, Runnable onSuccess) {
        getStyleClass().add("login-root");

        TextField username = new TextField();
        username.setPromptText("Username");
        PasswordField password = new PasswordField();
        password.setPromptText("Password");
        Label status = new Label();
        status.getStyleClass().add("status-label");

        Button loginBtn = new Button("Login");
        loginBtn.getStyleClass().add("cta-button");
        loginBtn.setDefaultButton(true);
        loginBtn.setOnAction(e -> {
            boolean ok = authService.login(username.getText(), password.getText());
            if (ok) {
                status.setText("Authenticated");
                onSuccess.run();
            } else {
                status.setText("Login failed (check network or credentials)");
            }
        });

        Label heading = new Label("Apperster Systems");
        heading.getStyleClass().add("brand-title");
        Label sub = new Label("Sign in with Keycloak");
        sub.getStyleClass().add("brand-subtitle");

        VBox form = new VBox(12, heading, sub, username, password, loginBtn, status);
        form.setAlignment(Pos.CENTER);
        form.setPadding(new Insets(24));
        form.setMaxWidth(320);
        form.getStyleClass().add("login-card");

        StackPane center = new StackPane(form);
        center.setPadding(new Insets(24));
        center.setAlignment(Pos.CENTER);

        setCenter(center);
    }
}
