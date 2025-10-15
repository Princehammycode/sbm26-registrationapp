const mysql = require('mysql2/promise');

let pool;

// Initialize database connection pool
async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hhc_sbm_registration',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected');
    connection.release();

    // Create table if not exists
    await createTable();
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
    console.log('⚠️  Application will continue without MySQL. Data will be saved to Excel only.');
  }
}

// Create registrations table
async function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS registrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      contact VARCHAR(50) NOT NULL,
      location VARCHAR(255),
      email VARCHAR(255),
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_sent BOOLEAN DEFAULT FALSE,
      sms_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Registrations table ready');
  } catch (error) {
    console.error('Table creation error:', error.message);
  }
}

// Save registration to database
async function saveRegistration(registration) {
  if (!pool) {
    console.log('⚠️  MySQL not available, skipping database save');
    return { success: false, message: 'Database not available' };
  }

  const query = `
    INSERT INTO registrations (ticket_id, name, contact, location, email, registered_at, email_sent, sms_sent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    registration.ticketId,
    registration.name,
    registration.contact,
    registration.location,
    registration.email,
    registration.registeredAt,
    registration.emailSent,
    registration.smsSent
  ];

  try {
    const [result] = await pool.query(query, values);
    console.log('Registration saved to database:', registration.ticketId);
    return { success: true, insertId: result.insertId };
  } catch (error) {
    console.error('Database save error:', error.message);
    throw error;
  }
}

// Update email status
async function updateEmailStatus(ticketId, status) {
  if (!pool) return;

  const query = 'UPDATE registrations SET email_sent = ? WHERE ticket_id = ?';
  
  try {
    await pool.query(query, [status, ticketId]);
  } catch (error) {
    console.error('Email status update error:', error.message);
  }
}

// Update SMS status
async function updateSMSStatus(ticketId, status) {
  if (!pool) return;

  const query = 'UPDATE registrations SET sms_sent = ? WHERE ticket_id = ?';
  
  try {
    await pool.query(query, [status, ticketId]);
  } catch (error) {
    console.error('SMS status update error:', error.message);
  }
}

// Get all registrations
async function getAllRegistrations() {
  if (!pool) {
    return [];
  }

  const query = 'SELECT * FROM registrations ORDER BY registered_at DESC';
  
  try {
    const [rows] = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Get registrations error:', error.message);
    return [];
  }
}

// Get statistics
async function getStats() {
  if (!pool) {
    return {
      total: 0,
      emailsSent: 0,
      smsSent: 0
    };
  }

  try {
    const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM registrations');
    const [emailResult] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE email_sent = TRUE');
    const [smsResult] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE sms_sent = TRUE');

    return {
      total: totalResult[0].count,
      emailsSent: emailResult[0].count,
      smsSent: smsResult[0].count
    };
  } catch (error) {
    console.error('Get stats error:', error.message);
    return { total: 0, emailsSent: 0, smsSent: 0 };
  }
}

// Get ticket by ID
async function getTicket(ticketId) {
  if (!pool) {
    return null;
  }

  const query = 'SELECT * FROM registrations WHERE ticket_id = ?';
  
  try {
    const [rows] = await pool.query(query, [ticketId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Get ticket error:', error.message);
    return null;
  }
}

module.exports = {
  initDatabase,
  saveRegistration,
  updateEmailStatus,
  updateSMSStatus,
  getAllRegistrations,
  getStats,
  getTicket
};
