const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create registrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        location VARCHAR(255),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email_sent BOOLEAN DEFAULT FALSE,
        sms_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_id ON registrations(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_contact ON registrations(contact);
      CREATE INDEX IF NOT EXISTS idx_registration_date ON registrations(registration_date);
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Save registration
async function saveRegistration(registration) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO registrations (ticket_id, name, contact, email, location, email_sent, sms_sent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      registration.ticketId,
      registration.name,
      registration.contact,
      registration.email || null,
      registration.location || null,
      false,
      false
    ];
    
    const result = await client.query(query, values);
    console.log('✅ Registration saved to PostgreSQL:', registration.ticketId);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database save error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update registration status
async function updateRegistrationStatus(ticketId, emailSent, smsSent) {
  const client = await pool.connect();
  
  try {
    const query = `
      UPDATE registrations 
      SET email_sent = $1, sms_sent = $2, updated_at = CURRENT_TIMESTAMP
      WHERE ticket_id = $3
      RETURNING *
    `;
    
    const values = [emailSent, smsSent, ticketId];
    const result = await client.query(query, values);
    
    if (result.rows.length > 0) {
      console.log('✅ Status updated in PostgreSQL:', ticketId);
      return result.rows[0];
    } else {
      throw new Error('Registration not found');
    }
  } catch (error) {
    console.error('❌ Database update error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get all registrations
async function getAllRegistrations() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM registrations 
      ORDER BY registration_date DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Database fetch error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get registration by ticket ID
async function getRegistrationByTicketId(ticketId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM registrations WHERE ticket_id = $1',
      [ticketId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Database fetch error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get registration by contact
async function getRegistrationByContact(contact) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM registrations WHERE contact = $1',
      [contact]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Database fetch error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get statistics
async function getStatistics() {
  const client = await pool.connect();
  
  try {
    const totalResult = await client.query('SELECT COUNT(*) as count FROM registrations');
    const emailResult = await client.query('SELECT COUNT(*) as count FROM registrations WHERE email_sent = true');
    const smsResult = await client.query('SELECT COUNT(*) as count FROM registrations WHERE sms_sent = true');
    const todayResult = await client.query(`
      SELECT COUNT(*) as count FROM registrations 
      WHERE DATE(registration_date) = CURRENT_DATE
    `);
    
    return {
      total: parseInt(totalResult.rows[0].count),
      emailSent: parseInt(emailResult.rows[0].count),
      smsSent: parseInt(smsResult.rows[0].count),
      today: parseInt(todayResult.rows[0].count)
    };
  } catch (error) {
    console.error('❌ Database stats error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Check if contact already registered
async function isContactRegistered(contact) {
  const registration = await getRegistrationByContact(contact);
  return registration !== null;
}

// Close pool (for graceful shutdown)
async function closePool() {
  await pool.end();
  console.log('✅ PostgreSQL pool closed');
}

module.exports = {
  initializeDatabase,
  saveRegistration,
  updateRegistrationStatus,
  getAllRegistrations,
  getRegistrationByTicketId,
  getRegistrationByContact,
  getStatistics,
  isContactRegistered,
  closePool
};
