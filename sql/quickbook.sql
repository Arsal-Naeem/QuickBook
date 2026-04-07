CREATE DATABASE IF NOT EXISTS quickbook;

USE quickbook;

CREATE TABLE
    IF NOT EXISTS qbo_tokens (
        Tenant_ID INT NOT NULL,
        Realm_ID VARCHAR(64) NOT NULL,
        State VARCHAR(255) DEFAULT NULL,
        Latency INT DEFAULT NULL,
        ID_Token LONGBLOB COMMENT 'AES encrypted',
        Created_At BIGINT DEFAULT NULL,
        Expires_In INT DEFAULT NULL,
        Token_Type VARCHAR(50) DEFAULT NULL,
        Access_Token LONGBLOB NOT NULL COMMENT 'AES encrypted',
        Refresh_Token LONGBLOB NOT NULL COMMENT 'AES encrypted',
        X_Refresh_Token_Expires_In INT DEFAULT NULL,
        Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (Tenant_ID, Realm_ID),
        INDEX Realm_IDX (Realm_ID)
    );

CREATE TABLE
    IF NOT EXISTS qb_defaults (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(250) NOT NULL,
        QB_ID VARCHAR(100),
        QB_Name VARCHAR(500),
        UNIQUE KEY unique_setting_name (Name)
    );