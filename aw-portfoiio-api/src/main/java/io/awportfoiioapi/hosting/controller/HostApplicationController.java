package io.awportfoiioapi.hosting.controller;

import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.hosting.dto.request.HostApplicationPostRequest;
import io.awportfoiioapi.hosting.dto.response.HostApplicationResponse;
import io.awportfoiioapi.hosting.service.HostApplicationMailSender;
import io.awportfoiioapi.hosting.service.HostApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// 스테이시즌 입점 신청
@RequiredArgsConstructor
@RestController
@RequestMapping("/api")
public class HostApplicationController {

    private static final int MIN_IMAGES = 10;
    private static final int MAX_IMAGES = 30;
    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> STATUSES = Set.of("NEW", "REVIEWING", "DONE");

    // 같은 IP 에서 10분 동안 받을 신청 수
    private static final int LIMIT_COUNT = 5;
    private static final long LIMIT_WINDOW_MILLIS = 10 * 60 * 1000L;
    private final Map<String, Deque<Long>> recentRequests = new ConcurrentHashMap<>();

    private final HostApplicationService hostApplicationService;
    private final HostApplicationMailSender hostApplicationMailSender;

    // 입점 신청 (로그인 없이 누구나)
    @PostMapping("/hosting-applications")
    public ResponseEntity<ApiResponse> createApplication(@Validated @ModelAttribute HostApplicationPostRequest request, HttpServletRequest servletRequest) {

        // 사람에게 보이지 않는 칸이 채워져 있으면 자동 입력 봇 — 저장하지 않고 정상 응답
        if (request.getFax() != null && !request.getFax().isBlank()) {
            return ResponseEntity.ok(new ApiResponse(200, true, "입점 신청이 접수되었습니다."));
        }

        String imageError = validateImages(request);
        if (imageError != null) {
            return ResponseEntity.badRequest().body(new ApiResponse(400, false, imageError));
        }

        if (isLimited(clientIp(servletRequest))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ApiResponse(429, false, "신청이 너무 많습니다. 잠시 후 다시 시도해주세요."));
        }

        HostApplicationResponse saved = hostApplicationService.createApplication(request);
        hostApplicationMailSender.sendAsync(saved);

        return ResponseEntity.ok(new ApiResponse(200, true, "입점 신청이 접수되었습니다."));
    }

    // 관리자: 입점 신청 목록
    @GetMapping("/admin-hosting")
    public ResponseEntity<?> getApplications(Authentication authentication) {
        if (!isAdmin(authentication)) {
            return forbidden();
        }
        return ResponseEntity.ok(hostApplicationService.getApplications());
    }

    // 관리자: 처리 상태 변경
    @PutMapping("/admin-hosting/{id}/status")
    public ResponseEntity<?> modifyStatus(@PathVariable Long id, @RequestParam String status, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return forbidden();
        }
        if (!STATUSES.contains(status)) {
            return ResponseEntity.badRequest().body(new ApiResponse(400, false, "올바르지 않은 상태입니다."));
        }
        return ResponseEntity.ok(hostApplicationService.modifyStatus(id, status));
    }

    // 관리자: 입점 신청 삭제
    @DeleteMapping("/admin-hosting/{id}")
    public ResponseEntity<?> deleteApplication(@PathVariable Long id, Authentication authentication) {
        if (!isAdmin(authentication)) {
            return forbidden();
        }
        return ResponseEntity.ok(hostApplicationService.deleteApplication(id));
    }

    /**
     * URL 권한은 DB(URL_RESOURCES)에 등록된 경로만 검사되고, 등록되지 않은 경로는 모두 허용된다.
     * 신규 관리자 API 는 DB 등록 없이도 보호되도록 여기서 직접 확인한다.
     */
    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(role -> role.equals("ROLE_SUPER_ADMIN") || role.equals("ROLE_ADMIN"));
    }

    private ResponseEntity<ApiResponse> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse(403, false, "권한이 없습니다."));
    }

    private String validateImages(HostApplicationPostRequest request) {
        if (request.getImages() == null) {
            return "이미지를 최소 " + MIN_IMAGES + "장 이상 첨부해주세요.";
        }
        int count = 0;
        for (MultipartFile file : request.getImages()) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            count++;

            String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
            int dot = name.lastIndexOf(".");
            String ext = dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
            String contentType = file.getContentType() == null ? "" : file.getContentType();

            if (!IMAGE_EXTENSIONS.contains(ext) || !contentType.startsWith("image/")) {
                return "이미지 파일(jpg, png, webp, gif)만 첨부할 수 있습니다.";
            }
            if (file.getSize() > MAX_IMAGE_SIZE) {
                return "이미지는 한 장당 10MB 이하로 첨부해주세요.";
            }
        }
        if (count < MIN_IMAGES) {
            return "이미지를 최소 " + MIN_IMAGES + "장 이상 첨부해주세요.";
        }
        if (count > MAX_IMAGES) {
            return "이미지는 최대 " + MAX_IMAGES + "장까지 첨부할 수 있습니다.";
        }
        return null;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp : request.getRemoteAddr();
    }

    private boolean isLimited(String ip) {
        long now = System.currentTimeMillis();
        Deque<Long> times = recentRequests.computeIfAbsent(ip, key -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > LIMIT_WINDOW_MILLIS) {
                times.pollFirst();
            }
            if (times.size() >= LIMIT_COUNT) {
                return true;
            }
            times.addLast(now);
            return false;
        }
    }
}
