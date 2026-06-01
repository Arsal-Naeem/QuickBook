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
        Type VARCHAR(100) NULL,
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

DROP TABLE IF EXISTS `menu_categories`;

CREATE TABLE
    `menu_categories` (
        `ID` int NOT NULL AUTO_INCREMENT,
        `Name` varchar(500) DEFAULT NULL,
        `Is_Deal` boolean DEFAULT 0,
        `Tenant_ID` int NOT NULL DEFAULT 1,
        INDEX Tenant_IDX (Tenant_ID),
        PRIMARY KEY (ID, Tenant_ID)
    )
PARTITION BY
    KEY (Tenant_ID) PARTITIONS 1;

DROP TABLE IF EXISTS `menu_items`;

CREATE TABLE
    `menu_items` (
        `ID` int NOT NULL AUTO_INCREMENT,
        `Name` varchar(500) DEFAULT NULL,
        `QB_ID` varchar(100) DEFAULT NULL,
        `Price` float DEFAULT NULL,
        `Category` int DEFAULT NULL,
        `Image_URL` LONGTEXT DEFAULT NULL,
        `Tenant_ID` int NOT NULL DEFAULT 1,
        INDEX Tenant_IDX (Tenant_ID),
        PRIMARY KEY (ID, Tenant_ID)
    )
PARTITION BY
    HASH (Tenant_ID) PARTITIONS 1;

DROP TABLE IF EXISTS skus;

CREATE TABLE
    skus (
        ID int AUTO_INCREMENT NOT NULL,
        Menu_Item_ID int,
        QB_ID VARCHAR(100) NULL,
        Tenant_ID int NOT NULL,
        SKU varchar(50) NOT NULL,
        Ratio float NOT NULL DEFAULT 1,
        Alert_Threshold float NOT NULL DEFAULT 5,
        INDEX Tenant_IDX (Tenant_ID),
        PRIMARY KEY (ID, Tenant_ID),
        UNIQUE (SKU, Tenant_ID)
    )
PARTITION BY
    HASH (Tenant_ID) PARTITIONS 1;

-- Dummy Data

INSERT INTO menu_categories (ID, Name, Is_Deal, Tenant_ID)
VALUES
  (101, 'Beverages', 0, 1),
  (102, 'Snacks', 0, 1),
  (103, 'Main Course', 0, 1)
ON DUPLICATE KEY UPDATE
  Name = VALUES(Name),
  Is_Deal = VALUES(Is_Deal);

INSERT INTO menu_items (ID, Name, Price, Category, Image_URL, Tenant_ID)
VALUES
  (1001, 'Cold Brew Coffee', 4.99, 101, 'https://images.unsplash.com/photo-1686794154262-c8aa45e85848', 1),
  (1002, 'Iced Matcha Latte', 5.49, 101, 'https://images.unsplash.com/photo-1686794154608-e45c831ef567', 1),
  (1003, 'Sea Salt Chips', 2.99, 102, 'https://images.unsplash.com/photo-1738986586823-bba0e1c11372', 1),
  (1004, 'Grilled Chicken Bowl', 10.99, 103, 'https://images.unsplash.com/photo-1666599028424-e316d4e34aa6', 1),
  (1005, 'Paneer Tikka Wrap', 9.49, 103, 'https://images.unsplash.com/photo-1666493243529-b3b81e7e0a1b', 1)
ON DUPLICATE KEY UPDATE
  Name = VALUES(Name),
  Price = VALUES(Price),
  Category = VALUES(Category),
  Image_URL = VALUES(Image_URL);

INSERT INTO skus (Menu_Item_ID, Tenant_ID, SKU, Ratio, Alert_Threshold)
VALUES
  (1001, 1, 'BEV-COLD-001', 1, 5),
  (1001, 1, 'BEV-COLD-002', 1, 5),
  (1002, 1, 'BEV-MATCHA-001', 1, 5),
  (1002, 1, 'BEV-MATCHA-002', 1, 5),
  (1003, 1, 'SNK-CHIPS-001', 1, 5),
  (1003, 1, 'SNK-CHIPS-002', 1, 5),
  (1004, 1, 'MAIN-CHK-001', 1, 5),
  (1004, 1, 'MAIN-CHK-002', 1, 5),
  (1005, 1, 'MAIN-PAN-001', 1, 5),
  (1005, 1, 'MAIN-PAN-002', 1, 5)
ON DUPLICATE KEY UPDATE
  Menu_Item_ID = VALUES(Menu_Item_ID),
  Ratio = VALUES(Ratio),
  Alert_Threshold = VALUES(Alert_Threshold);