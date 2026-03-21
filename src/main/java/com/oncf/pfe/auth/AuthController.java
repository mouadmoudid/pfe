package com.oncf.pfe.auth;

import com.oncf.pfe.auth.dto.ChangePasswordRequest;
import com.oncf.pfe.user.User;
import org.springframework.security.core.Authentication;
import com.oncf.pfe.auth.dto.LoginRequest;
import com.oncf.pfe.auth.dto.LoginResponse;
import com.oncf.pfe.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body("Utilisateur créé avec succès");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        authService.changePassword(user, request.getNewPassword());
        return ResponseEntity.ok("Mot de passe mis à jour");
    }
}