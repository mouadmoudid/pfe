package com.oncf.pfe.auth;

import com.oncf.pfe.user.Role;
import com.oncf.pfe.auth.dto.LoginRequest;
import com.oncf.pfe.auth.dto.LoginResponse;
import com.oncf.pfe.auth.dto.RegisterRequest;
import com.oncf.pfe.security.JwtService;
import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();
        String token = jwtService.generateToken(user);
        return LoginResponse.builder()
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .firstLogin(user.isFirstLogin())
                .entite(user.getEntite())
                .matricule(user.getMatricule())
                .build();
    }

    public void register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email déjà utilisé");
        }

        boolean isFirstLogin = request.getRole() != Role.ADMIN;

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .matricule(request.getMatricule())
                .prenom(request.getPrenom())
                .dateNaissance(request.getDateNaissance())
                .entite(request.getEntite())
                .residence(request.getResidence())
                .fonctionAssuree(request.getFonctionAssuree())
                .dateFonction(request.getDateFonction())
                .poste(request.getPoste())
                .siteUp(request.getSiteUp())
                .telephone(request.getTelephone())
                .firstLogin(isFirstLogin)
                .build();

        userRepository.save(user);
    }

    public void changePassword(User user, String newPassword) {
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFirstLogin(false);
        userRepository.save(user);
    }
}