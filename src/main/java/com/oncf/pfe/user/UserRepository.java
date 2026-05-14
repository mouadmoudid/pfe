package com.oncf.pfe.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByRole(Role role);
    boolean existsByMatricule(String matricule);
    List<User> findByEntiteIn(List<String> entites);
    List<User> findByRoleAndEntiteIn(Role role, List<String> entites);
}
