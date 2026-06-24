package com.pos.desktop.ui.controller;

import com.pos.desktop.auth.AuthService;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;

import java.util.function.Consumer;

public class LoginController {

    @FXML private TextField usernameField;
    @FXML private PasswordField passwordField;
    @FXML private Button loginButton;
    @FXML private Label statusLabel;

    private final AuthService authService;
    private final Consumer<Void> onSuccess;

    public LoginController(AuthService authService, Consumer<Void> onSuccess) {
        this.authService = authService;
        this.onSuccess = onSuccess;
    }

    @FXML
    private void initialize() {
        loginButton.setOnAction(e -> doLogin());
    }

    private void doLogin() {
        boolean ok = authService.login(usernameField.getText(), passwordField.getText());
        if (ok) {
            statusLabel.setText("Authenticated");
            onSuccess.accept(null);
        } else {
            statusLabel.setText("Login failed (check network or credentials)");
        }
    }
}
