// Danh mục mẫu dùng để mỗi thương hiệu có đủ 6 nhóm sản phẩm.
// Tên sản phẩm mang tính minh họa cho website demo, không phải bảng giá chính thức của hãng.
const BRANDS = [
    { name: 'SAMSUNG', factor: 1.05 },
    { name: 'LG', factor: 1.08 },
    { name: 'PANASONIC', factor: 1.00 },
    { name: 'SONY', factor: 1.15 },
    { name: 'TOSHIBA', factor: 0.95 },
    { name: 'SHARP', factor: 0.92 },
{ name: 'DAIKIN', factor: 1.12 },
    { name: 'HXY', factor: 1.06 },
    { name: 'HITACHI', factor: 1.08 },
    { name: 'HISENSE', factor: 1.25 },
    { name: 'AUX', factor: 0.85 }
];

const PRODUCT_TEMPLATES = [
    {
        categoryId: 1,
        label: 'Tủ Lạnh',
        variant: 'Inverter 450L',
        basePrice: 14990000,
        images: [
            '/assets/images/products/25-tu-lanh-panasonic.webp',
            '/assets/images/products/26-tu-lanh-bosch.webp',
            '/assets/images/products/27-tu-lanh-electrolux.webp',
            '/assets/images/products/01-tu-lanh-inverter-500l.webp'
        ],
        icon: 'fa-snowflake',
        color: '#1976d2',
        specs: 'Dung tích: 450L; Công nghệ: Inverter; Kiểu tủ: Nhiều cửa; Làm lạnh: Đa chiều; Bảo hành: 24 tháng'
    },
{
        categoryId: 2,
        label: 'Máy Giặt',
        variant: 'Cửa Trước Inverter 10Kg',
        basePrice: 9990000,
images: [
            '/assets/images/products/real-may-giat-01.jpg',
            '/assets/images/products/real-may-giat-02.jpg',
            '/assets/images/products/real-may-giat-03.jpg',
            '/assets/images/products/real-may-giat-04.jpg',
            '/assets/images/products/real-may-giat-05.jpg',
            '/assets/images/products/real-may-giat-06.jpg',
            '/assets/images/products/real-may-giat-07.jpg',
            '/assets/images/products/real-may-giat-08.jpg',
            '/assets/images/products/real-may-giat-09.jpg',
            '/assets/images/products/real-may-giat-10.jpg',
            '/assets/images/products/real-may-giat-11.jpg',
            '/assets/images/products/real-may-giat-12.jpg',
            '/assets/images/products/real-may-giat-13.jpg',
            '/assets/images/products/real-may-giat-14.jpg',
            '/assets/images/products/real-may-giat-15.jpg',
            '/assets/images/products/real-may-giat-16.jpg',
            '/assets/images/products/real-may-giat-17.jpg',
            '/assets/images/products/real-may-giat-18.jpg',
            '/assets/images/products/real-may-giat-19.jpg',
            '/assets/images/products/real-may-giat-20.jpg',
            '/assets/images/products/real-may-giat-21.jpg',
            '/assets/images/products/real-may-giat-22.jpg',
            '/assets/images/products/real-may-giat-23.jpg',
            '/assets/images/products/real-may-giat-24.jpg',
            '/assets/images/products/real-may-giat-25.jpg',
            '/assets/images/products/real-may-giat-26.jpg',
            '/assets/images/products/real-may-giat-27.jpg',
            '/assets/images/products/real-may-giat-28.jpg',
            '/assets/images/products/real-may-giat-29.jpg',
            '/assets/images/products/real-may-giat-30.jpg'
        ],
        icon: 'fa-washer',
        color: '#c62828',
        specs: 'Khối lượng giặt: 10Kg; Kiểu máy: Cửa trước; Động cơ: Inverter; Chế độ: Giặt nước nóng; Bảo hành: 24 tháng'
    },
    {
        categoryId: 3,
        label: 'Máy Lạnh',
        variant: 'Inverter 1.5 HP',
        basePrice: 11990000,
        images: [
            '/assets/images/products/19-dieu-hoa-panasonic.webp',
            '/assets/images/products/20-dieu-hoa-samsung.webp',
            '/assets/images/products/21-dieu-hoa-sharp.webp',
            '/assets/images/products/03-dieu-hoa-12000btu-inverter.webp'
        ],
        icon: 'fa-wind',
        color: '#2e7d32',
        specs: 'Công suất: 1.5 HP; Công nghệ: Inverter; Gas lạnh: R32; Diện tích: 15–20m²; Bảo hành: 24 tháng'
    },
    {
        categoryId: 4,
        label: 'Smart TV',
        variant: '4K 55 Inch',
        basePrice: 15990000,
        images: [
            '/assets/images/products/22-tv-sony.webp',
            '/assets/images/products/23-tv-lg-oled.webp',
            '/assets/images/products/24-tv-samsung-qled.webp',
            '/assets/images/products/04-tv-smart-4k-55-inch.webp'
        ],
        icon: 'fa-tv',
        color: '#e65100',
        specs: 'Kích thước: 55 inch; Độ phân giải: 4K UHD; Hệ điều hành: Smart TV; Kết nối: Wi-Fi, Bluetooth; Bảo hành: 24 tháng'
    },
    {
        categoryId: 6,
        label: 'Máy Lọc Không Khí',
        variant: 'HEPA 40m²',
        basePrice: 4990000,
        images: ['/assets/images/products/14-may-loc-khong-khi-lg.webp'],
        icon: 'fa-fan',
        color: '#00695c',
        specs: 'Diện tích: 40m²; Màng lọc: HEPA; Cảm biến: Bụi mịn PM2.5; Chế độ: Tự động; Bảo hành: 12 tháng'
    },
{
        categoryId: 6,
        label: 'Robot Hút Bụi',
        variant: 'Lau Nhà AI',
        basePrice: 6990000,
        images: ['/assets/images/products/11-may-hut-bui-khong-day.webp'],
        icon: 'fa-robot',
        color: '#00695c',
        specs: 'Chức năng: Hút và lau; Điều hướng: AI; Điều khiển: Ứng dụng; Thời gian chạy: 120 phút; Bảo hành: 12 tháng'
    },
    {
        categoryId: 6,
        label: 'Lò Vi Sóng',
        variant: 'Cao Cấp 25L Inverter',
        basePrice: 2990000,
        images: ['/assets/images/products/10-bep-tu-doi-cao-cap.webp'],
        icon: 'fa-fire-burner',
        color: '#00695c',
        specs: 'Dung tích: 25L; Công nghệ: Inverter; Công suất: 1000W; Chức năng: Nướng, rã đông; Bảo hành: 12 tháng'
    },
    {
        categoryId: 6,
        label: 'Máy Hút Bụi',
        variant: 'Không Dây Lực Hút Mạnh',
        basePrice: 3990000,
        images: ['/assets/images/products/11-may-hut-bui-khong-day.webp'],
        icon: 'fa-broom',
        color: '#00695c',
        specs: 'Loại: Không dây; Lực hút: 25KPa; Pin: Lithium 60 phút; Phụ kiện: Đầy đủ; Bảo hành: 12 tháng'
    },
    {
        categoryId: 6,
        label: 'Bình Nóng Lạnh',
        variant: 'Gián Tiếp 30L',
        basePrice: 3490000,
        images: ['/assets/images/products/12-may-nuoc-nong-gian-tiep-30l.webp'],
        icon: 'fa-temperature-high',
        color: '#00695c',
        specs: 'Dung tích: 30L; Loại: Gián tiếp; Công suất: 2500W; An toàn: Chống giật; Bảo hành: 24 tháng'
    },
    {
        categoryId: 6,
        label: 'Bếp Từ',
        variant: 'Đôi Cao Cấp',
        basePrice: 4990000,
        images: ['/assets/images/products/10-bep-tu-doi-cao-cap.webp'],
        icon: 'fa-fire',
        color: '#00695c',
        specs: 'Số bếp: 2; Công suất: 4000W; Công nghệ: Inverter; Mặt kính: Schott Ceran; Bảo hành: 24 tháng'
    }
];

function roundPrice(value) {
    return Math.round(value / 10000) * 10000;
}

const BRAND_CATALOG_SEED = BRANDS.flatMap((brand, brandIndex) =>
    PRODUCT_TEMPLATES.map((template, templateIndex) => {
        const discount = 15 + ((brandIndex * 7 + templateIndex * 5) % 36);
        const price = roundPrice(template.basePrice * brand.factor);
        const oldPrice = roundPrice(price / (1 - discount / 100));
        return {
            categoryId: template.categoryId,
            name: `${template.label} ${brand.name} ${template.variant}`,
            brand: brand.name,
            price,
            oldPrice,
            discount,
            stock: 12 + ((brandIndex * 3 + templateIndex * 5) % 35),
            description: `${template.label} ${brand.name} chính hãng, thiết kế hiện đại, vận hành bền bỉ và tiết kiệm năng lượng. Sản phẩm đang áp dụng chương trình ưu đãi tại Điện Máy Nguyên Hùng.`,
            image: template.images[brandIndex % template.images.length],
            icon: template.icon,
            color: template.color,
            specs: template.specs,
            rating: Number((4.6 + ((brandIndex + templateIndex) % 4) / 10).toFixed(1)),
            reviews: 80 + ((brandIndex * 37 + templateIndex * 29) % 360),
            sales: 18 + ((brandIndex * 11 + templateIndex * 13) % 90)
        };
    })
);

module.exports = { BRANDS, BRAND_CATALOG_SEED };
