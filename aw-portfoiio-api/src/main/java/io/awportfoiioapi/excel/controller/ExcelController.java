package io.awportfoiioapi.excel.controller;

import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.excel.dto.request.ExcelRequest;
import io.awportfoiioapi.excel.service.ExcelService;
import io.awportfoiioapi.utils.S3FileUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriUtils;

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
     * 프론트(DynamicFormField.tsx)에서 a.download = value.name 으로 파일명을 지정하므로
     * 헤더에는 URL의 파일명만 인코딩하여 fallback으로 둔다.
     */
    @GetMapping("/download/{folder}/{fileName}")
    public ResponseEntity<Resource> download(
            @PathVariable String folder,
            @PathVariable String fileName
    ) {
        Path filePath = s3FileUtils.resolveLocalPath(folder, fileName);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(filePath);
        String encodedFilename = UriUtils.encode(fileName, StandardCharsets.UTF_8);
        String contentDisposition = "attachment; filename*=UTF-8''" + encodedFilename;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
