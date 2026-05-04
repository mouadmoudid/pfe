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

                // Administration — gestion utilisateurs ADMIN uniquement
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                // Données lecture (agents, collaborateurs, by-matricule) → 4 rôles
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Planning — lecture 4 rôles, écriture ADMIN/CGPX
                .requestMatchers(HttpMethod.GET,    "/api/planning/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/planning/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PATCH,  "/api/planning/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/planning/**").hasAnyRole("ADMIN","CGPX")

                // Checklists — création 4 rôles (type CHANTIER filtré en controller), suppression ADMIN/CGPX
                .requestMatchers(HttpMethod.GET,    "/api/checklists/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/checklists/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PATCH,  "/api/checklists/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/checklists/**").hasAnyRole("ADMIN","CGPX")

                // Questionnaire — campagnes gérées ADMIN/CGPX ; résultats 4 rôles ; soumission authentifiée
                .requestMatchers(HttpMethod.POST,   "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PATCH,  "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/questionnaire/campagnes/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.GET,    "/api/questionnaire/campagnes").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.GET,    "/api/questionnaire/resultats").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/questionnaire").authenticated()
                .requestMatchers("/api/questionnaire/**").authenticated()

                // Remontée — campagnes gérées 4 rôles ; soumission authentifiée
                .requestMatchers(HttpMethod.POST,   "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PATCH,  "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/remontee/campagnes/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.GET,    "/api/remontee/resultats").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.POST,   "/api/remontee").authenticated()
                .requestMatchers("/api/remontee/**").authenticated()

                // Risques — lecture authentifiée, écriture 4 rôles
                .requestMatchers(HttpMethod.GET,    "/api/risques/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.PUT,    "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/risques/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Registre — lecture authentifiée, écriture ADMIN/CGPX
                .requestMatchers(HttpMethod.GET,    "/api/registre/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/registre/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PUT,    "/api/registre/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/registre/**").hasAnyRole("ADMIN","CGPX")

                // Référentiels — lecture authentifiée, upload/suppression 4 rôles
                .requestMatchers(HttpMethod.GET,    "/api/referentiels/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/referentiels/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers(HttpMethod.DELETE, "/api/referentiels/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Congés — lecture authentifiée, écriture ADMIN/CGPX
                .requestMatchers(HttpMethod.GET,    "/api/conges/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/conges/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.PUT,    "/api/conges/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/conges/**").hasAnyRole("ADMIN","CGPX")

                // Astreinte — lecture authentifiée, écriture ADMIN/CGPX
                .requestMatchers(HttpMethod.GET,    "/api/astreinte/**").authenticated()
                .requestMatchers(HttpMethod.POST,   "/api/astreinte/**").hasAnyRole("ADMIN","CGPX")
                .requestMatchers(HttpMethod.DELETE, "/api/astreinte/**").hasAnyRole("ADMIN","CGPX")

                // REX, RACE, Veille — 4 rôles (AGENT exclu)
                .requestMatchers("/api/rex/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers("/api/race/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")
                .requestMatchers("/api/veille/**").hasAnyRole("ADMIN","CGPX","CSPR","CET")

                // Divers — tous authentifiés
                .requestMatchers("/api/tasks/**").authenticated()
                .requestMatchers("/api/collaborateurs/**").authenticated()
                .requestMatchers("/api/fiche-suivi/**").authenticated()

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
