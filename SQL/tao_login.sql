-- ============================================================
-- TẠO LOGIN + USER cho ứng dụng (chạy riêng)
-- username: dienmay_user / password: admin123
-- ============================================================
USE [master]
GO

-- Kiểm tra login tồn tại chưa, nếu chưa thì tạo
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'dienmay_user')
BEGIN
    CREATE LOGIN dienmay_user WITH PASSWORD = N'admin123', CHECK_POLICY = OFF;
    PRINT 'Login dienmay_user đã được tạo';
END
ELSE
BEGIN
    PRINT 'Login dienmay_user đã tồn tại';
END
GO

-- Cấp quyền cho login
ALTER SERVER ROLE sysadmin ADD MEMBER dienmay_user;
GO

-- Chuyển sang database dienmay_nguyenhung
USE [dienmay_nguyenhung]
GO

-- Tạo user trong database nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'dienmay_user')
BEGIN
    CREATE USER dienmay_user FOR LOGIN dienmay_user;
    PRINT 'User dienmay_user đã được tạo trong database';
END
ELSE
BEGIN
    PRINT 'User dienmay_user đã tồn tại trong database';
END
GO

-- Cấp quyền db_owner
ALTER ROLE db_owner ADD MEMBER dienmay_user;
GO

PRINT '==========================================';
PRINT 'Hoàn tất! Kết nối bằng:';
PRINT '  Server: LAPTOP-31RCR7Q9\SQLEXPRESS';
PRINT '  User:   dienmay_user';
PRINT '  Pass:   admin123';
PRINT '==========================================';
GO
SELECT
    SERVERPROPERTY('IsIntegratedSecurityOnly') AS IsIntegratedSecurityOnly,
    @@SERVERNAME AS ServerName,
    ORIGINAL_LOGIN() AS CurrentLogin;
GO
USE master;
GO

ALTER LOGIN [dienmay_user] ENABLE;
GO

ALTER LOGIN [dienmay_user]
WITH PASSWORD = N'admin123',
     CHECK_POLICY = OFF,
     DEFAULT_DATABASE = [dienmay_nguyenhung];
GO
SELECT
    name,
    is_disabled,
    default_database_name
FROM sys.sql_logins
WHERE name = N'dienmay_user';
GO