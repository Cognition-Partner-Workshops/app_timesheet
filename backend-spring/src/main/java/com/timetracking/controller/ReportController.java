package com.timetracking.controller;

import com.timetracking.dto.response.ReportResponse;
import com.timetracking.service.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<ReportResponse> getClientReport(
            @PathVariable Long clientId,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        ReportResponse report = reportService.getClientReport(clientId, userEmail);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/export/csv/{clientId}")
    public ResponseEntity<byte[]> exportCsv(
            @PathVariable Long clientId,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        byte[] csvData = reportService.exportCsv(clientId, userEmail);
        String filename = reportService.generateCsvFilename(clientId, userEmail);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping("/export/pdf/{clientId}")
    public ResponseEntity<byte[]> exportPdf(
            @PathVariable Long clientId,
            HttpServletRequest request) {
        String userEmail = (String) request.getAttribute("userEmail");
        byte[] pdfData = reportService.exportPdf(clientId, userEmail);
        String filename = reportService.generatePdfFilename(clientId, userEmail);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfData);
    }
}
