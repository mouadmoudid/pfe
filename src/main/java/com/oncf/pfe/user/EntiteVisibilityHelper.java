package com.oncf.pfe.user;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class EntiteVisibilityHelper {

    private static final Map<String, List<String>> CSPR_SUBORDINATES = Map.of(
        "CT Voie", List.of("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  List.of("CDT 101LC", "CDT 101SST")
    );

    /**
     * Returns the entites visible to this user, or null if they see everything (CET / ADMIN).
     */
    public List<String> getVisibleEntites(User user) {
        Role role = user.getRole();
        String entite = user.getEntite();

        if (role == Role.CET || role == Role.ADMIN) {
            return null; // no filter
        }
        if (role == Role.CSPR) {
            List<String> subs = CSPR_SUBORDINATES.get(entite);
            return subs != null ? subs : List.of();
        }
        // CGPX: only their own entite
        return entite != null ? List.of(entite) : List.of();
    }
}
