export const basicPgSqlList = [
    `CREATE TABLE IF NOT EXISTS sys_system (
        id SERIAL PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        description VARCHAR(512),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sys_unit (
        id SERIAL PRIMARY KEY,
        parent_id INT NOT NULL DEFAULT 0,
        system_id INT,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        unit_type VARCHAR(32),
        leader VARCHAR(64),
        phone VARCHAR(32),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sys_personnel (
        id SERIAL PRIMARY KEY,
        unit_id INT,
        account VARCHAR(64),
        name VARCHAR(64) NOT NULL,
        phone VARCHAR(32),
        email VARCHAR(128),
        gender SMALLINT DEFAULT 0,
        status SMALLINT NOT NULL DEFAULT 1,
        remark VARCHAR(512),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sys_menu (
        id SERIAL PRIMARY KEY,
        parent_id INT NOT NULL DEFAULT 0,
        system_id INT,
        name VARCHAR(128) NOT NULL,
        path VARCHAR(256),
        component VARCHAR(256),
        icon VARCHAR(64),
        menu_type VARCHAR(16) NOT NULL DEFAULT 'menu',
        permission VARCHAR(128),
        status SMALLINT NOT NULL DEFAULT 1,
        visible SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sys_role (
        id SERIAL PRIMARY KEY,
        system_id INT,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description VARCHAR(512),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS sys_role_menu (
        role_id INT NOT NULL,
        menu_id INT NOT NULL,
        PRIMARY KEY (role_id, menu_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sys_personnel_role (
        personnel_id INT NOT NULL,
        role_id INT NOT NULL,
        PRIMARY KEY (personnel_id, role_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sys_service_datasource (
        service_id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        driver VARCHAR(16) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        db_user VARCHAR(128) NOT NULL,
        db_password VARCHAR(255) NOT NULL,
        database_name VARCHAR(128) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
]

export const basicMysqlSqlList = [
    `CREATE TABLE IF NOT EXISTS sys_system (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        description VARCHAR(512),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sys_unit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NOT NULL DEFAULT 0,
        system_id INT,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        unit_type VARCHAR(32),
        leader VARCHAR(64),
        phone VARCHAR(32),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sys_personnel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_id INT,
        account VARCHAR(64),
        name VARCHAR(64) NOT NULL,
        phone VARCHAR(32),
        email VARCHAR(128),
        gender SMALLINT DEFAULT 0,
        status SMALLINT NOT NULL DEFAULT 1,
        remark VARCHAR(512),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sys_menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parent_id INT NOT NULL DEFAULT 0,
        system_id INT,
        name VARCHAR(128) NOT NULL,
        path VARCHAR(256),
        component VARCHAR(256),
        icon VARCHAR(64),
        menu_type VARCHAR(16) NOT NULL DEFAULT 'menu',
        permission VARCHAR(128),
        status SMALLINT NOT NULL DEFAULT 1,
        visible SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sys_role (
        id INT AUTO_INCREMENT PRIMARY KEY,
        system_id INT,
        code VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        description VARCHAR(512),
        status SMALLINT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sys_role_menu (
        role_id INT NOT NULL,
        menu_id INT NOT NULL,
        PRIMARY KEY (role_id, menu_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sys_personnel_role (
        personnel_id INT NOT NULL,
        role_id INT NOT NULL,
        PRIMARY KEY (personnel_id, role_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sys_service_datasource (
        service_id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        driver VARCHAR(16) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        db_user VARCHAR(128) NOT NULL,
        db_password VARCHAR(255) NOT NULL,
        database_name VARCHAR(128) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
]
