package com.timetracking.controller;

import com.timetracking.dto.request.CreateWorkEntryRequest;
import com.timetracking.dto.request.UpdateWorkEntryRequest;
import com.timetracking.dto.response.WorkEntryResponse;
import com.timetracking.entity.WorkEntry;
import com.timetracking.service.WorkEntryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/work-entries")
public class WorkEntryController {

    private final WorkEntryService workEntryService;

    public WorkEntryController(WorkEntryService workEntryService) {
        this.workEntryService = workEntryService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllWorkEntries(
            @RequestParam(required = false) Long clientId,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        List<WorkEntry> workEntries = workEntryService.getAllWorkEntries(userEmail, clientId);

        List<WorkEntryResponse> workEntryResponses = workEntries.stream()
                .map(WorkEntryResponse::fromEntity)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("workEntries", workEntryResponses);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getWorkEntry(@PathVariable Long id, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        WorkEntry workEntry = workEntryService.getWorkEntryById(id, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("workEntry", WorkEntryResponse.fromEntity(workEntry));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createWorkEntry(
            @Valid @RequestBody CreateWorkEntryRequest createRequest,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        WorkEntry workEntry = workEntryService.createWorkEntry(createRequest, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Work entry created successfully");
        response.put("workEntry", WorkEntryResponse.fromEntity(workEntry));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateWorkEntry(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkEntryRequest updateRequest,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        WorkEntry workEntry = workEntryService.updateWorkEntry(id, updateRequest, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Work entry updated successfully");
        response.put("workEntry", WorkEntryResponse.fromEntity(workEntry));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteWorkEntry(@PathVariable Long id, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        workEntryService.deleteWorkEntry(id, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Work entry deleted successfully");
        return ResponseEntity.ok(response);
    }
}
