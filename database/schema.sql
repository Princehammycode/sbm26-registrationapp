-- Create database
CREATE DATABASE IF NOT EXISTS hhc_sbm_registration;

-- Use database
USE hhc_sbm_registration;

-- Create registrations table
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_registered_at (registered_at)
);
