const PDFDocument = require('pdfkit');

/**
 * Generate a sleek, compact VIP event ticket pass for SBM 2026
 * Compact mobile pass size: 420pt x 590pt (Fits perfectly on mobile screens & prints cleanly)
 * @param {Object} registration - Registration data
 * @returns {PDFDocument} PDF document stream
 */
function generateTicketPDF(registration) {
  const doc = new PDFDocument({
    size: [420, 590],
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    info: {
      Title: `SBM 2026 Ticket - ${registration.ticket_id || registration.ticketId || 'Pass'}`,
      Author: 'Holy Hill Chapel Assemblies of God',
      Subject: 'Supernatural Breakfast Meeting 2026 Pass'
    }
  });

  const ticketId = registration.ticket_id || registration.ticketId || registration['Ticket ID'] || 'SBM26-000000';
  const name = registration.name || registration.Name || 'Valued Attendee';
  const memberStatus = registration.member_status || registration.memberStatus || registration['Member Status'] || 'Church Member';

  // Palette (Light Mode - Ash Slate & Rose Pink)
  const ash950 = '#0f172a';
  const ash900 = '#1e293b';
  const ash800 = '#334155';
  const ash700 = '#475569';
  const ash600 = '#64748b';
  const ash500 = '#94a3b8';
  const ash200 = '#e2e8f0';
  const ash100 = '#f8fafc';
  
  const pink700 = '#be123c';
  const pink600 = '#e11d48';
  const pink200 = '#fecdd3';
  const pink100 = '#ffe4e6';
  const pink50  = '#fff1f2';

  const emerald700 = '#047857';
  const emerald50  = '#ecfdf5';
  const emerald200 = '#a7f3d0';

  // 1. Canvas Background
  doc.rect(0, 0, 420, 590).fill('#f1f5f9');

  // 2. Main Ticket Card
  doc.roundedRect(16, 16, 388, 558, 14)
     .fillAndStroke('#ffffff', ash200);

  // Top Accent Gradient Bar
  doc.roundedRect(16, 16, 388, 6, 3)
     .fill(pink600);

  // 3. Header Section
  let y = 34;

  // Church Eyebrow
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor(pink600)
     .text('HOLY HILL CHAPEL  ·  ASSEMBLIES OF GOD', 25, y, { align: 'center', width: 370, characterSpacing: 1.5 });

  y += 16;

  // Single-Line Cohesive Title
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(ash950)
     .text('SUPERNATURAL BREAKFAST MEETING 2026', 25, y, { align: 'center', width: 370, characterSpacing: 0.5 });

  y += 22;

  // Confirmation Badge
  doc.roundedRect(130, y, 160, 20, 10)
     .fillAndStroke(emerald50, emerald200);

  doc.fontSize(8.5)
     .font('Helvetica-Bold')
     .fillColor(emerald700)
     .text('✓  REGISTRATION CONFIRMED', 130, y + 5.5, { align: 'center', width: 160, characterSpacing: 0.5 });

  y += 30;

  // 4. Ticket Pass Card (Dashed Border with Attendee & Ticket ID)
  const ticketCardY = y;
  const ticketCardH = 120;

  doc.roundedRect(28, ticketCardY, 364, ticketCardH, 10)
     .fillAndStroke(pink50, pink200);

  // Ticket Code Header
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor(pink600)
     .text('OFFICIAL E-TICKET PASS', 42, ticketCardY + 12, { characterSpacing: 1.2 });

  // Ticket ID
  doc.fontSize(22)
     .font('Courier-Bold')
     .fillColor(pink700)
     .text(ticketId, 42, ticketCardY + 24, { characterSpacing: 1 });

  // Status Badge Pill
  const badgeText = memberStatus.toUpperCase();
  const badgeW = Math.max(90, badgeText.length * 6.5 + 14);
  doc.roundedRect(364 + 28 - badgeW - 14, ticketCardY + 20, badgeW, 20, 10)
     .fillAndStroke('#ffffff', pink200);

  doc.fontSize(7.5)
     .font('Helvetica-Bold')
     .fillColor(pink700)
     .text(badgeText, 364 + 28 - badgeW - 14, ticketCardY + 26, { align: 'center', width: badgeW });

  // Divider inside Ticket Card
  doc.moveTo(42, ticketCardY + 60).lineTo(376, ticketCardY + 60).strokeColor(pink200).lineWidth(0.8).stroke();

  // Attendee Name inside Ticket Card
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor(ash600)
     .text('ATTENDEE NAME', 42, ticketCardY + 70, { characterSpacing: 0.8 });

  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor(ash950)
     .text(name, 42, ticketCardY + 84, { width: 330 });

  y += ticketCardH + 16;

  // 5. Event Schedule & Venue Card
  const eventCardY = y;
  const eventCardH = 150;

  doc.roundedRect(28, eventCardY, 364, eventCardH, 10)
     .fillAndStroke(ash100, ash200);

  doc.fontSize(8.5)
     .font('Helvetica-Bold')
     .fillColor(pink600)
     .text('EVENT SCHEDULE & LOCATION', 42, eventCardY + 12, { characterSpacing: 1 });

  const drawRow = (icon, label, val, rowY) => {
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(ash900)
       .text(label + ':', 42, rowY);
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(ash700)
       .text(val, 100, rowY, { width: 280 });
  };

  drawRow('📅', 'Date', 'Saturday, 14th November 2026', eventCardY + 30);
  drawRow('⏰', 'Time', '7:00 AM (Prompt)', eventCardY + 54);
  drawRow('📍', 'Venue', 'The Palms, Labadi Beach Hotel, Accra', eventCardY + 78);
  drawRow('🎙️', 'Host', 'Rev. Dr. Kwadwo Bempah', eventCardY + 102);
  drawRow('✨', 'Theme', 'Anticipate a Divine Encounter', eventCardY + 126);

  y += eventCardH + 14;

  // 6. Important Notice Box
  const noticeY = y;
  const noticeH = 50;

  doc.roundedRect(28, noticeY, 364, noticeH, 6)
     .fillAndStroke(pink50, pink200);

  doc.rect(28, noticeY, 3.5, noticeH)
     .fill(pink600);

  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor(pink700)
     .text('IMPORTANT ENTRANCE INSTRUCTIONS', 40, noticeY + 8, { characterSpacing: 0.6 });

  doc.fontSize(8)
     .font('Helvetica')
     .fillColor(ash700)
     .text('• Present this digital pass or printed copy at the venue entrance.', 40, noticeY + 22)
     .text('• Gates open promptly at 7:00 AM. Please arrive early for check-in.', 40, noticeY + 34);

  y += noticeH + 16;

  // 7. Footer & Signature
  doc.fontSize(8.5)
     .font('Helvetica-Bold')
     .fillColor(ash800)
     .text('HHC-SBM26 Registration Team', 25, y, { align: 'center', width: 370 });

  doc.fontSize(7.5)
     .font('Helvetica')
     .fillColor(ash500)
     .text('Holy Hill Chapel · Assemblies of God · SBM 2026 Official Pass', 25, y + 13, { align: 'center', width: 370 });

  return doc;
}

module.exports = {
  generateTicketPDF
};
