package com.timetracking.repository;

import com.timetracking.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {

    List<Client> findByUserEmailOrderByNameAsc(String userEmail);

    Optional<Client> findByIdAndUserEmail(Long id, String userEmail);

    void deleteByUserEmail(String userEmail);

    long countByUserEmail(String userEmail);
}
