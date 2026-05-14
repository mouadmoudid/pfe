package com.oncf.pfe.user;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EntityManager em;

    @Transactional
    public void deleteUser(Long id) {
        User target = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur non trouvé"));

        if (target.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de supprimer un compte administrateur");
        }

        // Nullify nullable FK references before deleting the user
        em.createQuery("UPDATE Task t SET t.assignedTo = null WHERE t.assignedTo.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Task t SET t.assignedBy = null WHERE t.assignedBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE PlanningTask t SET t.assignedTo = null WHERE t.assignedTo.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE PlanningTask t SET t.createdBy = null WHERE t.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE CheckList c SET c.createdBy = null WHERE c.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Rex r SET r.createdBy = null WHERE r.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Race r SET r.createdBy = null WHERE r.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE QuestionnaireCampagne q SET q.createdBy = null WHERE q.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE RemonteeCampagne r SET r.createdBy = null WHERE r.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Referentiel r SET r.createdBy = null WHERE r.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE FicheSuivi f SET f.collaborateur = null WHERE f.collaborateur.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Astreinte a SET a.createdBy = null WHERE a.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE Astreinte a SET a.updatedBy = null WHERE a.updatedBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE CongeEntree c SET c.createdBy = null WHERE c.createdBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE CongeEntree c SET c.updatedBy = null WHERE c.updatedBy.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("UPDATE CongeConfig c SET c.createdBy = null WHERE c.createdBy.id = :id").setParameter("id", id).executeUpdate();

        // Delete records where user is the primary subject (non-nullable FK)
        em.createQuery("DELETE FROM Astreinte a WHERE a.collaborateur.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("DELETE FROM CongeEntree c WHERE c.collaborateur.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("DELETE FROM CongeConfig c WHERE c.collaborateur.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("DELETE FROM RemonteeInfo r WHERE r.collaborateur.id = :id").setParameter("id", id).executeUpdate();

        // conge_prevu has no JPA entity (orphan table) — clean via native SQL
        em.createNativeQuery("DELETE FROM conge_prevu WHERE collaborateur_id = :id").setParameter("id", id).executeUpdate();

        em.flush();
        em.clear();

        userRepository.deleteById(id);
    }

    @Transactional
    public String toggleUser(Long id) {
        User target = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur non trouvé"));

        if (target.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de modifier un compte administrateur");
        }

        target.setEnabled(!target.isEnabled());
        userRepository.save(target);
        return target.isEnabled() ? "Compte activé" : "Compte désactivé";
    }

    @Transactional
    public String changeRole(Long id, Role role) {
        User target = userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur non trouvé"));

        if (target.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de modifier le rôle d'un administrateur");
        }

        target.setRole(role);
        userRepository.save(target);
        return "Rôle mis à jour : " + role;
    }
}
