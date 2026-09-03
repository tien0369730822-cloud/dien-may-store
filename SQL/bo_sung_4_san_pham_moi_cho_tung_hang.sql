-- ============================================================
-- BỔ SUNG THÊM 4 SẢN PHẨM GIẢM GIÁ CHO MỖI THƯƠNG HIỆU
-- 11 hãng: Samsung, LG, Panasonic, Sony, Toshiba, Sharp,
-- Daikin, Electrolux, Hitachi, Bosch và AUX.
-- => 11 hãng x 4 sản phẩm = 44 sản phẩm mới.
-- An toàn khi chạy lại: chỉ thêm sản phẩm chưa tồn tại (theo tên).
-- ============================================================
USE dienmay_nguyenhung;
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

-- 4 nhóm sản phẩm bổ sung (khác các nhóm đã có: Tủ Lạnh, Máy Giặt,
-- Máy Lạnh, Smart TV, Máy Lọc Không Khí, Robot Hút Bụi)
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
(1,6,N'Lò Vi Sóng',N'Cao Cấp 25L Inverter',2990000,N'/assets/images/products/10-bep-tu-doi-cao-cap.webp',N'fa-fire-burner',N'#00695c',N'Dung tích: 25L; Công nghệ: Inverter; Công suất: 1000W; Chức năng: Nướng, rã đông; Bảo hành: 12 tháng'),
(2,6,N'Máy Hút Bụi',N'Không Dây Lực Hút Mạnh',3990000,N'/assets/images/products/11-may-hut-bui-khong-day.webp',N'fa-broom',N'#00695c',N'Loại: Không dây; Lực hút: 25KPa; Pin: Lithium 60 phút; Phụ kiện: Đầy đủ; Bảo hành: 12 tháng'),
(3,6,N'Bình Nóng Lạnh',N'Gián Tiếp 30L',3490000,N'/assets/images/products/12-may-nuoc-nong-gian-tiep-30l.webp',N'fa-temperature-high',N'#00695c',N'Dung tích: 30L; Loại: Gián tiếp; Công suất: 2500W; An toàn: Chống giật; Bảo hành: 24 tháng'),
(4,6,N'Bếp Từ',N'Đôi Cao Cấp',4990000,N'/assets/images/products/10-bep-tu-doi-cao-cap.webp',N'fa-fire',N'#00695c',N'Số bếp: 2; Công suất: 4000W; Công nghệ: Inverter; Mặt kính: Schott Ceran; Bảo hành: 24 tháng');

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
        t.image,t.icon,t.color,t.specs,
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

PRINT N'Hoàn tất: đã bổ sung thêm 4 sản phẩm giảm giá cho mỗi hãng (11 hãng x 4 = 44 sản phẩm).';
GO
