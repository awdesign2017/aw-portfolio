package io.awportfoiioapi.hosting.service;

import io.awportfoiioapi.hosting.dto.response.HostApplicationResponse;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import java.util.concurrent.CompletableFuture;

/**
 * 입점 신청 접수 알림 메일.
 *
 * SMTP 정보(MAIL_HOST 등)가 설정되지 않았거나 발송에 실패해도
 * 신청 저장에는 영향을 주지 않는다 (로그만 남김).
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class HostApplicationMailSender {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.username:}")
    private String username;

    // 알림 받는 주소
    @Value("${stayseason.mail.to:support@stay-season.com}")
    private String to;

    // 보내는 주소 (비우면 SMTP 계정 주소)
    @Value("${stayseason.mail.from:}")
    private String from;

    public void sendAsync(HostApplicationResponse application) {
        CompletableFuture.runAsync(() -> send(application));
    }

    private void send(HostApplicationResponse application) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || host == null || host.isBlank()) {
            log.warn("메일 설정(MAIL_HOST)이 없어 입점 신청 알림 메일을 보내지 않았습니다. 신청 ID={}", application.getId());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setFrom(from == null || from.isBlank() ? username : from);
            helper.setReplyTo(application.getManagerEmail());
            helper.setSubject("[스테이시즌 입점 신청] " + application.getStayName() + " / " + application.getManagerName());
            helper.setText(buildBody(application), true);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("입점 신청 알림 메일 발송 실패. 신청 ID={}", application.getId(), e);
        }
    }

    private String buildBody(HostApplicationResponse a) {
        StringBuilder sb = new StringBuilder();
        sb.append("<div style=\"font-family:sans-serif;font-size:14px;line-height:1.6;color:#222\">");
        sb.append("<h2 style=\"margin:0 0 16px\">스테이시즌 입점 신청이 접수되었습니다</h2>");
        sb.append("<table style=\"border-collapse:collapse\">");
        row(sb, "담당자 성함", a.getManagerName());
        row(sb, "담당자 전화번호", a.getManagerPhone());
        row(sb, "담당자 이메일", a.getManagerEmail());
        row(sb, "숙박업 경험", "HAS".equals(a.getExperience()) ? "경험 있음" : "경험 없음");
        row(sb, "스테이 이름", a.getStayName());
        row(sb, "스테이 주소", a.getStayAddress());
        row(sb, "웹사이트 및 SNS", a.getWebsite());
        row(sb, "스테이 소개", a.getStayIntro());
        row(sb, "사업자 등록 여부", "REGISTERED".equals(a.getBusinessRegistered()) ? "등록 완료" : "준비 중");
        row(sb, "업종", a.getBusinessType());
        sb.append("</table>");

        if (a.getImages() != null && !a.getImages().isEmpty()) {
            sb.append("<p style=\"margin:20px 0 6px\"><b>첨부 이미지 ").append(a.getImages().size()).append("장</b></p><ul style=\"margin:0;padding-left:18px\">");
            for (HostApplicationResponse.Image image : a.getImages()) {
                String url = HtmlUtils.htmlEscape(image.getUrl());
                sb.append("<li><a href=\"").append(url).append("\">").append(HtmlUtils.htmlEscape(image.getName())).append("</a></li>");
            }
            sb.append("</ul>");
        }

        sb.append("<p style=\"margin-top:20px;color:#777\">영상은 신청자가 이 메일 주소로 따로 보내도록 안내되어 있습니다.<br>이 메일에 답장하면 신청자에게 전달됩니다.</p>");
        sb.append("</div>");
        return sb.toString();
    }

    private void row(StringBuilder sb, String label, String value) {
        String text = value == null || value.isBlank() ? "-" : HtmlUtils.htmlEscape(value).replace("\n", "<br>");
        sb.append("<tr><th style=\"text-align:left;vertical-align:top;padding:6px 16px 6px 0;white-space:nowrap;color:#555\">")
                .append(label)
                .append("</th><td style=\"padding:6px 0\">")
                .append(text)
                .append("</td></tr>");
    }
}
