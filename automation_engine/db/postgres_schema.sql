-- Pan-India College Outreach PostgreSQL Schema
-- Dedicated schema for college_bot user

CREATE SCHEMA IF NOT EXISTS college_data;
SET search_path TO college_data, public;

-- 1. States and UTs master
CREATE TABLE IF NOT EXISTS states (
    state_code VARCHAR(10) PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL UNIQUE,
    total_colleges INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Colleges Directory (AISHE, UGC, AICTE)
CREATE TABLE IF NOT EXISTS colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aishe_code VARCHAR(50) UNIQUE,
    ugc_id VARCHAR(50),
    aicte_id VARCHAR(50),
    college_name TEXT NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    location TEXT,
    affiliating_university TEXT,
    category VARCHAR(100),
    website_url TEXT,
    website_status VARCHAR(50) DEFAULT 'UNKNOWN',
    is_website_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(50),
    address TEXT,
    source VARCHAR(50) DEFAULT 'AISHE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Verified College Contacts with Role Classification
CREATE TABLE IF NOT EXISTS college_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    college_name TEXT NOT NULL,
    target_email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    district_location TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    email_syntax_valid BOOLEAN DEFAULT TRUE,
    dns_mx_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'PENDING',
    confidence_score NUMERIC(4,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_target_email UNIQUE (target_email)
);

-- 4. Crawl Jobs Execution & Tracking Table
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    colleges_targeted INT DEFAULT 0,
    colleges_crawled INT DEFAULT 0,
    contacts_extracted INT DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ
);

-- 5. Delta Change Audit Ledger (Monthly Recurring Monitor)
CREATE TABLE IF NOT EXISTS change_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL, -- 'NEW_CONTACT', 'UPDATED_ROLE', 'WEBSITE_CHANGED', 'INACTIVE'
    old_value JSONB,
    new_value JSONB,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for Lakhs of Records
CREATE INDEX IF NOT EXISTS idx_colleges_state ON colleges(state);
CREATE INDEX IF NOT EXISTS idx_colleges_district ON colleges(district);
CREATE INDEX IF NOT EXISTS idx_colleges_website ON colleges(website_url);
CREATE INDEX IF NOT EXISTS idx_colleges_aishe ON colleges(aishe_code);

CREATE INDEX IF NOT EXISTS idx_contacts_college_id ON college_contacts(college_id);
CREATE INDEX IF NOT EXISTS idx_contacts_target_email ON college_contacts(target_email);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON college_contacts(role);
CREATE INDEX IF NOT EXISTS idx_contacts_district_loc ON college_contacts(district_location);
CREATE INDEX IF NOT EXISTS idx_contacts_verification ON college_contacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_contacts_state_role_ver ON college_contacts(role, verification_status);
