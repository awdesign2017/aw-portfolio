package io.awportfoiioapi.hosting.service;

import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.hosting.dto.request.HostApplicationPostRequest;
import io.awportfoiioapi.hosting.dto.response.HostApplicationResponse;

import java.util.List;

public interface HostApplicationService {

    HostApplicationResponse createApplication(HostApplicationPostRequest request);

    List<HostApplicationResponse> getApplications();

    ApiResponse modifyStatus(Long id, String status);

    ApiResponse deleteApplication(Long id);
}
