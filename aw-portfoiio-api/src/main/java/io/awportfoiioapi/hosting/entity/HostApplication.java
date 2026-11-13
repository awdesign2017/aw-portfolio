package io.awportfoiioapi.hosting.entity;

import io.awportfoiioapi.mapperd.DateSuperClass;
import jakarta.persistence.*;
import lombok.*;

import static jakarta.persistence.GenerationType.IDENTITY;

// 스테이시즌 입점 신청
@Table(name = "HOST_APPLICATION")
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class HostApplication extends DateSuperClass {

    // 입점 신청 ID
    @Id
    @Column(name = "HOST_APPLICATION_ID")
    @GeneratedValue(strategy = IDENTITY)
    private Long id;

    // 담당자 성함
    @Column(name = "MANAGER_NAME")
    private String managerName;

    // 담당자 전화번호
    @Column(name = "MANAGER_PHONE")
    private String managerPhone;

    // 담당자 이메일
    @Column(name = "MANAGER_EMAIL")
    private String managerEmail;

    // 숙박업 경험 유무 (NONE / HAS)
    @Column(name = "EXPERIENCE")
    private String experience;

    // 스테이 이름
    @Column(name = "STAY_NAME")
    private String stayName;

    // 스테이 주소
    @Column(name = "STAY_ADDRESS")
    private String stayAddress;

    // 웹사이트 및 SNS 주소
    @Column(name = "WEBSITE")
    private String website;

    // 스테이 소개
    @Column(name = "STAY_INTRO", columnDefinition = "TEXT")
    private String stayIntro;

    // 숙박업 사업자 등록 여부 (PREPARING / REGISTERED)
    @Column(name = "BUSINESS_REGISTERED")
    private String businessRegistered;

    // 업종
    @Column(name = "BUSINESS_TYPE")
    private String businessType;

    // 첨부 이미지 [{name, url}] JSON
    @Column(name = "IMAGES_JSON", columnDefinition = "TEXT")
    private String imagesJson;

    // 처리 상태 (NEW / REVIEWING / DONE)
    @Column(name = "STATUS")
    private String status;

    public void changeStatus(String status) {
        this.status = status;
    }
}
