package com.oncf.pfe.checklist.dto;

import com.oncf.pfe.checklist.CotationValue;
import lombok.Data;

@Data
public class CheckListItemDto {
    private String section;
    private String sousSection;
    private String pointCle;
    private CotationValue cotation;
    private CotationValue moyenne;
    private String constatation;
    private String regularisation;
    private Integer ordre;
}