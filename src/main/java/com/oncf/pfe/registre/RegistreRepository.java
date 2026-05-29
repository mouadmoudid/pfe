package com.oncf.pfe.registre;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RegistreRepository extends JpaRepository<RegistreDanger, Long> {

    List<RegistreDanger> findByAnneeRegistreOrderByDangerAsc(Integer anneeRegistre);

    List<RegistreDanger> findByAnneeRegistreAndEntiteInOrderByDangerAsc(
        Integer anneeRegistre, List<String> entites);

    @Query("SELECT DISTINCT r.anneeRegistre FROM RegistreDanger r ORDER BY r.anneeRegistre DESC")
    List<Integer> findDistinctAnnees();

    @Query("SELECT DISTINCT r.anneeRegistre FROM RegistreDanger r WHERE r.entite IN :entites ORDER BY r.anneeRegistre DESC")
    List<Integer> findDistinctAnneesByEntiteIn(
        @Param("entites") List<String> entites);
}
