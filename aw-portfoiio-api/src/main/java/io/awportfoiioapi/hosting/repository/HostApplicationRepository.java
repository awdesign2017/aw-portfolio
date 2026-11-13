package io.awportfoiioapi.hosting.repository;

import io.awportfoiioapi.hosting.entity.HostApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HostApplicationRepository extends JpaRepository<HostApplication, Long> {

    List<HostApplication> findAllByOrderByIdDesc();
}
