package com.oncf.pfe.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Liste tous les utilisateurs — ADMIN uniquement
    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // Liste tous les agents — accessible aux 4 rôles superviseurs
    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getAgents() {
        return ResponseEntity.ok(userRepository.findByRole(Role.AGENT));
    }

    // Activer / désactiver un compte — ADMIN uniquement
    @PatchMapping("/users/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
        return ResponseEntity.ok(user.isEnabled() ? "Compte activé" : "Compte désactivé");
    }

    // Changer le rôle — ADMIN uniquement
    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> changeRole(
            @PathVariable Long id,
            @RequestParam Role role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setRole(role);
        userRepository.save(user);
        return ResponseEntity.ok("Rôle mis à jour : " + role);
    }

    // Supprimer — ADMIN uniquement
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok("Utilisateur supprimé");
    }

    // Toggle collaborateur status — ADMIN uniquement
    @PatchMapping("/users/{id}/collaborateur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleCollaborateur(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setCollaborateur(!user.isCollaborateur());
        userRepository.save(user);
        return ResponseEntity.ok(user.isCollaborateur() ? "Marqué collaborateur" : "Retiré collaborateur");
    }

    // Liste des collaborateurs — accessible aux 4 rôles superviseurs
    @GetMapping("/collaborateurs")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getCollaborateurs() {
        return ResponseEntity.ok(
            userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.AGENT && u.isCollaborateur())
                .toList()
        );
    }

    // Recherche par matricule — accessible aux 4 rôles superviseurs
    @GetMapping("/by-matricule/{matricule}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
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