package com.oncf.pfe.auth.dto;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    private String newPassword;
}