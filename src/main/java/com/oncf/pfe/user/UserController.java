package com.oncf.pfe.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final EntiteVisibilityHelper entiteVisibilityHelper;

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getAllUsers(Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        List<String> visible = entiteVisibilityHelper.getVisibleEntites(currentUser);
        if (visible == null) return ResponseEntity.ok(userRepository.findAll());
        return ResponseEntity.ok(userRepository.findByEntiteIn(visible));
    }

    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getAgents(Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        List<String> visible = entiteVisibilityHelper.getVisibleEntites(currentUser);
        if (visible == null) return ResponseEntity.ok(userRepository.findByRole(Role.AGENT));
        return ResponseEntity.ok(userRepository.findByRoleAndEntiteIn(Role.AGENT, visible));
    }

    @PatchMapping("/users/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.toggleUser(id));
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> changeRole(
            @PathVariable Long id,
            @RequestParam Role role) {
        return ResponseEntity.ok(userService.changeRole(id, role));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("Utilisateur supprimé");
    }

    @PatchMapping("/users/{id}/collaborateur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> toggleCollaborateur(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setCollaborateur(!user.isCollaborateur());
        userRepository.save(user);
        return ResponseEntity.ok(user.isCollaborateur() ? "Marqué collaborateur" : "Retiré collaborateur");
    }

    @GetMapping("/collaborateurs")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<User>> getCollaborateurs(Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        List<String> visible = entiteVisibilityHelper.getVisibleEntites(currentUser);
        List<User> base = (visible == null) ? userRepository.findAll() : userRepository.findByEntiteIn(visible);
        return ResponseEntity.ok(
            base.stream().filter(u -> u.getRole() == Role.AGENT && u.isCollaborateur()).toList()
        );
    }

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
