-- ============================================================
-- ĐIỆN MÁY NGUYÊN HÙNG - BỔ SUNG CẤU TRÚC ĐƠN HÀNG
-- File: SQL/them_don_hang.sql
-- Mục đích:
--   + Thêm cột PaymentMethod, ConfirmedAt, ConfirmedBy cho bảng orders
--   + Thêm giá trị 'Đã xác nhận' vào CHECK constraint status
-- Script CHẠY ĐƯỢC NHIỀU LẦN mà không làm mất dữ liệu hiện có.
-- Chạy trong SSMS sau khi đã chạy 'nguyên hùng.sql' (nếu cần).
-- ============================================================
USE [dienmay_nguyenhung]
GO

-- 1. Thêm cột PaymentMethod (nếu chưa có)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'PaymentMethod')
BEGIN
    ALTER TABLE dbo.orders ADD PaymentMethod NVARCHAR(50) NOT NULL DEFAULT N'COD';
    PRINT 'Đã thêm cột PaymentMethod';
END
ELSE
    PRINT 'Cột PaymentMethod đã tồn tại';
GO

-- 2. Thêm cột ConfirmedAt (nếu chưa có)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'ConfirmedAt')
BEGIN
    ALTER TABLE dbo.orders ADD ConfirmedAt DATETIME2 NULL;
    PRINT 'Đã thêm cột ConfirmedAt';
END
ELSE
    PRINT 'Cột ConfirmedAt đã tồn tại';
GO

-- 3. Thêm cột ConfirmedBy (nếu chưa có)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.orders') AND name = N'ConfirmedBy')
BEGIN
    ALTER TABLE dbo.orders ADD ConfirmedBy NVARCHAR(100) NULL;
    PRINT 'Đã thêm cột ConfirmedBy';
END
ELSE
    PRINT 'Cột ConfirmedBy đã tồn tại';
GO

-- 4. Xóa các CHECK constraint cũ trên bảng orders
IF EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders'))
BEGIN
    DECLARE @constraint_name NVARCHAR(200);
    DECLARE @drop_sql NVARCHAR(400);
    DECLARE cur CURSOR FOR
        SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders');
    OPEN cur;
    FETCH NEXT FROM cur INTO @constraint_name;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @drop_sql = N'ALTER TABLE dbo.orders DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
        EXEC sp_executesql @drop_sql;
        FETCH NEXT FROM cur INTO @constraint_name;
    END
    CLOSE cur;
    DEALLOCATE cur;
    PRINT 'Đã xóa các CHECK constraint cũ trên bảng orders';
END
GO

-- 5. Tạo lại CHECK constraint với giá trị 'Đã xác nhận'
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.orders') AND name = N'CK_orders_status')
BEGIN
    ALTER TABLE dbo.orders ADD CONSTRAINT CK_orders_status CHECK (status IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang giao', N'Đã giao', N'Đã hủy'));
    PRINT 'Đã tạo CHECK constraint mới cho status (đã thêm "Đã xác nhận")';
END
GO

PRINT '==========================================';
PRINT 'Hoàn tất! Cấu trúc bảng orders đã được bổ sung.';
PRINT '==========================================';
GO
