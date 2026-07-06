\connect nacos

-- 控制台账号：admin / 123zhangbei
INSERT INTO users (username, password, enabled)
VALUES ('admin', '$2a$10$VzFmEpdbIUxeIyz4576qHOQjy4uqQ9UJebOZ5mSoQC9m6DQ8O891y', true);

DELETE FROM roles WHERE username = 'nacos';
INSERT INTO roles (username, role) VALUES ('admin', 'ROLE_ADMIN');
