package com.oncf.pfe.questionnaire;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class QuestionnaireService {

    private final QuestionnaireRepository repo;

    // Calcule le % de chaque réponse pour chaque question numérique (1=Tout à fait d'accord, 4=Pas du tout d'accord)
    public Map<String, Object> getResultats(Integer exercice) {
        List<QuestionnaireReponse> reponses = repo.findByExerciceOrderByCreatedAtDesc(exercice);
        int total = reponses.size();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exercice", exercice);
        result.put("totalReponses", total);

        if (total == 0) return result;

        // Questions numériques Q2-Q36
        String[] qNums = {"q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13",
                           "q14","q15","q16","q17","q18","q19","q20","q21","q22","q23",
                           "q24","q25","q26","q27","q28","q29","q30","q31","q32",
                           "q33","q34","q35","q36"};

        Map<String, Map<String, Object>> questionsStats = new LinkedHashMap<>();
        for (String q : qNums) {
            int[] counts = new int[4]; // index 0=tout à fait, 1=d'accord, 2=pas d'accord, 3=pas du tout
            for (QuestionnaireReponse r : reponses) {
                Integer val = getVal(r, q);
                if (val != null && val >= 1 && val <= 4) counts[val - 1]++;
            }
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("toutAFaitDaccord", pct(counts[0], total));
            stats.put("daccord", pct(counts[1], total));
            stats.put("pasDaccord", pct(counts[2], total));
            stats.put("pasDuToutDaccord", pct(counts[3], total));
            stats.put("counts", new int[]{counts[0], counts[1], counts[2], counts[3]});
            // Score moyen (1=positif, 4=négatif)
            double sum = 0;
            int n = 0;
            for (int i = 0; i < 4; i++) { sum += counts[i] * (i + 1); n += counts[i]; }
            stats.put("scoreMoyen", n > 0 ? Math.round((sum / n) * 100.0) / 100.0 : 0);
            questionsStats.put(q, stats);
        }
        result.put("questions", questionsStats);

        // Stats fiche signalétique Q37-Q41
        result.put("q37", countStrings(reponses, "q37"));
        result.put("q38", countStrings(reponses, "q38"));
        result.put("q39", countStrings(reponses, "q39"));
        result.put("q40", countStrings(reponses, "q40"));
        result.put("q41", countStrings(reponses, "q41"));

        // Commentaires Q42
        List<String> commentaires = new ArrayList<>();
        for (QuestionnaireReponse r : reponses) {
            if (r.getQ42() != null && !r.getQ42().isBlank()) commentaires.add(r.getQ42());
        }
        result.put("commentaires", commentaires);

        // Score par axe
        Map<String, Double> scoresAxes = new LinkedHashMap<>();
        scoresAxes.put("Axe1_Confiance", avgScore(reponses, "q2","q3","q4","q5","q6","q7"));
        scoresAxes.put("Axe2_Hierarchie", avgScore(reponses, "q8","q9","q10","q11","q12","q13"));
        scoresAxes.put("Axe3_Communication", avgScore(reponses, "q14","q15","q16","q17"));
        scoresAxes.put("Axe4_Liberte", avgScore(reponses, "q18","q19","q20"));
        scoresAxes.put("Axe5_Signalement", avgScore(reponses, "q21","q22","q23"));
        scoresAxes.put("Axe6_Punition", avgScore(reponses, "q24","q25","q26"));
        scoresAxes.put("Axe7_Equipe", avgScore(reponses, "q27","q28","q29","q30"));
        scoresAxes.put("Axe8_ChargeT", avgScore(reponses, "q31","q32"));
        scoresAxes.put("Axe9_Amelior", avgScore(reponses, "q33","q34","q35","q36"));
        result.put("scoresAxes", scoresAxes);

        return result;
    }

    private double pct(int count, int total) {
        return total > 0 ? Math.round((count * 100.0 / total) * 10.0) / 10.0 : 0;
    }

    private Integer getVal(QuestionnaireReponse r, String q) {
        return switch (q) {
            case "q2" -> r.getQ2(); case "q3" -> r.getQ3(); case "q4" -> r.getQ4();
            case "q5" -> r.getQ5(); case "q6" -> r.getQ6(); case "q7" -> r.getQ7();
            case "q8" -> r.getQ8(); case "q9" -> r.getQ9(); case "q10" -> r.getQ10();
            case "q11" -> r.getQ11(); case "q12" -> r.getQ12(); case "q13" -> r.getQ13();
            case "q14" -> r.getQ14(); case "q15" -> r.getQ15(); case "q16" -> r.getQ16();
            case "q17" -> r.getQ17(); case "q18" -> r.getQ18(); case "q19" -> r.getQ19();
            case "q20" -> r.getQ20(); case "q21" -> r.getQ21(); case "q22" -> r.getQ22();
            case "q23" -> r.getQ23(); case "q24" -> r.getQ24(); case "q25" -> r.getQ25();
            case "q26" -> r.getQ26(); case "q27" -> r.getQ27(); case "q28" -> r.getQ28();
            case "q29" -> r.getQ29(); case "q30" -> r.getQ30(); case "q31" -> r.getQ31();
            case "q32" -> r.getQ32(); case "q33" -> r.getQ33(); case "q34" -> r.getQ34();
            case "q35" -> r.getQ35(); case "q36" -> r.getQ36();
            default -> null;
        };
    }

    private String getStr(QuestionnaireReponse r, String q) {
        return switch (q) {
            case "q37" -> r.getQ37(); case "q38" -> r.getQ38();
            case "q39" -> r.getQ39(); case "q40" -> r.getQ40(); case "q41" -> r.getQ41();
            default -> null;
        };
    }

    private Map<String, Integer> countStrings(List<QuestionnaireReponse> reponses, String q) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (QuestionnaireReponse r : reponses) {
            String v = getStr(r, q);
            if (v != null) counts.merge(v, 1, Integer::sum);
        }
        return counts;
    }

    private double avgScore(List<QuestionnaireReponse> reponses, String... qs) {
        double sum = 0; int n = 0;
        for (QuestionnaireReponse r : reponses) {
            for (String q : qs) {
                Integer v = getVal(r, q);
                if (v != null) { sum += v; n++; }
            }
        }
        return n > 0 ? Math.round((sum / n) * 100.0) / 100.0 : 0;
    }
}