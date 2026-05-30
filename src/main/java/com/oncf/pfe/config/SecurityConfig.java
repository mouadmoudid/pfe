package com.oncf.pfe.config;

import com.oncf.pfe.security.JwtAuthFilter;
import com.oncf.pfe.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/*.html", "/css/**", "/js/**", "/images/**").permitAll()

                // Lecture liste utilisateurs — superviseurs autorisés
                .requestMatchers(HttpMethod.GET, "/api/admin/users").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                // Administration — gestion utilisateurs ADMIN uniquement
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                // Données lecture (agents, collaborateurs, by-matricule) → 4 rôles
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // RACI — AGENT peut consulter uniquement
                .requestMatchers(HttpMethod.GET,    "/api/raci/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/raci/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/raci/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Planning — lecture authentifiée (getAllByAnnee bloqué par @PreAuthorize dans le controller)
                // AGENT peut voir /my et /category (Planning K Veille), pas la liste complète
                .requestMatchers(HttpMethod.GET,    "/api/planning/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/planning/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PATCH,  "/api/planning/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/planning/**").hasAnyRole("ADMIN","CGPX")

                // Checklists — AGENT exclu sauf /raci (lecture registre RACI autorisée)
                .requestMatchers(HttpMethod.GET,    "/api/checklists/raci").authenticated()
                .requestMatchers(HttpMethod.GET,    "/api/checklists/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/checklists/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PATCH,  "/api/checklists/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/checklists/**").hasAnyRole("ADMIN","CGPX")

                // Compte Rendu KN1 — AGENT exclu
                .requestMatchers("/api/compterendu/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Questionnaire — AGENT peut remplir et voir campagnes ouvertes, pas résultats ni gérer
                .requestMatchers(HttpMethod.POST,   "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PATCH,  "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.GET,    "/api/questionnaire/campagnes").authenticated()
                .requestMatchers(HttpMethod.GET,    "/api/questionnaire/resultats").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/questionnaire").authenticated()
                .requestMatchers("/api/questionnaire/**").authenticated()

                // Remontée — AGENT peut soumettre/modifier la sienne, pas résultats ni gérer campagnes
                .requestMatchers(HttpMethod.POST,   "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PATCH,  "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.GET,    "/api/remontee/resultats").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/remontee").authenticated()
                .requestMatchers("/api/remontee/**").authenticated()

                // Risques — AGENT peut consulter/filtrer/exporter, pas modifier
                .requestMatchers(HttpMethod.GET,    "/api/risques/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PUT,    "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Registre Dangers — AGENT peut consulter/exporter, pas modifier
                .requestMatchers(HttpMethod.GET,    "/api/registre/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/registre/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PUT,    "/api/registre/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/registre/**").hasAnyRole("ADMIN","CGPX")

                // Référentiels — AGENT peut consulter et télécharger, pas ajouter/supprimer
                .requestMatchers(HttpMethod.GET,    "/api/referentiels/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/referentiels/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/referentiels/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Congés — AGENT peut consulter et exporter, pas saisir
                .requestMatchers(HttpMethod.GET,    "/api/conges/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/conges/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PUT,    "/api/conges/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/conges/**").hasAnyRole("ADMIN","CGPX")

                // Astreinte — AGENT peut consulter, pas marquer
                .requestMatchers(HttpMethod.GET,    "/api/astreinte/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/astreinte/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/astreinte/**").hasAnyRole("ADMIN","CGPX")

                // REX, RACE — AGENT exclu de tout
                .requestMatchers("/api/rex/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers("/api/race/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Veille — AGENT peut voir planning K seulement
                .requestMatchers(HttpMethod.GET,    "/api/veille/planning/**").authenticated()
                .requestMatchers(HttpMethod.GET,    "/api/veille/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/veille/**").hasAnyRole("ADMIN","CGPX")

                // Fiche Suivi — AGENT exclu
                .requestMatchers("/api/fiche-suivi/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                
                
                .requestMatchers(HttpMethod.GET,    "/api/solde/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/solde/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PUT,    "/api/solde/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/solde/**").hasRole("ADMIN")

                .requestMatchers("/api/pdvs/**").hasAnyRole("ADMIN","CSPR","CET","CGPX")

                .requestMatchers("/api/pdvs/site/**").hasAnyRole("ADMIN","CSPR","CET","CGPX")

                .requestMatchers("/api/pdvs/journal-csspr/**")
                  .hasAnyRole("ADMIN","CSPR","CET","CGPX")

                .requestMatchers("/api/pdvs/controle-mgmt/**")
                 .hasAnyRole("ADMIN","CSPR","CET","CGPX")

                .requestMatchers("/api/pdvs/registre-dangers-n2/**")
                    .hasAnyRole("ADMIN","CSPR","CET","CGPX")
                
                .requestMatchers("/api/pdvs/ete-ramadan/**")
                  .hasAnyRole("ADMIN","CSPR","CET","CGPX")

                
                // Divers — tous authentifiés
                .requestMatchers("/api/tasks/**").authenticated()
                .requestMatchers("/api/collaborateurs/**").authenticated()

                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }
}
