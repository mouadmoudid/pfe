package com.oncf.pfe.auth.dto;

import com.oncf.pfe.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String fullName;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    private Role role = Role.AGENT;

    // Champs collaborateur optionnels
    private String matricule;
    private String prenom;
    private String dateNaissance;
    private String entite;
    private String residence;
    private String fonctionAssuree;
    private String dateFonction;
    private String poste;
    private String siteUp;
    private String telephone;
}