package io.awportfoiioapi.excel.controller;

import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.excel.dto.request.ExcelRequest;
import io.awportfoiioapi.excel.service.ExcelService;
import io.awportfoiioapi.utils.S3FileUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriUtils;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api")
public class ExcelController {

    private final ExcelService excelService;
    private final S3FileUtils s3FileUtils;


    @PostMapping("/excel")
    public ResponseEntity<byte[]> getExcel(@RequestBody ExcelRequest request) {

        byte[] excelFile = excelService.createSubmissionExcel(request);

        String fileName = "submission.xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .body(excelFile);
    }

    @PostMapping("/submitOff")
    public ApiResponse submitOff(@RequestBody ExcelRequest request) {
        return excelService.modifySubmitOff(request);
    }

    @GetMapping("/copy")
    public ApiResponse copy(@RequestParam Long portfolioId) {
        return excelService.copyPortfolio(portfolioId);
    }

    /**
     * 로컬 디스크에 저장된 파일을 다운로드한다.
     *
     * Wildcard 매핑으로 다음 두 패턴을 모두 받는다.
     *   GET /api/download/<folder>/<fileName>            (예: submission/uuid.jpg)
     *   GET /api/download/files/<folder>/<fileName>      (DB URL 의 pathname 그대로)
     *
     * "files/" prefix 는 S3FileUtils.resolveLocalPath(relative) 에서 자동 strip 한다.
     */
    @GetMapping("/download/**")
    public ResponseEntity<Resource> download(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        // "/api/download/" 뒤 부분을 모두 추출 (slash 포함)
        String marker = "/api/download/";
        int idx = requestUri.indexOf(marker);
        if (idx < 0) {
            return ResponseEntity.notFound().build();
        }
        String raw = requestUri.substring(idx + marker.length());

        // URL 디코딩 (한글 파일명 대응)
        String decoded = URLDecoder.decode(raw, StandardCharsets.UTF_8);

        Path filePath = s3FileUtils.resolveLocalPath(decoded);
        if (filePath == null || !Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(filePath);
        String fileName = filePath.getFileName().toString();
        String encodedFilename = UriUtils.encode(fileName, StandardCharsets.UTF_8);
        String contentDisposition = "attachment; filename*=UTF-8''" + encodedFilename;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
