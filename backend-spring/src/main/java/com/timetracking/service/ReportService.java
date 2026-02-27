package com.timetracking.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import com.timetracking.dto.response.ReportResponse;
import com.timetracking.entity.Client;
import com.timetracking.entity.WorkEntry;
import com.timetracking.exception.ResourceNotFoundException;
import com.timetracking.repository.ClientRepository;
import com.timetracking.repository.WorkEntryRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final ClientRepository clientRepository;
    private final WorkEntryRepository workEntryRepository;

    public ReportService(ClientRepository clientRepository, WorkEntryRepository workEntryRepository) {
        this.clientRepository = clientRepository;
        this.workEntryRepository = workEntryRepository;
    }

    public ReportResponse getClientReport(Long clientId, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(clientId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        List<WorkEntry> workEntries = workEntryRepository.findByClientIdAndUserEmailOrderByDateDesc(clientId, userEmail);

        BigDecimal totalHours = workEntries.stream()
                .map(WorkEntry::getHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ReportResponse response = new ReportResponse();
        response.setClient(new ReportResponse.ClientInfo(client.getId(), client.getName()));
        response.setWorkEntries(workEntries.stream().map(this::toReportWorkEntry).collect(Collectors.toList()));
        response.setTotalHours(totalHours);
        response.setEntryCount(workEntries.size());

        return response;
    }

    public byte[] exportCsv(Long clientId, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(clientId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        List<WorkEntry> workEntries = workEntryRepository.findByClientIdAndUserEmailOrderByDateDesc(clientId, userEmail);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             CSVWriter csvWriter = new CSVWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8))) {

            // Write header
            csvWriter.writeNext(new String[]{"Date", "Hours", "Description", "Created At"});

            // Write data rows
            for (WorkEntry entry : workEntries) {
                csvWriter.writeNext(new String[]{
                        entry.getDate() != null ? entry.getDate().toString() : "",
                        entry.getHours() != null ? entry.getHours().toString() : "",
                        entry.getDescription() != null ? entry.getDescription() : "",
                        entry.getCreatedAt() != null ? entry.getCreatedAt().toString() : ""
                });
            }

            csvWriter.flush();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV report", e);
        }
    }

    public byte[] exportPdf(Long clientId, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(clientId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));

        List<WorkEntry> workEntries = workEntryRepository.findByClientIdAndUserEmailOrderByDateDesc(clientId, userEmail);

        BigDecimal totalHours = workEntries.stream()
                .map(WorkEntry::getHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Title
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            Paragraph title = new Paragraph("Time Report for " + client.getName(), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));

            // Summary
            Font summaryFont = FontFactory.getFont(FontFactory.HELVETICA, 14);
            document.add(new Paragraph("Total Hours: " + totalHours.setScale(2).toPlainString(), summaryFont));
            document.add(new Paragraph("Total Entries: " + workEntries.size(), summaryFont));
            document.add(new Paragraph("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), summaryFont));
            document.add(new Paragraph(" "));

            // Table
            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{20f, 15f, 65f});

            // Table headers
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            addTableHeader(table, "Date", headerFont);
            addTableHeader(table, "Hours", headerFont);
            addTableHeader(table, "Description", headerFont);

            // Table rows
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            for (WorkEntry entry : workEntries) {
                table.addCell(new PdfPCell(new Phrase(entry.getDate() != null ? entry.getDate().toString() : "", cellFont)));
                table.addCell(new PdfPCell(new Phrase(entry.getHours() != null ? entry.getHours().toString() : "", cellFont)));
                table.addCell(new PdfPCell(new Phrase(entry.getDescription() != null ? entry.getDescription() : "No description", cellFont)));
            }

            document.add(table);
            document.close();

            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    public String generateCsvFilename(Long clientId, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(clientId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        String safeName = client.getName().replaceAll("[^a-zA-Z0-9]", "_");
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss"));
        return safeName + "_report_" + timestamp + ".csv";
    }

    public String generatePdfFilename(Long clientId, String userEmail) {
        Client client = clientRepository.findByIdAndUserEmail(clientId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        String safeName = client.getName().replaceAll("[^a-zA-Z0-9]", "_");
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH-mm-ss"));
        return safeName + "_report_" + timestamp + ".pdf";
    }

    private void addTableHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(5);
        table.addCell(cell);
    }

    private ReportResponse.ReportWorkEntry toReportWorkEntry(WorkEntry entry) {
        ReportResponse.ReportWorkEntry reportEntry = new ReportResponse.ReportWorkEntry();
        reportEntry.setId(entry.getId());
        reportEntry.setHours(entry.getHours());
        reportEntry.setDescription(entry.getDescription());
        reportEntry.setDate(entry.getDate() != null ? entry.getDate().toString() : null);
        reportEntry.setCreatedAt(entry.getCreatedAt() != null ? entry.getCreatedAt().toString() : null);
        reportEntry.setUpdatedAt(entry.getUpdatedAt() != null ? entry.getUpdatedAt().toString() : null);
        return reportEntry;
    }
}
