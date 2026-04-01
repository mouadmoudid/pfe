package com.oncf.pfe.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Liste tous les utilisateurs
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // Liste tous les agents (collaborateurs)
    @GetMapping("/agents")
    public ResponseEntity<List<User>> getAgents() {
        return ResponseEntity.ok(userRepository.findByRole(Role.AGENT));
    }

    // Activer / désactiver un compte
    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<String> toggleUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
        return ResponseEntity.ok(user.isEnabled() ? "Compte activé" : "Compte désactivé");
    }

    // Changer le rôle
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<String> changeRole(
            @PathVariable Long id,
            @RequestParam Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setRole(role);
        userRepository.save(user);
        return ResponseEntity.ok("Rôle mis à jour : " + role);
    }

    // Supprimer
    @DeleteMapping("/users/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok("Utilisateur supprimé");
    }

        // Toggle collaborateur status
    @PatchMapping("/users/{id}/collaborateur")
    public ResponseEntity<String> toggleCollaborateur(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setCollaborateur(!user.isCollaborateur());
        userRepository.save(user);
        return ResponseEntity.ok(user.isCollaborateur() ? "Marqué collaborateur" : "Retiré collaborateur");
    }

    // Liste uniquement les collaborateurs (agents marqués)
    @GetMapping("/collaborateurs")
    public ResponseEntity<List<User>> getCollaborateurs() {
        return ResponseEntity.ok(
            userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.AGENT && u.isCollaborateur())
                .toList()
        );
    }

    @GetMapping("/by-matricule/{matricule}")
    public ResponseEntity<?> getByMatricule(@PathVariable String matricule) {
        return userRepository.findAll().stream()
            .filter(u -> matricule.equals(u.getMatricule()))
            .findFirst()
            .map(u -> {
                java.util.Map<String, String> info = new java.util.HashMap<>();
                info.put("fullName", u.getFullName() != null ? u.getFullName() : "");
                info.put("matricule", u.getMatricule() != null ? u.getMatricule() : "");
                info.put("prenom", u.getPrenom() != null ? u.getPrenom() : "");
                info.put("dateNaissance", u.getDateNaissance() != null ? u.getDateNaissance() : "");
                info.put("entite", u.getEntite() != null ? u.getEntite() : "");
                info.put("residence", u.getResidence() != null ? u.getResidence() : "");
                info.put("fonctionAssuree", u.getFonctionAssuree() != null ? u.getFonctionAssuree() : "");
                info.put("dateFonction", u.getDateFonction() != null ? u.getDateFonction() : "");
                info.put("poste", u.getPoste() != null ? u.getPoste() : "");
                info.put("siteUp", u.getSiteUp() != null ? u.getSiteUp() : "");
                info.put("telephone", u.getTelephone() != null ? u.getTelephone() : "");
                info.put("email", u.getEmail() != null ? u.getEmail() : "");
                return ResponseEntity.ok(info);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}