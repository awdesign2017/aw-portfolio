package io.awportfoiioapi.hosting.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 입점 신청 테이블 준비.
 *
 * ddl-auto 가 none 이라 테이블이 자동으로 만들어지지 않는다.
 * 서버에 접속해 SQL 을 직접 실행하지 않아도 되도록, 기동 시 테이블이 없을 때만 생성한다.
 * (이미 있으면 아무 일도 하지 않는다)
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class HostApplicationTableInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS HOST_APPLICATION (
                        HOST_APPLICATION_ID BIGINT NOT NULL AUTO_INCREMENT,
                        MANAGER_NAME        VARCHAR(50)  NOT NULL,
                        MANAGER_PHONE       VARCHAR(30)  NOT NULL,
                        MANAGER_EMAIL       VARCHAR(100) NOT NULL,
                        EXPERIENCE          VARCHAR(20)  NOT NULL,
                        STAY_NAME           VARCHAR(100) NOT NULL,
                        STAY_ADDRESS        VARCHAR(255) NOT NULL,
                        WEBSITE             VARCHAR(500) NULL,
                        STAY_INTRO          TEXT         NOT NULL,
                        BUSINESS_REGISTERED VARCHAR(20)  NOT NULL,
                        BUSINESS_TYPE       VARCHAR(50)  NOT NULL,
                        IMAGES_JSON         TEXT         NULL,
                        STATUS              VARCHAR(20)  NOT NULL,
                        REGIST_DATE         DATETIME(6)  NULL,
                        MODIFY_DATE         DATETIME(6)  NULL,
                        PRIMARY KEY (HOST_APPLICATION_ID)
                    ) DEFAULT CHARSET = utf8mb4
                    """);
        } catch (Exception e) {
            log.error("HOST_APPLICATION 테이블 준비 실패 — 입점 신청 기능이 동작하지 않습니다.", e);
        }
    }
}
