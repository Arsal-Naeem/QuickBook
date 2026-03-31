CREATE DATABASE IF NOT EXISTS quickbook;

USE quickbook;

CREATE TABLE
    IF NOT EXISTS qbo_tokens (
        Tenant_ID INT NOT NULL,
        Realm_ID VARCHAR(64) NOT NULL,
        State VARCHAR(255) DEFAULT NULL,
        Latency INT DEFAULT NULL,
        ID_Token LONGTEXT,
        Created_At BIGINT DEFAULT NULL,
        Expires_In INT DEFAULT NULL,
        Token_Type VARCHAR(50) DEFAULT NULL,
        Access_Token LONGTEXT NOT NULL,
        Refresh_Token VARCHAR(512) NOT NULL,
        X_Refresh_Token_Expires_In INT DEFAULT NULL,
        Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (Tenant_ID, Realm_ID),
        INDEX Realm_IDX (Realm_ID)
    );