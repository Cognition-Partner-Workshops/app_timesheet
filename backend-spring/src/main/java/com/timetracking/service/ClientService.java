package com.timetracking.service;

import com.timetracking.dto.request.CreateClientRequest;
import com.timetracking.dto.request.UpdateClientRequest;
import com.timetracking.entity.Client;
import com.timetracking.exception.ResourceNotFoundException;
import com.timetracking.repository.ClientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClientService {

    private final ClientRepository clientRepository;

    public ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
    }

    public List<Client> getAllClients(String userEmail) {
        return clientRepository.findByUserEmailOrderByNameAsc(userEmail);
    }

    public Client getClientById(Long id, String userEmail) {
        return clientRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
    }

    @Transactional
    public Client createClient(CreateClientRequest request, String userEmail) {
        Client client = new Client();
        client.setName(request.getName().trim());
        client.setDescription(normalizeEmptyToNull(request.getDescription()));
        client.setDepartment(normalizeEmptyToNull(request.getDepartment()));
        client.setEmail(normalizeEmptyToNull(request.getEmail()));
        client.setUserEmail(userEmail);
        return clientRepository.save(client);
    }

    @Transactional
    public Client updateClient(Long id, UpdateClientRequest request, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        if (request.getName() != null) {
            client.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            client.setDescription(normalizeEmptyToNull(request.getDescription()));
        }
        if (request.getDepartment() != null) {
            client.setDepartment(normalizeEmptyToNull(request.getDepartment()));
        }
        if (request.getEmail() != null) {
            client.setEmail(normalizeEmptyToNull(request.getEmail()));
        }

        return clientRepository.save(client);
    }

    @Transactional
    public void deleteClient(Long id, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        clientRepository.delete(client);
    }

    @Transactional
    public long deleteAllClients(String userEmail) {
        long count = clientRepository.countByUserEmail(userEmail);
        clientRepository.deleteByUserEmail(userEmail);
        return count;
    }

    private String normalizeEmptyToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
