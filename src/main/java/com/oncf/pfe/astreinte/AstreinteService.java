package com.oncf.pfe.astreinte;

import com.oncf.pfe.user.EntiteVisibilityHelper;
import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AstreinteService {

    private final AstreinteRepository astreinteRepo;
    private final UserRepository userRepo;
    private final EntiteVisibilityHelper entiteVisibilityHelper;

    public List<Integer> getAnnees() {
        return astreinteRepo.findDistinctAnnees();
    }

    public List<AstreinteCollaborateurResponse> getPlanningAnnee(Integer annee, User currentUser) {
        List<String> visible = entiteVisibilityHelper.getVisibleEntites(currentUser);
        List<Astreinte> all = astreinteRepo.findByAnneeOrderBySemaineAscCollaborateurFullNameAsc(annee).stream()
                .filter(a -> visible == null ||
                        (a.getCollaborateur() != null && visible.contains(a.getCollaborateur().getEntite())))
                .toList();

        Map<Long, AstreinteCollaborateurResponse> map = new LinkedHashMap<>();
        for (Astreinte a : all) {
            User collab = a.getCollaborateur();
            map.computeIfAbsent(collab.getId(), id -> AstreinteCollaborateurResponse.builder()
                .collaborateurId(collab.getId())
                .fullName(collab.getFullName())
                .matricule(collab.getMatricule() != null ? collab.getMatricule() : "")
                .fonctionAssuree(collab.getFonctionAssuree() != null ? collab.getFonctionAssuree() : collab.getPoste() != null ? collab.getPoste() : "")
                .telephone(collab.getTelephone() != null ? collab.getTelephone() : "")
                .residence(collab.getResidence() != null ? collab.getResidence() : "")
                .semaines(new HashSet<>())
                .totalAstreintes(0)
                .build()
            );
            if (Boolean.TRUE.equals(a.getEnAstreinte())) {
                map.get(collab.getId()).getSemaines().add(a.getSemaine());
            }
        }

        map.values().forEach(r -> r.setTotalAstreintes(r.getSemaines().size()));
        return new ArrayList<>(map.values());
    }

    public List<AstreinteCollaborateurResponse> getSemaine(Integer annee, Integer semaine, User currentUser) {
        List<String> visible = entiteVisibilityHelper.getVisibleEntites(currentUser);
        List<Astreinte> enAstreinte = astreinteRepo.findByAnneeAndSemaineAndEnAstreinteTrue(annee, semaine).stream()
                .filter(a -> visible == null ||
                        (a.getCollaborateur() != null && visible.contains(a.getCollaborateur().getEntite())))
                .toList();

        List<AstreinteCollaborateurResponse> result = new ArrayList<>();
        for (Astreinte a : enAstreinte) {
            User collab = a.getCollaborateur();
            result.add(AstreinteCollaborateurResponse.builder()
                .collaborateurId(collab.getId())
                .fullName(collab.getFullName())
                .matricule(collab.getMatricule() != null ? collab.getMatricule() : "")
                .fonctionAssuree(collab.getFonctionAssuree() != null ? collab.getFonctionAssuree() : collab.getPoste() != null ? collab.getPoste() : "")
                .telephone(collab.getTelephone() != null ? collab.getTelephone() : "")
                .residence(collab.getResidence() != null ? collab.getResidence() : "")
                .semaines(Set.of(semaine))
                .totalAstreintes(1)
                .build());
        }
        return result;
    }

    @Transactional
    public void saveAstreinte(AstreinteRequest req, User currentUser) {
        Optional<Astreinte> existing = astreinteRepo.findByCollaborateurIdAndAnneeAndSemaine(
            req.getCollaborateurId(), req.getAnnee(), req.getSemaine());

        User collab = userRepo.findById(req.getCollaborateurId())
            .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));

        Astreinte astreinte = existing.orElse(Astreinte.builder()
            .collaborateur(collab)
            .annee(req.getAnnee())
            .semaine(req.getSemaine())
            .createdBy(currentUser)
            .build());

        astreinte.setEnAstreinte(req.getEnAstreinte());
        astreinte.setUpdatedBy(currentUser);
        astreinteRepo.save(astreinte);
    }

    @Transactional
    public void addCollaborateurToAnnee(Long collaborateurId, Integer annee, User currentUser) {
        Optional<Astreinte> existing = astreinteRepo.findByCollaborateurIdAndAnneeAndSemaine(collaborateurId, annee, 1);
        if (existing.isPresent()) return;

        User collab = userRepo.findById(collaborateurId)
            .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));

        astreinteRepo.save(Astreinte.builder()
            .collaborateur(collab)
            .annee(annee)
            .semaine(1)
            .enAstreinte(false)
            .createdBy(currentUser)
            .build());
    }

    @Transactional
    public void removeCollaborateur(Long collaborateurId, Integer annee) {
        List<Astreinte> astreintes = astreinteRepo.findByCollaborateurIdAndAnneeOrderBySemaineAsc(collaborateurId, annee);
        astreinteRepo.deleteAll(astreintes);
    }
}
