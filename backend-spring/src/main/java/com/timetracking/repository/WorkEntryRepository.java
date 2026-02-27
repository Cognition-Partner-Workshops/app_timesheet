package com.timetracking.repository;

import com.timetracking.entity.WorkEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkEntryRepository extends JpaRepository<WorkEntry, Long> {

    @Query("SELECT we FROM WorkEntry we JOIN FETCH we.client WHERE we.userEmail = :userEmail ORDER BY we.date DESC, we.createdAt DESC")
    List<WorkEntry> findByUserEmailWithClient(@Param("userEmail") String userEmail);

    @Query("SELECT we FROM WorkEntry we JOIN FETCH we.client WHERE we.userEmail = :userEmail AND we.clientId = :clientId ORDER BY we.date DESC, we.createdAt DESC")
    List<WorkEntry> findByUserEmailAndClientIdWithClient(@Param("userEmail") String userEmail, @Param("clientId") Long clientId);

    @Query("SELECT we FROM WorkEntry we JOIN FETCH we.client WHERE we.id = :id AND we.userEmail = :userEmail")
    Optional<WorkEntry> findByIdAndUserEmailWithClient(@Param("id") Long id, @Param("userEmail") String userEmail);

    Optional<WorkEntry> findByIdAndUserEmail(Long id, String userEmail);

    List<WorkEntry> findByClientIdAndUserEmailOrderByDateDesc(Long clientId, String userEmail);
}
