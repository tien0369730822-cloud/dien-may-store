-- ============================================================
-- BỔ SUNG THƯƠNG HIỆU + SẢN PHẨM KHUYẾN MÃI
-- An toàn khi chạy lại: không xóa dữ liệu và không thêm trùng sản phẩm.
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

UPDATE dbo.products
SET brand = CASE id
    WHEN 1 THEN N'SAMSUNG' WHEN 2 THEN N'TOSHIBA' WHEN 3 THEN N'DAIKIN'
    WHEN 4 THEN N'SONY' WHEN 5 THEN N'LG' WHEN 6 THEN N'PANASONIC'
    WHEN 7 THEN N'SHARP' WHEN 8 THEN N'SAMSUNG' WHEN 9 THEN N'ARISTON'
    WHEN 10 THEN N'BOSCH' WHEN 11 THEN N'ELECTROLUX' WHEN 12 THEN N'FERROLI'
    ELSE brand END
WHERE id BETWEEN 1 AND 12 AND (brand IS NULL OR LTRIM(RTRIM(brand)) = N'');
GO

DECLARE @Deals TABLE (
    category_id INT, name NVARCHAR(150), brand NVARCHAR(60),
    price DECIMAL(12,0), old_price DECIMAL(12,0), discount INT, stock INT,
    description NVARCHAR(MAX), image NVARCHAR(255), icon NVARCHAR(50), color NVARCHAR(20),
    specs NVARCHAR(255), rating DECIMAL(2,1), reviews INT, sales INT
);

INSERT INTO @Deals VALUES
(6,N'Máy Rửa Chén Bosch HDW-T5531B',N'BOSCH',6190000,9990000,38,24,N'Máy rửa chén dung tích lớn, nhiều chương trình rửa, tiết kiệm nước.',N'/assets/images/products/13-may-rua-chen-bosch.webp',N'fa-kitchen-set',N'#00695c',N'14 bộ, Inverter, Sấy khô',4.9,119,32),
(6,N'Máy Lọc Không Khí LG PuriCare AS35',N'LG',4490000,7390000,39,30,N'Lọc bụi mịn và khử mùi cho không gian gia đình.',N'/assets/images/products/14-may-loc-khong-khi-lg.webp',N'fa-fan',N'#00695c',N'HEPA, Cảm biến bụi, 35m²',4.8,132,41),
(6,N'Nồi Cơm Điện Cuckoo 1.8L',N'CUCKOO',799000,990000,19,45,N'Nồi cơm điện gia đình, lòng nồi chống dính, giữ ấm tốt.',N'/assets/images/products/15-noi-com-dien-cuckoo.webp',N'fa-bowl-rice',N'#00695c',N'1.8L, 700W, Giữ ấm',4.5,82,57),
(6,N'Nồi Chiên Không Dầu Ferroli 6L',N'FERROLI',699000,1990000,65,27,N'Nồi chiên dung tích 6L, cửa kính quan sát, điều khiển tiện lợi.',N'/assets/images/products/16-noi-chien-khong-dau-ferroli.webp',N'fa-kitchen-set',N'#00695c',N'6L, 1500W, 60 phút',4.9,425,73),
(6,N'Máy Sấy Tóc Philips 1000W',N'PHILIPS',269000,378000,29,60,N'Máy sấy tóc nhỏ gọn, nhiều mức nhiệt, bảo vệ tóc.',N'/assets/images/products/17-may-say-toc-philips.webp',N'fa-wind',N'#00695c',N'1000W, 2 tốc độ, Gọn nhẹ',4.9,148,88),
(6,N'Quạt Đứng Sharp PJ-S40MV',N'SHARP',490000,850000,42,36,N'Quạt đứng vận hành êm, ba mức gió, chiều cao linh hoạt.',N'/assets/images/products/18-quat-dung-sharp.webp',N'fa-fan',N'#00695c',N'3 tốc độ, Hẹn giờ, 45W',4.9,233,64),
(3,N'Máy Lạnh Panasonic Inverter 1 HP',N'PANASONIC',11890000,13990000,15,19,N'Máy lạnh Inverter làm lạnh nhanh, lọc khí và tiết kiệm điện.',N'/assets/images/products/19-dieu-hoa-panasonic.webp',N'fa-wind',N'#2e7d32',N'1 HP, Inverter, Lọc khí',4.9,533,54),
(3,N'Máy Lạnh Samsung Inverter 1 HP',N'SAMSUNG',6290000,10690000,41,22,N'Máy lạnh tiết kiệm điện, làm lạnh đều và vận hành êm.',N'/assets/images/products/20-dieu-hoa-samsung.webp',N'fa-wind',N'#2e7d32',N'1 HP, Digital Inverter, Gas R32',4.8,275,49),
(3,N'Máy Lạnh Sharp Inverter 2 HP',N'SHARP',12490000,15490000,19,16,N'Máy lạnh công suất lớn, phù hợp phòng khách và văn phòng.',N'/assets/images/products/21-dieu-hoa-sharp.webp',N'fa-wind',N'#2e7d32',N'2 HP, Inverter, Làm lạnh nhanh',5.0,98,37),
(4,N'Sony BRAVIA Smart TV 4K 55 Inch',N'SONY',17990000,21490000,16,14,N'Smart TV 4K hình ảnh sắc nét, âm thanh sống động.',N'/assets/images/products/22-tv-sony.webp',N'fa-tv',N'#e65100',N'55 inch, 4K, Google TV',4.9,224,38),
(4,N'LG OLED AI 4K 55 Inch',N'LG',29790000,41400000,28,9,N'TV OLED AI màu đen sâu, thiết kế mỏng và hình ảnh cao cấp.',N'/assets/images/products/23-tv-lg-oled.webp',N'fa-tv',N'#e65100',N'55 inch, OLED, AI 4K',4.9,187,29),
(4,N'Samsung QLED 4K 65 Inch',N'SAMSUNG',22900000,32250000,29,11,N'Smart TV QLED 4K màn hình lớn, màu sắc rực rỡ.',N'/assets/images/products/24-tv-samsung-qled.webp',N'fa-tv',N'#e65100',N'65 inch, QLED, Smart TV',4.8,199,35),
(1,N'Tủ Lạnh Panasonic Inverter 495L',N'PANASONIC',19990000,28990000,31,13,N'Tủ lạnh nhiều cửa, dung tích lớn, bảo quản thực phẩm tối ưu.',N'/assets/images/products/25-tu-lanh-panasonic.webp',N'fa-snowflake',N'#1976d2',N'495L, Inverter, 4 cửa',4.9,168,33),
(1,N'Tủ Lạnh Bosch Inverter 605L',N'BOSCH',39990000,51900000,23,8,N'Tủ lạnh French Door cao cấp, không gian lưu trữ rộng.',N'/assets/images/products/26-tu-lanh-bosch.webp',N'fa-snowflake',N'#1976d2',N'605L, French Door, Inverter',5.0,91,20),
(1,N'Tủ Lạnh Electrolux Inverter 496L',N'ELECTROLUX',15990000,21990000,27,15,N'Tủ lạnh Inverter thiết kế hiện đại, làm lạnh đa chiều.',N'/assets/images/products/27-tu-lanh-electrolux.webp',N'fa-snowflake',N'#1976d2',N'496L, Inverter, Side by side',4.8,146,31),
(2,N'Máy Giặt Bosch Inverter 8Kg',N'BOSCH',8490000,16330000,48,17,N'Máy giặt cửa trước êm ái, giặt sạch và tiết kiệm nước.',N'/assets/images/products/28-may-giat-bosch.webp',N'fa-washer',N'#c62828',N'8Kg, Cửa trước, Inverter',4.9,152,42),
(2,N'Máy Giặt Panasonic Inverter 12Kg',N'PANASONIC',14990000,17230000,13,12,N'Máy giặt dung tích lớn, phù hợp gia đình đông người.',N'/assets/images/products/29-may-giat-panasonic.webp',N'fa-washer',N'#c62828',N'12Kg, Inverter, Giặt nước nóng',4.8,113,34),
(2,N'Máy Giặt LG Inverter 10Kg',N'LG',10990000,17170000,36,20,N'Máy giặt cửa trước AI, vận hành êm và bảo vệ sợi vải.',N'/assets/images/products/30-may-giat-lg.webp',N'fa-washer',N'#c62828',N'10Kg, AI DD, Inverter',4.9,207,51),
(2,N'Máy Giặt Hitachi Inverter 9.5Kg',N'HITACHI',5990000,10990000,45,18,N'Máy giặt cửa trước Inverter, giặt sạch sâu và vận hành êm.',N'/assets/images/products/31-may-giat-hitachi.webp',N'fa-washer',N'#c62828',N'9.5Kg, Cửa trước, Inverter',4.8,176,46);

INSERT INTO dbo.products
    (category_id,name,brand,price,old_price,discount,stock,status,description,image,icon,color,specs,rating,reviews,sales)
SELECT d.category_id,d.name,d.brand,d.price,d.old_price,d.discount,d.stock,N'active',
       d.description,d.image,d.icon,d.color,d.specs,d.rating,d.reviews,d.sales
FROM @Deals d
WHERE NOT EXISTS (SELECT 1 FROM dbo.products p WHERE p.name = d.name);
GO

PRINT N'Hoàn tất: đã bổ sung thương hiệu và sản phẩm khuyến mãi, không xóa dữ liệu cũ.';
GO
