const { Pool } = require('pg');

const isLocalDb = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: !isLocalDb ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

const NORMALIZE_CONTACT_SQL = `
  CREATE OR REPLACE FUNCTION normalize_contact(phone TEXT) RETURNS TEXT AS $$
  BEGIN
    phone := regexp_replace(phone, '[\\s\\-\\+\\(\\)]', '', 'g');
    IF phone LIKE '0%' AND length(phone) = 10 THEN
      phone := '233' || substring(phone FROM 2);
    END IF;
    IF length(phone) = 9 AND phone NOT LIKE '233%' THEN
      phone := '233' || phone;
    END IF;
    RETURN phone;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;
`;

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(NORMALIZE_CONTACT_SQL);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(20) NOT NULL,
        contact_normalized VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        location VARCHAR(255),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email_sent BOOLEAN DEFAULT FALSE,
        sms_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_ticket_id
        ON registrations(ticket_id)
    `);
    // Drop unique constraint on phone if it was previously created, and use standard non-unique index
    try {
      await client.query(`DROP INDEX IF EXISTS uq_registrations_contact_norm`);
    } catch (_) {}
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registrations_contact_norm
        ON registrations(contact_normalized)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_registration_date
        ON registrations(registration_date)
    `);

    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='registrations' AND column_name='contact_normalized'
    `);
    if (colCheck.rows.length === 0) {
      await client.query(`ALTER TABLE registrations ADD COLUMN contact_normalized VARCHAR(20)`);
      await client.query(`UPDATE registrations SET contact_normalized = normalize_contact(contact)`);
      await client.query(`ALTER TABLE registrations ALTER COLUMN contact_normalized SET NOT NULL`);
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_registrations_contact_norm ON registrations(contact_normalized)
        `);
      } catch (_) {}
    }

    const memberCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='registrations' AND column_name='member_status'
    `);
    if (memberCheck.rows.length === 0) {
      try {
        await client.query(`ALTER TABLE registrations ADD COLUMN member_status VARCHAR(100)`);
      } catch (_) {}
    }

    // Initialize new_converts table for Altar Call records
    await client.query(`
      CREATE TABLE IF NOT EXISTS new_converts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(50),
        contact_normalized VARCHAR(50),
        location VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_new_converts_created
        ON new_converts(created_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_new_converts_contact_norm
        ON new_converts(contact_normalized)
    `);

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_reg_name_phone
          ON registrations(LOWER(TRIM(name)), contact_normalized)
      `);
    } catch (_) {}

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_converts_name_phone
          ON new_converts(LOWER(TRIM(name)), contact_normalized)
      `);
    } catch (_) {}

    console.log('✅ Database tables (registrations & new_converts) initialized with multi-registrant support');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

function normalizeContact(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-+\(\)]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '233' + cleaned.substring(1);
  }
  if (cleaned.length === 9 && !cleaned.startsWith('233')) {
    cleaned = '233' + cleaned;
  }
  return cleaned;
}

function generateTicketId() {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `SBM26-${randomNumber}`;
}

async function saveRegistration(registration) {
  return saveRegistrationWithDedup(registration);
}

async function saveRegistrationWithDedup(registration) {
  const normalizedContact = normalizeContact(registration.contact);
  const trimmedName = String(registration.name || '').trim();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockKey = parseInt(
      normalizedContact.substring(normalizedContact.length - 9) || '0',
      10
    );
    await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);

    // Check for duplicate registration: same name (case-insensitive) and same phone number
    const dupCheck = await client.query(
      `SELECT ticket_id, name, contact FROM registrations 
       WHERE (contact_normalized = $1 OR contact = $2) 
         AND LOWER(TRIM(name)) = LOWER(TRIM($3)) 
       LIMIT 1`,
      [normalizedContact, registration.contact, trimmedName]
    );
    if (dupCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('⚠️ Duplicate registration rejected for:', trimmedName, normalizedContact);
      return {
        success: false,
        duplicate: true,
        code: 'DUPLICATE_REGISTRATION',
        ticketId: dupCheck.rows[0].ticket_id,
        message: 'You are already registered! Please check your SMS for your ticket ID.'
      };
    }

    let ticketId = null;
    let inserted = null;
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
      const candidate = generateTicketId();
      try {
        const res = await client.query(
          `
          INSERT INTO registrations
            (ticket_id, name, contact, contact_normalized, email, location, member_status, email_sent, sms_sent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
          `,
          [
            candidate,
            registration.name,
            registration.contact,
            normalizedContact,
            registration.email || null,
            registration.location || null,
            registration.memberStatus || null,
            false,
            false
          ]
        );
        ticketId = candidate;
        inserted = res.rows[0];
        break;
      } catch (insErr) {
        if (String(insErr.code) === '23505' && /ticket_id/.test(insErr.constraint || '')) {
          console.log(`⚠️ Ticket ID collision: ${candidate}, retrying (${i + 1}/${maxAttempts})`);
          continue;
        }
        throw insErr;
      }
    }

    if (!inserted) {
      await client.query('ROLLBACK');
      throw new Error('Failed to generate unique ticket ID after multiple attempts');
    }

    registration.ticketId = ticketId;
    await client.query('COMMIT');
    console.log('✅ Registration saved to PostgreSQL:', ticketId, 'for', registration.name);
    return { success: true, row: inserted, ticketId };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('❌ Database save error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function isContactRegisteredAny(contact) {
  const normalized = normalizeContact(contact);
  const variants = [normalized];
  if (normalized.startsWith('233') && normalized.length === 12) {
    variants.push('0' + normalized.substring(3));
  }
  if (contact && contact.startsWith('0')) {
    variants.push(normalizeContact(contact));
  }
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT 1 FROM registrations WHERE contact_normalized = ANY($1::text[]) LIMIT 1`,
      [variants.filter((v, i, a) => a.indexOf(v) === i)]
    );
    return res.rows.length > 0;
  } finally {
    client.release();
  }
}

async function updateRegistrationStatus(ticketId, emailSent, smsSent) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE registrations 
      SET email_sent = COALESCE($1, email_sent),
          sms_sent = COALESCE($2, sms_sent),
          updated_at = CURRENT_TIMESTAMP
      WHERE ticket_id = $3
      RETURNING *
    `;
    const values = [emailSent, smsSent, ticketId];
    const result = await client.query(query, values);
    if (result.rows.length > 0) {
      console.log('✅ Status updated in PostgreSQL:', ticketId);
      return result.rows[0];
    }
    throw new Error('Registration not found');
  } catch (error) {
    console.error('❌ Database update error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getAllRegistrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM registrations ORDER BY registration_date DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Database fetch error:', error);
    throw error;
  } finally {
    client.release();
  }
}

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

async function ticketIdExists(ticketId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT EXISTS(SELECT 1 FROM registrations WHERE ticket_id = $1)',
      [ticketId]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error('❌ Database exists check error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getRegistrationByContact(contact) {
  const normalized = normalizeContact(contact);
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM registrations WHERE contact_normalized = $1',
      [normalized]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Database fetch error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getStatistics() {
  const client = await pool.connect();
  try {
    const totalResult = await client.query('SELECT COUNT(*) as count FROM registrations');
    const uniqueResult = await client.query(`
      SELECT COUNT(DISTINCT contact_normalized) as count 
      FROM registrations 
      WHERE contact_normalized IS NOT NULL AND TRIM(contact_normalized) != ''
    `);
    const emailResult = await client.query('SELECT COUNT(*) as count FROM registrations WHERE email_sent = true');
    const smsResult = await client.query('SELECT COUNT(*) as count FROM registrations WHERE sms_sent = true');
    const todayResult = await client.query(`
      SELECT COUNT(*) as count FROM registrations
      WHERE DATE(registration_date) = CURRENT_DATE
    `);
    const total = parseInt(totalResult.rows[0].count);
    const uniqueContacts = parseInt(uniqueResult.rows[0].count);
    return {
      total,
      uniqueContacts,
      sharedContacts: Math.max(0, total - uniqueContacts),
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

async function isContactRegistered(contact) {
  const registration = await getRegistrationByContact(contact);
  return registration !== null;
}

async function saveNewConvert(data) {
  const name = String(data.name || '').trim();
  const contact = data.contact ? String(data.contact).trim() : null;
  const normalizedContact = contact ? normalizeContact(contact) : null;
  const location = data.location ? String(data.location).trim() : 'Accra';

  const client = await pool.connect();
  try {
    // Check for duplicate new convert: same name (case-insensitive) and same phone number
    if (normalizedContact) {
      const dupCheck = await client.query(
        `SELECT id, name FROM new_converts 
         WHERE (contact_normalized = $1 OR contact = $2) 
           AND LOWER(TRIM(name)) = LOWER(TRIM($3)) 
         LIMIT 1`,
        [normalizedContact, contact, name]
      );
      if (dupCheck.rows.length > 0) {
        console.log('⚠️ Duplicate new convert rejected for:', name, normalizedContact);
        return {
          success: false,
          duplicate: true,
          code: 'DUPLICATE_CONVERT',
          message: 'A new convert record with this name and phone number already exists.'
        };
      }
    }

    const result = await client.query(
      `
      INSERT INTO new_converts (name, contact, contact_normalized, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, contact, normalizedContact, location]
    );
    console.log('✅ New convert saved to PostgreSQL:', result.rows[0].id, name);
    return { success: true, row: result.rows[0] };
  } catch (error) {
    console.error('❌ Error saving new convert:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getAllNewConverts() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM new_converts ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching new converts:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getNewConvertsStatistics() {
  const client = await pool.connect();
  try {
    const totalResult = await client.query('SELECT COUNT(*) as count FROM new_converts');
    const uniqueResult = await client.query(`
      SELECT COUNT(DISTINCT contact_normalized) as count 
      FROM new_converts 
      WHERE contact_normalized IS NOT NULL AND TRIM(contact_normalized) != ''
    `);
    const withPhoneResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM new_converts 
      WHERE contact IS NOT NULL AND TRIM(contact) != ''
    `);
    const todayResult = await client.query(`
      SELECT COUNT(*) as count FROM new_converts
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const total = parseInt(totalResult.rows[0].count);
    const uniqueContacts = parseInt(uniqueResult.rows[0].count);
    return {
      total,
      uniqueContacts,
      sharedContacts: Math.max(0, parseInt(withPhoneResult.rows[0].count) - uniqueContacts),
      withPhone: parseInt(withPhoneResult.rows[0].count),
      today: parseInt(todayResult.rows[0].count)
    };
  } catch (error) {
    console.error('❌ Database new converts stats error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  await pool.end();
  console.log('✅ PostgreSQL pool closed');
}

module.exports = {
  initializeDatabase,
  saveRegistration,
  saveRegistrationWithDedup,
  updateRegistrationStatus,
  getAllRegistrations,
  getRegistrationByTicketId,
  ticketIdExists,
  getRegistrationByContact,
  getStatistics,
  isContactRegistered,
  isContactRegisteredAny,
  normalizeContact,
  saveNewConvert,
  getAllNewConverts,
  getNewConvertsStatistics,
  closePool
};

