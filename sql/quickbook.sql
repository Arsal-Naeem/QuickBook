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
    

CREATE TABLE IF NOT EXISTS branches (
    ID INT NOT NULL,
    Tenant_ID INT NOT NULL,
    Name VARCHAR(250),
    PRIMARY KEY (ID, Tenant_ID)
);

INSERT IGNORE INTO branches (ID, Tenant_ID, Name) VALUES (1, 2, 'Main Branch');


CREATE TABLE
    entities (
        ID int auto_increment not null,
        Name varchar(250),
        Email VARCHAR(250) NULL,
        Phone VARCHAR(50) NULL,
        Note TEXT NULL,
        QB_ID VARCHAR(100) NULL,
        Tenant_ID int NOT NULL DEFAULT 1,
        Is_Intrinsic boolean DEFAULT 0,
        -- Branch_ID int,
        NTN int,
        INDEX Tenant_IDX (Tenant_ID),
        PRIMARY KEY (ID, Tenant_ID),
        UNIQUE (Name, Tenant_ID),
        Address varchar(500)
    )
PARTITION BY
    HASH (Tenant_ID) PARTITIONS 1;

CREATE TABLE
    entity_branch_assignments (
        Entity_ID int,
        Branch_ID int,
        PRIMARY KEY (Entity_ID, Branch_ID),
        INDEX Branch_IDX (Branch_ID)
    );

CREATE TABLE
    entity_types (
        ID int auto_increment not null,
        Name enum (
            'Customer',
            'Vendor',
            'Bank',
            'Shareholder',
            'Tax',
            'Internal',
            'Fixed Asset'
        ),
        PRIMARY KEY (ID)
    );

CREATE TABLE
    entity_assignments (
        ID int auto_increment not null,
        Entity int,
        Type int,
        Tenant_ID int NOT NULL DEFAULT 1,
        PRIMARY KEY (ID, Tenant_ID),
        INDEX Tenant_IDX (Tenant_ID),
        INDEX Entity_IDX (Entity)
        -- FOREIGN KEY(Entity) REFERENCES entities(ID),
        -- FOREIGN KEY(Type) REFERENCES entity_types(ID)
    )
PARTITION BY
    HASH (Tenant_ID) PARTITIONS 1;

INSERT INTO
    entity_types (Name)
VALUES
    ('Customer'),
    ('Vendor'),
    ('Bank'),
    ('Shareholder'),
    ('Tax'),
    ('Internal'),
    ('Fixed Asset');

DELIMITER //
DROP PROCEDURE IF EXISTS CreateOrUpdateEntity //

CREATE PROCEDURE CreateOrUpdateEntity (
    IN p_name VARCHAR(250),
    IN p_email VARCHAR(250),
    IN p_phone VARCHAR(50),
    IN p_address VARCHAR(500),
    IN p_note TEXT,
    IN p_qb_id VARCHAR(100),
    IN p_type VARCHAR(100),
    IN p_tenant_id INT,
    IN p_branch_id INT
) 
BEGIN
    DECLARE v_entity_id INT DEFAULT NULL;
    DECLARE v_type_id INT DEFAULT NULL;
    DECLARE v_error_msg VARCHAR(250);

    SELECT
        ID INTO v_entity_id
    FROM
        entities
    WHERE
        QB_ID = p_qb_id
        AND Tenant_ID = p_tenant_id
    LIMIT
        1;

    IF v_entity_id IS NOT NULL THEN
        UPDATE entities
        SET
            Name = p_name,
            Email = p_email,
            Phone = p_phone,
            Address = p_address,
            Note = p_note
        WHERE
            QB_ID = p_qb_id
            AND Tenant_ID = p_tenant_id;
    ELSEIF (
        SELECT
            COUNT(*)
        FROM
            branches
        WHERE
            ID = p_branch_id
            AND Tenant_ID = p_tenant_id
    ) = 0 THEN
        SET v_error_msg = CONCAT (
            'Branch ID ',
            p_branch_id,
            ' does not exist for tenant ',
            p_tenant_id
        );

        SIGNAL SQLSTATE '45000'
        SET
            MESSAGE_TEXT = v_error_msg;
    ELSE
        INSERT INTO
            entities (
                Name,
                Email,
                Phone,
                Address,
                Note,
                QB_ID,
                Tenant_ID,
                Is_Intrinsic
            )
        VALUES
            (
                p_name,
                p_email,
                p_phone,
                p_address,
                p_note,
                p_qb_id,
                p_tenant_id,
                0
            );

        SET v_entity_id = LAST_INSERT_ID ();

        SELECT
            ID INTO v_type_id
        FROM
            entity_types
        WHERE
            Name = p_type
        LIMIT
            1;

        IF v_type_id IS NULL THEN
            SET v_error_msg = CONCAT (
                'Entity type "',
                p_type,
                '" not found in entity_types'
            );

            SIGNAL SQLSTATE '45000'
            SET
                MESSAGE_TEXT = v_error_msg;
        END IF;

        INSERT INTO entity_assignments (Entity, Type, Tenant_ID)
        VALUES (v_entity_id, v_type_id, p_tenant_id);

        INSERT INTO entity_branch_assignments (Entity_ID, Branch_ID)
        VALUES (v_entity_id, p_branch_id);
    END IF;
END //

DROP PROCEDURE IF EXISTS BulkSyncEntities //

CREATE PROCEDURE BulkSyncEntities (
    IN p_json_data JSON,
    IN p_type VARCHAR(100),
    IN p_tenant_id INT,
    IN p_branch_id INT
)
BEGIN
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_name VARCHAR(250);
    DECLARE v_email VARCHAR(250);
    DECLARE v_phone VARCHAR(50);
    DECLARE v_address VARCHAR(500);
    DECLARE v_note TEXT;
    DECLARE v_qb_id VARCHAR(100);

    IF p_json_data IS NULL OR JSON_TYPE(p_json_data) <> 'ARRAY' THEN
        SIGNAL SQLSTATE '45000'
        SET
            MESSAGE_TEXT = 'BulkSyncEntities expects p_json_data as a JSON array.';
    END IF;

    SET v_total = COALESCE(JSON_LENGTH(p_json_data), 0);

    WHILE v_index < v_total DO
        SET v_name = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].name'))
        );
        SET v_email = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].email'))
        );
        SET v_phone = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].phone'))
        );
        SET v_address = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].address'))
        );
        SET v_note = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].note'))
        );
        SET v_qb_id = JSON_UNQUOTE(
            JSON_EXTRACT(p_json_data, CONCAT('$[', v_index, '].qbId'))
        );

        CALL CreateOrUpdateEntity(
            IFNULL(v_name, ''),
            IFNULL(v_email, ''),
            IFNULL(v_phone, ''),
            IFNULL(v_address, ''),
            IFNULL(v_note, ''),
            NULLIF(v_qb_id, ''),
            p_type,
            p_tenant_id,
            p_branch_id
        );

        SET v_index = v_index + 1;
    END WHILE;
END //

DELIMITER ;