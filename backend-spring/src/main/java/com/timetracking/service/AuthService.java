package com.timetracking.service;

import com.timetracking.entity.User;
import com.timetracking.exception.ResourceNotFoundException;
import com.timetracking.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User login(String email) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return existing.get();
        }
        User newUser = new User(email);
        return userRepository.save(newUser);
    }

    public boolean isNewUser(String email) {
        return !userRepository.existsByEmail(email);
    }

    public User getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
