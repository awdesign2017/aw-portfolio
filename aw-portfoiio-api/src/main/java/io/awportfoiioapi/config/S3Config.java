package io.awportfoiioapi.config;

/**
 * S3 의존성 제거에 따라 빈 클래스로 유지한다.
 * (Spring 컴포넌트 스캔 충돌 방지를 위해 클래스 자체는 남겨둠)
 *
 * 파일 저장은 {@link io.awportfoiioapi.utils.S3FileUtils}가 로컬 디스크 기반으로 처리한다.
 */
public class S3Config {
}
