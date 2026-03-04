/**
 * @module routes/reports
 * @description Report generation and export route handlers.
 *
 * All endpoints require authentication via the
 * {@link module:middleware/auth~authenticateUser} middleware. Every query is
 * scoped to the authenticated user's email to enforce data isolation.
 *
 * Endpoints:
 * - `GET /api/reports/client/:clientId`          - JSON summary report for a client.
 * - `GET /api/reports/export/csv/:clientId`       - Download a CSV export of work entries.
 * - `GET /api/reports/export/pdf/:clientId`        - Download a PDF export of work entries.
 *
 * CSV files are written to a temporary directory and streamed to the client
 * before being cleaned up. PDF documents are generated with PDFKit and piped
 * directly to the HTTP response.
 *
 * @see module:middleware/auth
 */

const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateUser } = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

/**
 * GET /api/reports/client/:clientId
 *
 * Returns an hourly summary report for the specified client, including total
 * hours, entry count, and the full list of work entries sorted by date
 * descending.
 *
 * @route GET /api/reports/client/:clientId
 * @param {string} req.params.clientId - The client's numeric ID.
 * @returns {Object} 200 - `{ client: { id, name }, workEntries, totalHours, entryCount }`
 * @returns {Object} 400 - Invalid (non-numeric) client ID.
 * @returns {Object} 404 - Client not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.get('/client/:clientId', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  // Verify client belongs to user
  db.get(
    'SELECT id, name FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, client) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Get work entries for this client
      db.all(
        `SELECT id, hours, description, date, created_at, updated_at
         FROM work_entries 
         WHERE client_id = ? AND user_email = ? 
         ORDER BY date DESC`,
        [clientId, req.userEmail],
        (err, workEntries) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          // Calculate total hours
          const totalHours = workEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
          
          res.json({
            client: client,
            workEntries: workEntries,
            totalHours: totalHours,
            entryCount: workEntries.length
          });
        }
      );
    }
  );
});

/**
 * GET /api/reports/export/csv/:clientId
 *
 * Generates a CSV file containing all work entries for the specified client
 * and sends it as a downloadable attachment. The file is written to a
 * temporary directory, streamed to the response, and then deleted.
 *
 * CSV columns: Date, Hours, Description, Created At.
 *
 * @route GET /api/reports/export/csv/:clientId
 * @param {string} req.params.clientId - The client's numeric ID.
 * @returns {File} 200 - CSV file download (`Content-Disposition: attachment`).
 * @returns {Object} 400 - Invalid (non-numeric) client ID.
 * @returns {Object} 404 - Client not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database or file-system failure.
 */
router.get('/export/csv/:clientId', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  // Verify client belongs to user and get data
  db.get(
    'SELECT id, name FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, client) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Get work entries
      db.all(
        `SELECT hours, description, date, created_at
         FROM work_entries 
         WHERE client_id = ? AND user_email = ? 
         ORDER BY date DESC`,
        [clientId, req.userEmail],
        (err, workEntries) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          // Create temporary CSV file
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_report_${timestamp}.csv`;
          const tempPath = path.join(__dirname, '../../temp', filename);
          
          // Ensure temp directory exists
          const tempDir = path.dirname(tempPath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const csvWriter = createCsvWriter({
            path: tempPath,
            header: [
              { id: 'date', title: 'Date' },
              { id: 'hours', title: 'Hours' },
              { id: 'description', title: 'Description' },
              { id: 'created_at', title: 'Created At' }
            ]
          });
          
          csvWriter.writeRecords(workEntries)
            .then(() => {
              // Send file and clean up
              res.download(tempPath, filename, (err) => {
                if (err) {
                  console.error('Error sending file:', err);
                }
                // Clean up temp file
                fs.unlink(tempPath, (unlinkErr) => {
                  if (unlinkErr) {
                    console.error('Error deleting temp file:', unlinkErr);
                  }
                });
              });
            })
            .catch((error) => {
              console.error('Error creating CSV:', error);
              res.status(500).json({ error: 'Failed to generate CSV report' });
            });
        }
      );
    }
  );
});

/**
 * GET /api/reports/export/pdf/:clientId
 *
 * Generates a PDF document containing a formatted time report for the
 * specified client and streams it directly to the response. The PDF includes
 * a title, summary statistics (total hours, entry count, generation date),
 * and a tabular listing of all work entries.
 *
 * Pages break automatically after approximately 700pt of content.
 *
 * @route GET /api/reports/export/pdf/:clientId
 * @param {string} req.params.clientId - The client's numeric ID.
 * @returns {File} 200 - PDF file download (`Content-Type: application/pdf`).
 * @returns {Object} 400 - Invalid (non-numeric) client ID.
 * @returns {Object} 404 - Client not found or not owned by the user.
 * @returns {Object} 500 - Internal server error on database failure.
 */
router.get('/export/pdf/:clientId', (req, res) => {
  const clientId = parseInt(req.params.clientId);
  
  if (isNaN(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' });
  }
  
  const db = getDatabase();
  
  // Verify client belongs to user and get data
  db.get(
    'SELECT id, name FROM clients WHERE id = ? AND user_email = ?',
    [clientId, req.userEmail],
    (err, client) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      // Get work entries
      db.all(
        `SELECT hours, description, date, created_at
         FROM work_entries 
         WHERE client_id = ? AND user_email = ? 
         ORDER BY date DESC`,
        [clientId, req.userEmail],
        (err, workEntries) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          // Create PDF
          const doc = new PDFDocument();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${client.name.replace(/[^a-zA-Z0-9]/g, '_')}_report_${timestamp}.pdf`;
          
          // Set response headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          
          // Pipe PDF to response
          doc.pipe(res);
          
          // Add content to PDF
          doc.fontSize(20).text(`Time Report for ${client.name}`, { align: 'center' });
          doc.moveDown();
          
          const totalHours = workEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
          doc.fontSize(14).text(`Total Hours: ${totalHours.toFixed(2)}`);
          doc.text(`Total Entries: ${workEntries.length}`);
          doc.text(`Generated: ${new Date().toLocaleString()}`);
          doc.moveDown();
          
          // Add table header
          doc.fontSize(12).text('Date', 50, doc.y, { width: 100 });
          doc.text('Hours', 150, doc.y - 15, { width: 80 });
          doc.text('Description', 230, doc.y - 15, { width: 300 });
          doc.moveDown();
          
          // Add horizontal line
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
          
          // Add work entries
          workEntries.forEach((entry, index) => {
            const y = doc.y;
            
            // Check if we need a new page
            if (y > 700) {
              doc.addPage();
            }
            
            doc.text(entry.date, 50, doc.y, { width: 100 });
            doc.text(entry.hours.toString(), 150, y, { width: 80 });
            doc.text(entry.description || 'No description', 230, y, { width: 300 });
            doc.moveDown();
            
            // Add separator line every 5 entries
            if ((index + 1) % 5 === 0) {
              doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
              doc.moveDown(0.5);
            }
          });
          
          // Finalize PDF
          doc.end();
        }
      );
    }
  );
});

module.exports = router;
