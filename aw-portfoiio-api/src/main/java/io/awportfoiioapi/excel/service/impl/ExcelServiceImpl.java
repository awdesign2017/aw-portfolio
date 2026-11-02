package io.awportfoiioapi.excel.service.impl;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awportfoiioapi.apiresponse.ApiResponse;
import io.awportfoiioapi.category.entity.Category;
import io.awportfoiioapi.category.repository.CategoryRepository;
import io.awportfoiioapi.excel.dto.request.ExcelRequest;
import io.awportfoiioapi.excel.dto.response.ExcelColumnResponse;
import io.awportfoiioapi.excel.service.ExcelService;
import io.awportfoiioapi.options.entity.Options;
import io.awportfoiioapi.options.respotiroy.OptionsRepository;
import io.awportfoiioapi.portfolio.entity.Portfolio;
import io.awportfoiioapi.portfolio.repository.PortfolioRepository;
import io.awportfoiioapi.question.entity.Question;
import io.awportfoiioapi.question.respotiroy.QuestionRepository;
import io.awportfoiioapi.submission.entity.Submission;
import io.awportfoiioapi.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ExcelServiceImpl implements ExcelService {
    
    private final QuestionRepository questionRepository;
    private final SubmissionRepository submissionRepository;
    private final PortfolioRepository portfolioRepository;
    private final OptionsRepository optionsRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper mapper;
    
    @Override
    public byte[] createSubmissionExcel(ExcelRequest request) {
        
        
        Long portfolioId = request.getPortfolioId();
        Long submissionId = request.getSubmissionId();
    
        // 0. 포트폴리오 조회 (제목용)
        Portfolio portfolio = portfolioRepository.findById(portfolioId).orElseThrow(() -> new RuntimeException("존재하지 않는 포트폴리오입니다."));
    
        // 1. 컬럼 메타 조회
        List<ExcelColumnResponse> columns = questionRepository.findByColumn(portfolioId);
    
        // 2. 제출 데이터 조회
        Submission submission = submissionRepository.findById(submissionId).orElseThrow(() -> new RuntimeException("존재하지 않는 제출내역입니다."));
    
        try (Workbook workbook = new XSSFWorkbook()) {
    
            // JSON -> Map
            Map<String, Object> responseMap = mapper.readValue(submission.getSubmissionJson(), new TypeReference<>() {});
    
            Sheet sheet = workbook.createSheet("제출 데이터");

            // 여러 개 입력 항목(객실/스페셜)은 칸 안 줄바꿈으로 표시
            CellStyle wrapStyle = workbook.createCellStyle();
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            int rowIdx = 0;
    
            // 헤더 / 데이터 행
            Row headerRow = sheet.createRow(rowIdx++);
            Row dataRow = sheet.createRow(rowIdx++);
    
            // =====================================================
            // A열 : 포트폴리오 제목 고정
            // =====================================================
            headerRow.createCell(0).setCellValue("포트폴리오 제목");
            dataRow.createCell(0).setCellValue(portfolio.getTitle());
    
            // 나머지 컬럼은 B열부터
            int colIdx = 1;
    
            for (ExcelColumnResponse col : columns) {
    
                String optionsType = col.getOptionsType();
    
                if ("AGREEMENT".equals(optionsType)) {
                    continue;
                }
    
                // ===================== 객실 =====================
                if ("PARLOR".equals(optionsType)) {
    
                    List<Map<String, Object>> rooms =
                            (List<Map<String, Object>>) responseMap.get("rooms");
                    
                    headerRow.createCell(colIdx + 0).setCellValue("객실명");
                    headerRow.createCell(colIdx + 1).setCellValue("객실설명");
                    headerRow.createCell(colIdx + 2).setCellValue("객실인원");
                    headerRow.createCell(colIdx + 3).setCellValue("객실형태");
                    headerRow.createCell(colIdx + 4).setCellValue("객실비품");
                    headerRow.createCell(colIdx + 5).setCellValue("비수기");
                    headerRow.createCell(colIdx + 6).setCellValue("준성수기");
                    headerRow.createCell(colIdx + 7).setCellValue("성수기");
    
                    if (rooms != null) {

                        String amenities = numberedLines(rooms.stream()
                                .map(r -> text(r.get("amenities")))
                                .toList());

                        String capacity = numberedLines(rooms.stream()
                                .map(r -> {
                                    Map<String, Object> cap = (Map<String, Object>) r.get("capacity");
                                    if (cap == null) return "";

                                    String standard = text(cap.get("standard"));
                                    String max = text(cap.get("max"));
                                    if (standard.isEmpty() && max.isEmpty()) return "";
                                    return standard + "명/" + max + "명";
                                })
                                .toList());

                        String names = numberedLines(rooms.stream()
                                .map(r -> text(r.get("name")))
                                .toList());

                        String descs = numberedLines(rooms.stream()
                                .map(r -> text(r.get("desc")))
                                .toList());

                        String types = numberedLines(rooms.stream()
                                .map(r -> text(r.get("type")))
                                .toList());

                        Function<Object, String> priceFormatter = priceObj -> {

                            if (!(priceObj instanceof Map<?, ?> raw)) {
                                return "";
                            }

                            @SuppressWarnings("unchecked")
                            Map<String, Object> map = (Map<String, Object>) raw;

                            String weekday = text(map.get("weekday"));
                            String fri = text(map.get("fri"));
                            String sat = text(map.get("sat"));
                            String sun = text(map.get("sun"));

                            return String.format(
                                    "평일:%s 금:%s 토:%s 일:%s",
                                    weekday, fri, sat, sun
                            );
                        };

                        String low = numberedLines(rooms.stream()
                                .map(r -> priceFormatter.apply(r.get("priceLow")))
                                .toList());

                        String mid = numberedLines(rooms.stream()
                                .map(r -> priceFormatter.apply(r.get("priceMid")))
                                .toList());

                        String high = numberedLines(rooms.stream()
                                .map(r -> priceFormatter.apply(r.get("priceHigh")))
                                .toList());

                        setWrapCell(dataRow, colIdx + 0, names, wrapStyle);
                        setWrapCell(dataRow, colIdx + 1, descs, wrapStyle);
                        setWrapCell(dataRow, colIdx + 2, capacity, wrapStyle);
                        setWrapCell(dataRow, colIdx + 3, types, wrapStyle);
                        setWrapCell(dataRow, colIdx + 4, amenities, wrapStyle);
                        setWrapCell(dataRow, colIdx + 5, low, wrapStyle);
                        setWrapCell(dataRow, colIdx + 6, mid, wrapStyle);
                        setWrapCell(dataRow, colIdx + 7, high, wrapStyle);
                    }
    
                    colIdx += 8;
                    continue;
                }
    
                // ===================== 스페셜 =====================
                if ("SPECIAL".equals(optionsType)) {
    
                    List<Map<String, Object>> specials =
                            (List<Map<String, Object>>) responseMap.get("specials");
    
                    headerRow.createCell(colIdx + 0).setCellValue("스페셜명");
                    headerRow.createCell(colIdx + 1).setCellValue("스페셜설명");
    
                    if (specials != null) {
    
                        String names = numberedLines(specials.stream()
                                .map(s -> text(s.get("name")))
                                .toList());

                        String descs = numberedLines(specials.stream()
                                .map(s -> text(s.get("desc")))
                                .toList());

                        setWrapCell(dataRow, colIdx + 0, names, wrapStyle);
                        setWrapCell(dataRow, colIdx + 1, descs, wrapStyle);
                    }
    
                    colIdx += 2;
                    continue;
                }
    
                // ===================== 환불 =====================
                if ("REFUND".equals(optionsType)) {
    
                    List<Map<String, Object>> refunds =
                            (List<Map<String, Object>>) responseMap.get("refunds");
    
                    headerRow.createCell(colIdx).setCellValue("환불기준 및 퍼센트");
    
                    if (refunds != null) {
    
                        String refundTexts = refunds.stream()
                                .map(r -> {
    
                                    String id = String.valueOf(r.getOrDefault("id", ""));
                                    String day = String.valueOf(r.getOrDefault("day", ""));
                                    String percent = String.valueOf(r.getOrDefault("percent", ""));
    
                                    String base;
    
                                    if ("refund-1".equals(id)) {
                                        base = "방문당일 총 금액의";
                                    } else {
                                        base = "방문 " + day + "일 전 총 금액의";
                                    }
    
                                    return base + " " + percent + "% 환불";
                                })
                                .collect(Collectors.joining(", "));
    
                        dataRow.createCell(colIdx).setCellValue(refundTexts);
                    }
    
                    colIdx++;
                    continue;
                }
    
                // ===================== CHECKBOX =====================
                if ("CHECKBOX".equals(optionsType) || "CHECKBOX_INPUT".equals(optionsType)) {
    
                    Map<String, Object> obj =
                            (Map<String, Object>) responseMap.get(String.valueOf(col.getOptionsId()));
    
                    headerRow.createCell(colIdx).setCellValue(col.getColumn());
    
                    String result = "";
    
                    if (obj != null) {
    
                        if (obj.containsKey("selected")) {
    
                            String selected = String.valueOf(obj.get("selected"));
                            Map<String, Object> inputs =
                                    (Map<String, Object>) obj.get("inputs");
    
                            String extra = "";
                            if (inputs != null && inputs.containsKey(selected)) {
                                extra = String.valueOf(inputs.get(selected));
                            }
    
                            result = selected;
                            if (!extra.isBlank()) {
                                result += " (" + extra + ")";
                            }
                        }
    
                        else if (obj.containsKey("checked")
                                && obj.get("checked") instanceof List<?>) {
    
                            List<?> checkedList = (List<?>) obj.get("checked");
    
                            if (!checkedList.isEmpty()
                                    && checkedList.get(0) instanceof String) {
    
                                Map<String, Object> inputs = (Map<String, Object>) obj.get("inputs");
    
                                result = checkedList.stream()
                                        .map(s -> {
                                            String key = String.valueOf(s);
                                            String extra = "";
    
                                            if (inputs != null && inputs.containsKey(key)) {
                                                extra = String.valueOf(inputs.get(key));
                                            }
    
                                            return extra.isBlank()
                                                    ? key
                                                    : key + "(" + extra + ")";
                                        })
                                        .collect(Collectors.joining(", "));
                            }
    
                            else if (!checkedList.isEmpty()
                                    && checkedList.get(0) instanceof Number) {
    
                                List<Integer> idxList = checkedList.stream()
                                        .map(o -> ((Number) o).intValue())
                                        .toList();
    
                                List<String> inputs =
                                        (List<String>) obj.get("inputs");
    
                                if (inputs != null) {
                                    result = idxList.stream()
                                            .map(inputs::get)
                                            .collect(Collectors.joining(", "));
                                }
                            }
                        }
                    }
    
                    dataRow.createCell(colIdx).setCellValue(result);
                    colIdx++;
                    continue;
                }
    
                // ===================== 주소 =====================
                if ("ADDR".equals(optionsType)) {
    
                    headerRow.createCell(colIdx + 0).setCellValue("주소");
                    headerRow.createCell(colIdx + 1).setCellValue("상세주소");
                    headerRow.createCell(colIdx + 2).setCellValue("우편번호");
    
                    Map<String, Object> addr = (Map<String, Object>) responseMap.get(String.valueOf(col.getOptionsId()));
    
                    if (addr != null) {
    
                        dataRow.createCell(colIdx + 0)
                                .setCellValue(String.valueOf(addr.getOrDefault("address", "")));
                        dataRow.createCell(colIdx + 1)
                                .setCellValue(String.valueOf(addr.getOrDefault("detail", "")));
                        dataRow.createCell(colIdx + 2)
                                .setCellValue(String.valueOf(addr.getOrDefault("zonecode", "")));
                    }
    
                    colIdx += 3;
                    continue;
                }
    
                // ===================== 멀티 텍스트 =====================
                if ("MULTI_TEXT".equals(optionsType)) {
    
                    headerRow.createCell(colIdx).setCellValue(col.getColumn());
    
                    Object value = responseMap.get(String.valueOf(col.getOptionsId()));
    
                    if (value instanceof List<?>) {
                        String joined = ((List<?>) value).stream()
                                .map(String::valueOf)
                                .collect(Collectors.joining(", "));
                        dataRow.createCell(colIdx).setCellValue(joined);
                    } else if (value != null) {
                        dataRow.createCell(colIdx).setCellValue(value.toString());
                    } else {
                        dataRow.createCell(colIdx).setCellValue("");
                    }
    
                    colIdx++;
                    continue;
                }
    
                // ===================== 일반 단답형 =====================
                headerRow.createCell(colIdx).setCellValue(col.getColumn());
    
                Object value = responseMap.get(String.valueOf(col.getOptionsId()));
                dataRow.createCell(colIdx).setCellValue(value == null ? "" : value.toString());
                colIdx++;
            }
    
            // ===================== 컬럼 너비 자동 =====================
            for (int i = 0; i < colIdx; i++) {
    
                int maxWidth = 0;
    
                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
    
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
    
                    Cell cell = row.getCell(i);
                    if (cell == null) continue;
    
                    String text = cell.toString();
                    if (text == null) continue;

                    // 줄바꿈된 칸은 가장 긴 줄 기준
                    for (String line : text.split("\n")) {
                        int visual = 0;
                        for (char ch : line.toCharArray()) {
                            visual += (ch > 0x007F) ? 2 : 1;
                        }
                        maxWidth = Math.max(maxWidth, visual);
                    }
                }

                sheet.setColumnWidth(i, Math.min(255 * 256, (maxWidth + 2) * 256));
            }

            // ===================== 데이터 행 높이 (줄 수 기준) =====================
            int maxLines = 1;
            for (Cell cell : dataRow) {
                maxLines = Math.max(maxLines, cell.toString().split("\n", -1).length);
            }
            // 엑셀 행 높이 최대 409pt
            dataRow.setHeightInPoints(Math.min(409f, maxLines * sheet.getDefaultRowHeightInPoints()));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
    
        } catch (Exception e) {
            throw new RuntimeException("엑셀 생성 실패", e);
        }
    }
    
    @Override
    public ApiResponse modifySubmitOff(ExcelRequest request) {
        Long submissionId = request.getSubmissionId();
        
        Submission submission = submissionRepository.findById(submissionId).orElseThrow(() -> new RuntimeException("존재하지않는 제출내역입니다."));
        
        submission.modifySubmitOff();
        
        return new ApiResponse(200, true, "제출완료가 취소 되었습니다.");
    }
    
    @Override
    public ApiResponse copyPortfolio(Long portfolioId) {
        // 1. 원본 포트폴리오 조회
        Portfolio original = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new RuntimeException("포트폴리오가 존재하지 않습니다."));
        
        // 2. 카테고리 조회 (FK 유지)
        Category category = categoryRepository.findById(original.getCategory().getId())
                .orElseThrow(() -> new RuntimeException("카테고리가 존재하지 않습니다."));
        
        // 3. 포트폴리오 복사
        Portfolio copied = Portfolio.builder()
                .category(category)
                .title(original.getTitle() + " 복사본")
                .description(original.getDescription())
                .domain(original.getDomain())
                .orders(original.getOrders())
                .slug(original.getSlug())
                .isActive(original.getIsActive())
                .build();
        
        portfolioRepository.save(copied);
        
        // 4. 질문 목록 조회
        List<Question> questions = questionRepository.findByPortfolioId((original.getId()));
        
        for (Question q : questions) {
            
            // 4-1 질문 복사
            Question copiedQuestion = Question.builder()
                    .portfolio(copied)
                    .step(q.getStep())
                    .build();
            
            questionRepository.save(copiedQuestion);
            
            // 5. 옵션 복사
            List<Options> optionList = optionsRepository.findByQuestionId(q.getId());
            
            for (Options op : optionList) {
                
                Options copiedOption = Options.builder()
                        .question(copiedQuestion)
                        .orders(op.getOrders())
                        .title(op.getTitle())
                        .description(op.getDescription())
                        .type(op.getType())
                        .minLength(op.getMinLength())
                        .maxLength(op.getMaxLength())
                        .minLengthIsActive(op.getMinLengthIsActive())
                        .optionsIsActive(op.getOptionsIsActive())
                        .option(op.getOption())
                        .build();
                
                optionsRepository.save(copiedOption);
            }
        }
        
        return new ApiResponse(200, true, "포트폴리오가 복사되었습니다.");
    }

    // null 이면 빈 문자열 (getOrDefault 는 값이 null 로 들어있으면 "null" 이 찍힘)
    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    // [1] 값\n[2] 값 ... 형태로 변환 (사용자가 입력한 "/" "," 와 구분되도록)
    private static String numberedLines(List<String> values) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append("\n");
            String value = values.get(i);
            sb.append("[").append(i + 1).append("] ").append(value == null || value.isBlank() ? "(미입력)" : value);
        }
        return sb.toString();
    }

    private static void setWrapCell(Row row, int colIdx, String value, CellStyle style) {
        Cell cell = row.createCell(colIdx);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
