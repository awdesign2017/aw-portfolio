package io.awportfoiioapi.hosting.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.hosting.dto.request.HostApplicationPostRequest;
import io.awportfoiioapi.hosting.dto.response.HostApplicationResponse;
import io.awportfoiioapi.hosting.entity.HostApplication;
import io.awportfoiioapi.hosting.repository.HostApplicationRepository;
import io.awportfoiioapi.hosting.service.HostApplicationService;
import io.awportfoiioapi.utils.S3FileUtils;
import io.awportfoiioapi.utils.UploadResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@Transactional
@RequiredArgsConstructor
public class HostApplicationServiceImpl implements HostApplicationService {

    // 업로드 폴더 ({file.storage.location}/hosting)
    private static final String FOLDER = "hosting";

    private final HostApplicationRepository hostApplicationRepository;
    private final S3FileUtils s3FileUtils;
    private final ObjectMapper mapper;

    @Override
    public HostApplicationResponse createApplication(HostApplicationPostRequest request) {

        // 1. 이미지 저장
        List<HostApplicationResponse.Image> images = new ArrayList<>();
        if (request.getImages() != null) {
            for (MultipartFile file : request.getImages()) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                UploadResult upload = s3FileUtils.storeFile(file, FOLDER);
                images.add(new HostApplicationResponse.Image(upload.originalFilename(), upload.url()));
            }
        }

        // 2. 신청 저장
        HostApplication saved = hostApplicationRepository.save(
                HostApplication.builder()
                        .managerName(request.getManagerName().trim())
                        .managerPhone(request.getManagerPhone().trim())
                        .managerEmail(request.getManagerEmail().trim())
                        .experience(request.getExperience())
                        .stayName(request.getStayName().trim())
                        .stayAddress(request.getStayAddress().trim())
                        .website(request.getWebsite() == null ? null : request.getWebsite().trim())
                        .stayIntro(request.getStayIntro().trim())
                        .businessRegistered(request.getBusinessRegistered())
                        .businessType(request.getBusinessType().trim())
                        .imagesJson(writeImages(images))
                        .status("NEW")
                        .build()
        );

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HostApplicationResponse> getApplications() {
        return hostApplicationRepository.findAllByOrderByIdDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ApiResponse modifyStatus(Long id, String status) {
        HostApplication application = hostApplicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 입점 신청입니다."));
        application.changeStatus(status);
        return new ApiResponse(200, true, "상태가 변경되었습니다.");
    }

    @Override
    public ApiResponse deleteApplication(Long id) {
        hostApplicationRepository.findById(id).ifPresent(application -> {
            for (HostApplicationResponse.Image image : readImages(application.getImagesJson())) {
                s3FileUtils.deleteFile(image.getUrl());
            }
            hostApplicationRepository.delete(application);
        });
        return new ApiResponse(200, true, "입점 신청이 삭제되었습니다.");
    }

    private HostApplicationResponse toResponse(HostApplication application) {
        return HostApplicationResponse.builder()
                .id(application.getId())
                .managerName(application.getManagerName())
                .managerPhone(application.getManagerPhone())
                .managerEmail(application.getManagerEmail())
                .experience(application.getExperience())
                .stayName(application.getStayName())
                .stayAddress(application.getStayAddress())
                .website(application.getWebsite())
                .stayIntro(application.getStayIntro())
                .businessRegistered(application.getBusinessRegistered())
                .businessType(application.getBusinessType())
                .images(readImages(application.getImagesJson()))
                .status(application.getStatus())
                .createdAt(application.getRegistDate())
                .build();
    }

    private String writeImages(List<HostApplicationResponse.Image> images) {
        try {
            return mapper.writeValueAsString(images);
        } catch (Exception e) {
            throw new RuntimeException("첨부 이미지 정보 저장 실패", e);
        }
    }

    private List<HostApplicationResponse.Image> readImages(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("첨부 이미지 정보 읽기 실패", e);
            return new ArrayList<>();
        }
    }
}
