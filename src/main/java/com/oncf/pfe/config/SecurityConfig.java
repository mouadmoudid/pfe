package com.oncf.pfe.config;

import com.oncf.pfe.security.JwtAuthFilter;
import com.oncf.pfe.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
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
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "CPGX", "CSPR", "CET")
                .requestMatchers(HttpMethod.POST, "/api/referentiels").hasAnyRole("ADMIN", "CPGX", "CSPR", "CET")
                .requestMatchers(HttpMethod.DELETE, "/api/referentiels/**").hasAnyRole("ADMIN", "CPGX", "CSPR", "CET")
                .requestMatchers(HttpMethod.GET, "/api/referentiels/**").authenticated()
                .requestMatchers("/api/planning/**").authenticated()
                .requestMatchers("/api/checklists/**").authenticated()
                .requestMatchers("/api/tasks/**").authenticated()
                .requestMatchers("/api/collaborateurs/**").authenticated()
                .requestMatchers("/api/fiche-suivi/**").authenticated()
                .requestMatchers("/api/rex/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/conges/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/conges/**").hasAnyRole("ADMIN", "CPGX")
                .requestMatchers(HttpMethod.DELETE, "/api/conges/**").hasAnyRole("ADMIN", "CPGX")
                .requestMatchers(HttpMethod.GET, "/api/astreinte/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/astreinte/**").hasAnyRole("ADMIN", "CPGX")
                .requestMatchers(HttpMethod.DELETE, "/api/astreinte/**").hasAnyRole("ADMIN", "CPGX")
                .requestMatchers("/api/questionnaire/**").authenticated()
                .requestMatchers("/api/remontee/**").authenticated()
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