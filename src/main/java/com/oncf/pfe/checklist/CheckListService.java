package com.oncf.pfe.checklist;

import com.oncf.pfe.checklist.dto.*;
import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckListService {

    private final CheckListRepository checkListRepository;
    private final CheckListItemRepository itemRepository;

    @Transactional
    public CheckListResponse createCheckList(CheckListRequest request, User user) {
        CheckList checkList = CheckList.builder()
                .type(request.getType())
                .siteUp(request.getSiteUp())
                .dateControle(request.getDateControle())
                .reference(request.getReference())
                .collaborateurNom(request.getCollaborateurNom())
                .collaborateurMatricule(request.getCollaborateurMatricule())
                .chantierNom(request.getChantierNom())
                .chantierType(request.getChantierType())
                .observations(request.getObservations())
                .createdBy(user)
                .build();

        CheckList saved = checkListRepository.save(checkList);

        if (request.getItems() != null) {
            List<CheckListItem> items = request.getItems().stream().map(dto -> {
                CheckListItem item = CheckListItem.builder()
                        .checkList(saved)
                        .section(dto.getSection())
                        .sousSection(dto.getSousSection())
                        .pointCle(dto.getPointCle())
                        .cotation(dto.getCotation())
                        .moyenne(dto.getMoyenne())
                        .constatation(dto.getConstatation())
                        .regularisation(dto.getRegularisation())
                        .ordre(dto.getOrdre())
                        .build();
                return item;
            }).collect(Collectors.toList());
            itemRepository.saveAll(items);
            saved.setItems(items);
        }

        return toResponse(saved);
    }

    public List<CheckListResponse> getMyCheckLists(User user) {
        return checkListRepository.findByCreatedById(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public List<CheckListResponse> getAllCheckLists() {
        return checkListRepository.findAll()
                .stream().map(this::toResponse).toList();
    }

    public CheckListResponse getById(Long id) {
        CheckList cl = checkListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Check list non trouvée"));
        cl.setItems(itemRepository.findByCheckListId(id));
        return toResponse(cl);
    }

    public CheckListResponse updateStatus(Long id, CheckListStatus status) {
        CheckList cl = checkListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Check list non trouvée"));
        cl.setStatus(status);
        return toResponse(checkListRepository.save(cl));
    }

    private CheckListResponse toResponse(CheckList cl) {
        List<CheckListItemDto> itemDtos = null;
        if (cl.getItems() != null) {
            itemDtos = cl.getItems().stream().map(item -> {
                CheckListItemDto dto = new CheckListItemDto();
                dto.setSection(item.getSection());
                dto.setSousSection(item.getSousSection());
                dto.setPointCle(item.getPointCle());
                dto.setCotation(item.getCotation());
                dto.setMoyenne(item.getMoyenne());
                dto.setConstatation(item.getConstatation());
                dto.setRegularisation(item.getRegularisation());
                dto.setOrdre(item.getOrdre());
                return dto;
            }).toList();
        }

        return CheckListResponse.builder()
                .id(cl.getId())
                .type(cl.getType())
                .siteUp(cl.getSiteUp())
                .dateControle(cl.getDateControle())
                .reference(cl.getReference())
                .collaborateurNom(cl.getCollaborateurNom())
                .collaborateurMatricule(cl.getCollaborateurMatricule())
                .chantierNom(cl.getChantierNom())
                .chantierType(cl.getChantierType())
                .observations(cl.getObservations())
                .status(cl.getStatus())
                .createdByName(cl.getCreatedBy() != null ? cl.getCreatedBy().getFullName() : null)
                .createdAt(cl.getCreatedAt())
                .items(itemDtos)
                .build();
    }
}