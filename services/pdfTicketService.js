const PDFDocument = require('pdfkit');

/**
 * Generate a PDF ticket for the registration
 * @param {Object} registration - Registration data
 * @returns {PDFDocument} PDF document stream
 */
function generateTicketPDF(registration) {
  // Create a new PDF document
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Extract registration data
  const ticketId = registration.ticket_id || registration.ticketId || registration['Ticket ID'];
  const name = registration.name || registration.Name;
  const contact = registration.contact || registration.Contact;
  const location = registration.location || registration.Location;
  const email = registration.email || registration.Email;
  const registeredAt = registration.registered_at || registration.registeredAt || registration['Registered At'];

  // Define colors matching the email template
  const orangeColor = '#FF6B35';
  const goldColor = '#F7931E';
  const redColor = '#C1272D';
  const lightBg = '#FFF5E6';

  // Header with gradient effect (simulated with rectangles)
  doc.rect(0, 0, 612, 150).fill(orangeColor);
  
  // Event Title
  doc.fontSize(32)
     .fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .text('SUPERNATURAL', 50, 40, { align: 'center' });
  
  doc.fontSize(32)
     .text('BREAKFAST MEETING', 50, 75, { align: 'center' });
  
  doc.fontSize(36)
     .text('2025', 50, 110, { align: 'center' });

  // Reset position
  doc.moveDown(3);

  // Ticket Title
  doc.fontSize(20)
     .fillColor('#555555')
     .font('Helvetica')
     .text('Event Registration Confirmation', 50, 180, { align: 'center' });

  doc.moveDown(2);

  // Ticket ID Box
  doc.rect(50, 230, 512, 60)
     .fillAndStroke(lightBg, goldColor)
     .lineWidth(3);

  doc.fontSize(18)
     .fillColor(redColor)
     .font('Helvetica-Bold')
     .text(`Ticket ID: ${ticketId}`, 70, 250);

  doc.moveDown(3);

  // Registration Details
  doc.fontSize(14)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('Registration Details', 50, 320);

  doc.moveDown(0.5);

  // Details table
  const detailsY = 350;
  const lineHeight = 25;

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#555555');

  // Name
  doc.text('Name:', 50, detailsY);
  doc.font('Helvetica')
     .fillColor('#333333')
     .text(name, 200, detailsY);

  // Contact
  doc.font('Helvetica-Bold')
     .fillColor('#555555')
     .text('Contact:', 50, detailsY + lineHeight);
  doc.font('Helvetica')
     .fillColor('#333333')
     .text(contact, 200, detailsY + lineHeight);

  // Location
  doc.font('Helvetica-Bold')
     .fillColor('#555555')
     .text('Location:', 50, detailsY + lineHeight * 2);
  doc.font('Helvetica')
     .fillColor('#333333')
     .text(location, 200, detailsY + lineHeight * 2);

  // Email
  if (email && email !== 'N/A') {
    doc.font('Helvetica-Bold')
       .fillColor('#555555')
       .text('Email:', 50, detailsY + lineHeight * 3);
    doc.font('Helvetica')
       .fillColor('#333333')
       .text(email, 200, detailsY + lineHeight * 3);
  }

  // Registration Date
  doc.font('Helvetica-Bold')
     .fillColor('#555555')
     .text('Registered:', 50, detailsY + lineHeight * 4);
  doc.font('Helvetica')
     .fillColor('#333333')
     .text(new Date(registeredAt).toLocaleString(), 200, detailsY + lineHeight * 4);

  // Important Notice Box
  doc.rect(50, 520, 512, 80)
     .fillAndStroke('#FFF9E6', '#FFD700')
     .lineWidth(2);

  doc.fontSize(11)
     .fillColor('#333333')
     .font('Helvetica-Bold')
     .text('IMPORTANT:', 70, 535);

  doc.font('Helvetica')
     .fontSize(10)
     .text('Please present this ticket at the event entrance.', 70, 555);
  doc.text('Keep this ticket safe and bring it with you on the event day.', 70, 570);

  // Footer
  doc.fontSize(10)
     .fillColor('#666666')
     .font('Helvetica')
     .text('FROM: HHC-SBM25 Registration Team', 50, 630, { align: 'center' });

  doc.fontSize(9)
     .fillColor('#999999')
     .text('© 2025 Holy Hill Chapel. All rights reserved.', 50, 750, { align: 'center' });

  return doc;
}

module.exports = {
  generateTicketPDF
};
