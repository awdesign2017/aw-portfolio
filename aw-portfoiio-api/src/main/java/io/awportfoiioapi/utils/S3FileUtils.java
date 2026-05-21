package io.awportfoiioapi.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 파일 저장/조회 유틸리티.
 *
 * 클래스명은 호환성을 위해 S3FileUtils로 유지하지만,
 * 내부 구현은 서버 로컬 디스크 기반으로 동작한다.
 *
 *  - 저장 경로: {file.storage.location}/{folder}/{uuid}.{ext}
 *  - 외부 URL: {file.storage.base-url}/{folder}/{uuid}.{ext}
 *
 * 외부 URL 경로는 nginx의 정적 location(/files/) 또는
 * 동일 호스트의 동일 경로로 서빙된다.
 */
@Component
@Slf4j
public class S3FileUtils {

    @Value("${file.storage.location}")
    private String storageLocation;

    @Value("${file.storage.base-url}")
    private String baseUrl;

    public List<UploadResult> storeFiles(List<MultipartFile> multipartFiles, String folder) {
        List<UploadResult> uploadFiles = new ArrayList<>();
        for (MultipartFile multipartFile : multipartFiles) {
            if (!multipartFile.isEmpty()) {
                uploadFiles.add(storeFile(multipartFile, folder));
            }
        }
        return uploadFiles;
    }

    public UploadResult storeFile(MultipartFile multipartFile, String folder) {

        if (multipartFile.isEmpty()) return null;

        String originalFilename = multipartFile.getOriginalFilename();
        String uuid = UUID.randomUUID().toString();
        String ext = extractExt(originalFilename);
        String storeFileName = uuid + "." + ext;
        String relativeKey = folder + "/" + storeFileName;

        try {
            Path folderPath = Paths.get(storageLocation, folder);
            Files.createDirectories(folderPath);

            Path target = folderPath.resolve(storeFileName);
            try (var in = multipartFile.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            String url = buildPublicUrl(relativeKey);
            return new UploadResult(url, uuid, originalFilename);

        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패: " + originalFilename, e);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return;
        String key = getFileNameFromUrl(fileUrl);
        try {
            Path target = Paths.get(storageLocation).resolve(key);
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("파일 삭제 실패: {}", fileUrl, e);
        }
    }

    /**
     * URL에서 저장소 key("folder/uuid.ext")를 추출한다.
     *
     * 이 메서드는 다음 두 형태 모두를 지원한다.
     *   - 신규(로컬):  https://example.com/files/portfolio/abc.jpg
     *   - 기존(S3):    https://bucket.s3.region.amazonaws.com/portfolio/abc.jpg
     *
     * 마이그레이션 직전 DB의 기존 S3 URL이 일부 남아 있어도 동작하도록 둘 다 처리한다.
     */
    public String getFileNameFromUrl(String fileUrl) {
        try {
            URL url = new URL(fileUrl);
            String path = url.getPath();
            if (path.startsWith("/files/")) {
                return path.substring("/files/".length());
            }
            return path.startsWith("/") ? path.substring(1) : path;
        } catch (MalformedURLException e) {
            // 상대 키만 들어온 경우 그대로 반환
            if (fileUrl.startsWith("/files/")) {
                return fileUrl.substring("/files/".length());
            }
            return fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl;
        }
    }

    private String extractExt(String originalFilename) {
        int pos = originalFilename.lastIndexOf(".");
        return pos < 0 ? "" : originalFilename.substring(pos + 1);
    }

    private String buildPublicUrl(String key) {
        String base = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return base + "/" + key;
    }

    /**
     * 기존 S3 presigned URL 생성 자리.
     * 로컬 저장소에서는 같은 정적 URL을 반환한다.
     * 캐시 어노테이션은 그대로 두어도 무해하므로 유지(호출 패턴 동일).
     */
    @Cacheable(cacheNames = "presigned", key = "#key")
    public String createPresignedUrl(String key) {
        return buildPublicUrl(key);
    }

    @Scheduled(cron = "0 0/50 * * * *")
    @CacheEvict(cacheNames = "presigned", allEntries = true)
    public void clearPresignedCache() {
        log.info("캐시삭제");
    }

    /** 로컬 파일 경로 (다운로드/스트리밍 시 사용) */
    public Path resolveLocalPath(String folder, String fileName) {
        return Paths.get(storageLocation, folder, fileName);
    }

    /**
     * 단일 상대 경로(예: "submission/uuid.jpg" 또는 "files/submission/uuid.jpg")로 로컬 경로 해석.
     * "files/" prefix 는 자동 strip 한다. (DB 의 URL 이 https://.../files/... 형태이고
     * 프론트가 url.pathname 을 그대로 path 로 사용해 호출하기 때문)
     */
    public Path resolveLocalPath(String relativeKey) {
        if (relativeKey == null) return null;
        String key = relativeKey.startsWith("/") ? relativeKey.substring(1) : relativeKey;
        if (key.startsWith("files/")) key = key.substring("files/".length());
        return Paths.get(storageLocation).resolve(key).normalize();
    }
}
