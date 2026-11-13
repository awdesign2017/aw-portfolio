package io.awportfoiioapi.hosting.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HostApplicationResponse {

    private Long id;
    private String managerName;
    private String managerPhone;
    private String managerEmail;
    private String experience;
    private String stayName;
    private String stayAddress;
    private String website;
    private String stayIntro;
    private String businessRegistered;
    private String businessType;
    private List<Image> images;
    private String status;
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Image {
        private String name;
        private String url;
    }
}
