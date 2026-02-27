package com.timetracking.service;

import com.timetracking.dto.request.CreateWorkEntryRequest;
import com.timetracking.dto.request.UpdateWorkEntryRequest;
import com.timetracking.entity.WorkEntry;
import com.timetracking.exception.BadRequestException;
import com.timetracking.exception.ResourceNotFoundException;
import com.timetracking.repository.ClientRepository;
import com.timetracking.repository.WorkEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class WorkEntryService {

    private final WorkEntryRepository workEntryRepository;
    private final ClientRepository clientRepository;

    public WorkEntryService(WorkEntryRepository workEntryRepository, ClientRepository clientRepository) {
        this.workEntryRepository = workEntryRepository;
        this.clientRepository = clientRepository;
    }

    public List<WorkEntry> getAllWorkEntries(String userEmail, Long clientId) {
        if (clientId != null) {
            return workEntryRepository.findByUserEmailAndClientIdWithClient(userEmail, clientId);
        }
        return workEntryRepository.findByUserEmailWithClient(userEmail);
    }

    public WorkEntry getWorkEntryById(Long id, String userEmail) {
        return workEntryRepository.findByIdAndUserEmailWithClient(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Work entry not found"));
    }

    @Transactional
    public WorkEntry createWorkEntry(CreateWorkEntryRequest request, String userEmail) {
        // Verify client exists and belongs to user
        clientRepository.findByIdAndUserEmail(request.getClientId(), userEmail)
                .orElseThrow(() -> new BadRequestException("Client not found or does not belong to user"));

        WorkEntry workEntry = new WorkEntry();
        workEntry.setClientId(request.getClientId());
        workEntry.setUserEmail(userEmail);
        workEntry.setHours(request.getHours());
        workEntry.setDescription(request.getDescription() != null && !request.getDescription().trim().isEmpty()
                ? request.getDescription().trim() : null);
        workEntry.setDate(LocalDate.parse(request.getDate()));

        WorkEntry saved = workEntryRepository.save(workEntry);

        // Return with client info loaded
        return workEntryRepository.findByIdAndUserEmailWithClient(saved.getId(), userEmail)
                .orElse(saved);
    }

    @Transactional
    public WorkEntry updateWorkEntry(Long id, UpdateWorkEntryRequest request, String userEmail) {
        WorkEntry workEntry = workEntryRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Work entry not found"));

        // If clientId is being updated, verify it belongs to user
        if (request.getClientId() != null) {
            clientRepository.findByIdAndUserEmail(request.getClientId(), userEmail)
                    .orElseThrow(() -> new BadRequestException("Client not found or does not belong to user"));
            workEntry.setClientId(request.getClientId());
        }

        if (request.getHours() != null) {
            workEntry.setHours(request.getHours());
        }

        if (request.getDescription() != null) {
            workEntry.setDescription(request.getDescription().trim().isEmpty() ? null : request.getDescription().trim());
        }

        if (request.getDate() != null) {
            workEntry.setDate(LocalDate.parse(request.getDate()));
        }

        WorkEntry saved = workEntryRepository.save(workEntry);

        // Return with client info loaded
        return workEntryRepository.findByIdAndUserEmailWithClient(saved.getId(), userEmail)
                .orElse(saved);
    }

    @Transactional
    public void deleteWorkEntry(Long id, String userEmail) {
        WorkEntry workEntry = workEntryRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Work entry not found"));
        workEntryRepository.delete(workEntry);
    }
}
