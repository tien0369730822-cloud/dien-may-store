-- ============================================================
-- TẠO 6 SẢN PHẨM MẪU CHO MỖI THƯƠNG HIỆU
-- 11 hãng: Samsung, LG, Panasonic, Sony, Toshiba, Sharp,
-- Daikin, Electrolux, Hitachi, Bosch và AUX.
-- An toàn khi chạy lại: chỉ thêm sản phẩm chưa tồn tại.
-- ============================================================
USE dienmay_nguyenhung;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'brand'
)
    ALTER TABLE dbo.products ADD brand NVARCHAR(60) NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.products') AND name = N'image'
)
    ALTER TABLE dbo.products ADD image NVARCHAR(255) NULL;
GO

DECLARE @Brands TABLE (
    idx INT PRIMARY KEY,
    brand NVARCHAR(60),
    price_factor DECIMAL(5,2)
);

INSERT INTO @Brands VALUES
(1,N'SAMSUNG',1.05),(2,N'LG',1.08),(3,N'PANASONIC',1.00),
(4,N'SONY',1.15),(5,N'TOSHIBA',0.95),(6,N'SHARP',0.92),
(7,N'DAIKIN',1.12),(8,N'ELECTROLUX',1.06),(9,N'HITACHI',1.08),
(10,N'BOSCH',1.25),(11,N'AUX',0.85);

DECLARE @Templates TABLE (
    idx INT PRIMARY KEY,
    category_id INT,
    label NVARCHAR(80),
    variant NVARCHAR(100),
    base_price DECIMAL(12,0),
    image NVARCHAR(255),
    icon NVARCHAR(50),
    color NVARCHAR(20),
    specs NVARCHAR(255)
);

INSERT INTO @Templates VALUES
(1,1,N'Tủ Lạnh',N'Inverter 450L',14990000,N'/assets/images/products/25-tu-lanh-panasonic.webp',N'fa-snowflake',N'#1976d2',N'Dung tích: 450L; Công nghệ: Inverter; Kiểu tủ: Nhiều cửa; Làm lạnh: Đa chiều; Bảo hành: 24 tháng'),
(2,2,N'Máy Giặt',N'Cửa Trước Inverter 10Kg',9990000,N'__MAYGIA__',N'fa-washer',N'#c62828',N'Khối lượng giặt: 10Kg; Kiểu máy: Cửa trước; Động cơ: Inverter; Chế độ: Giặt nước nóng; Bảo hành: 24 tháng'),
(3,3,N'Máy Lạnh',N'Inverter 1.5 HP',11990000,N'/assets/images/products/19-dieu-hoa-panasonic.webp',N'fa-wind',N'#2e7d32',N'Công suất: 1.5 HP; Công nghệ: Inverter; Gas lạnh: R32; Diện tích: 15–20m²; Bảo hành: 24 tháng'),
(4,4,N'Smart TV',N'4K 55 Inch',15990000,N'/assets/images/products/22-tv-sony.webp',N'fa-tv',N'#e65100',N'Kích thước: 55 inch; Độ phân giải: 4K UHD; Hệ điều hành: Smart TV; Kết nối: Wi-Fi, Bluetooth; Bảo hành: 24 tháng'),
(5,6,N'Máy Lọc Không Khí',N'HEPA 40m²',4990000,N'/assets/images/products/14-may-loc-khong-khi-lg.webp',N'fa-fan',N'#00695c',N'Diện tích: 40m²; Màng lọc: HEPA; Cảm biến: Bụi mịn PM2.5; Chế độ: Tự động; Bảo hành: 12 tháng'),
(6,6,N'Robot Hút Bụi',N'Lau Nhà AI',6990000,N'/assets/images/products/11-may-hut-bui-khong-day.webp',N'fa-robot',N'#00695c',N'Chức năng: Hút và lau; Điều hướng: AI; Điều khiển: Ứng dụng; Thời gian chạy: 120 phút; Bảo hành: 12 tháng');

;WITH Catalog AS (
    SELECT
        t.category_id,
        CONCAT(t.label, N' ', b.brand, N' ', t.variant) AS product_name,
        b.brand,
        p.price,
        CAST(ROUND((p.price / (1 - p.discount_percent / 100.0)) / 10000.0, 0) * 10000 AS DECIMAL(12,0)) AS old_price,
        p.discount_percent,
        12 + ((b.idx * 3 + t.idx * 5) % 35) AS stock,
CONCAT(t.label, N' ', b.brand, N' chính hãng, thiết kế hiện đại, vận hành bền bỉ và tiết kiệm năng lượng. Sản phẩm đang áp dụng chương trình ưu đãi tại Điện Máy Nguyên Hùng.') AS description,
        CASE
            WHEN t.label = N'Máy Giặt' THEN
                CASE b.brand
                    WHEN N'SAMSUNG' THEN N'/assets/images/products/32-may-giat-samsung.svg'
                    WHEN N'LG' THEN N'/assets/images/products/33-may-giat-lg.svg'
                    WHEN N'PANASONIC' THEN N'/assets/images/products/34-may-giat-panasonic.svg'
                    WHEN N'SONY' THEN N'/assets/images/products/35-may-giat-sony.svg'
                    WHEN N'TOSHIBA' THEN N'/assets/images/products/36-may-giat-toshiba.svg'
                    WHEN N'SHARP' THEN N'/assets/images/products/37-may-giat-sharp.svg'
                    WHEN N'DAIKIN' THEN N'/assets/images/products/38-may-giat-daikin.svg'
WHEN N'ELECTROLUX' THEN N'/assets/images/products/43-may-giat-electrolux.svg'
                    WHEN N'HITACHI' THEN N'/assets/images/products/40-may-giat-hitachi.svg'
                    WHEN N'BOSCH' THEN N'/assets/images/products/44-may-giat-bosch.svg'
                    WHEN N'AUX' THEN N'/assets/images/products/42-may-giat-aux.svg'
                    ELSE t.image
                END
            ELSE t.image
        END AS image,
        t.icon,t.color,t.specs,
        CAST(4.6 + ((b.idx + t.idx) % 4) / 10.0 AS DECIMAL(2,1)) AS rating,
        80 + ((b.idx * 37 + t.idx * 29) % 360) AS reviews,
        18 + ((b.idx * 11 + t.idx * 13) % 90) AS sales
    FROM @Brands b
    CROSS JOIN @Templates t
    CROSS APPLY (
        SELECT
            CAST(ROUND((t.base_price * b.price_factor) / 10000.0, 0) * 10000 AS DECIMAL(12,0)) AS price,
            15 + ((b.idx * 7 + t.idx * 5) % 36) AS discount_percent
    ) p
)
INSERT INTO dbo.products
    (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
SELECT
    c.category_id,c.product_name,c.brand,c.price,c.old_price,c.discount_percent,c.stock,N'active',
    c.description,c.image,c.icon,c.color,c.specs,c.rating,c.reviews,c.sales
FROM Catalog c
WHERE NOT EXISTS (SELECT 1 FROM dbo.products p WHERE p.name = c.product_name);
GO

PRINT N'Hoàn tất: mỗi hãng đã có 6 nhóm sản phẩm mẫu, bao gồm tủ lạnh, máy giặt, máy lạnh và TV.';
GO
