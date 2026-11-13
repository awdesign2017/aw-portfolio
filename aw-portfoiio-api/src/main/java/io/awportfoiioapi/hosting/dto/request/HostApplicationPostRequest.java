package io.awportfoiioapi.hosting.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
public class HostApplicationPostRequest {

    @NotBlank(message = "담당자 성함을 입력해주세요.")
    @Size(max = 50, message = "담당자 성함은 50자 이내로 입력해주세요.")
    private String managerName;

    @NotBlank(message = "담당자 전화번호를 입력해주세요.")
    @Size(max = 30, message = "전화번호는 30자 이내로 입력해주세요.")
    private String managerPhone;

    @NotBlank(message = "담당자 이메일을 입력해주세요.")
    @Email(message = "이메일 형식이 올바르지 않습니다.")
    @Size(max = 100, message = "이메일은 100자 이내로 입력해주세요.")
    private String managerEmail;

    @NotBlank(message = "숙박업 경험 유무를 선택해주세요.")
    @Pattern(regexp = "NONE|HAS", message = "숙박업 경험 유무를 선택해주세요.")
    private String experience;

    @NotBlank(message = "스테이 이름을 입력해주세요.")
    @Size(max = 100, message = "스테이 이름은 100자 이내로 입력해주세요.")
    private String stayName;

    @NotBlank(message = "스테이 주소를 입력해주세요.")
    @Size(max = 255, message = "스테이 주소는 255자 이내로 입력해주세요.")
    private String stayAddress;

    @Size(max = 500, message = "웹사이트 및 SNS 주소는 500자 이내로 입력해주세요.")
    private String website;

    @NotBlank(message = "스테이 소개를 입력해주세요.")
    @Size(max = 5000, message = "스테이 소개는 5000자 이내로 입력해주세요.")
    private String stayIntro;

    @NotBlank(message = "숙박업 사업자 등록 여부를 선택해주세요.")
    @Pattern(regexp = "PREPARING|REGISTERED", message = "숙박업 사업자 등록 여부를 선택해주세요.")
    private String businessRegistered;

    @NotBlank(message = "업종을 선택해주세요.")
    @Size(max = 50, message = "업종은 50자 이내로 입력해주세요.")
    private String businessType;

    @AssertTrue(message = "개인정보 수집 및 이용에 동의해주세요.")
    private boolean privacyAgreed;

    // 첨부 이미지 (선택)
    private List<MultipartFile> images;

    // 자동 입력 봇 차단용 (사람에게는 보이지 않는 칸 — 값이 있으면 저장하지 않음)
    private String fax;
}
