package com.timetracking.controller;

import com.timetracking.dto.request.CreateClientRequest;
import com.timetracking.dto.request.UpdateClientRequest;
import com.timetracking.dto.response.ClientResponse;
import com.timetracking.entity.Client;
import com.timetracking.service.ClientService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllClients(HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        List<Client> clients = clientService.getAllClients(userEmail);

        List<ClientResponse> clientResponses = clients.stream()
                .map(ClientResponse::fromEntity)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("clients", clientResponses);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getClient(@PathVariable Long id, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        Client client = clientService.getClientById(id, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("client", ClientResponse.fromEntity(client));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createClient(
            @Valid @RequestBody CreateClientRequest createRequest,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        Client client = clientService.createClient(createRequest, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Client created successfully");
        response.put("client", ClientResponse.fromEntity(client));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateClient(
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRequest updateRequest,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        Client client = clientService.updateClient(id, updateRequest, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Client updated successfully");
        response.put("client", ClientResponse.fromEntity(client));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteAllClients(HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        long deletedCount = clientService.deleteAllClients(userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "All clients deleted successfully");
        response.put("deletedCount", deletedCount);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteClient(@PathVariable Long id, HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        clientService.deleteClient(id, userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Client deleted successfully");
        return ResponseEntity.ok(response);
    }
}
