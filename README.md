# VnExpress Products — Công Cụ Quản Lý Dự Án & Công Việc Chuẩn Asana

Hệ thống quản lý công việc và dự án chuyên nghiệp dành riêng cho **Phòng Product VnExpress** (20 nhân sự gồm Quản lý, UX/UI Designer, SEO, Data). Được thiết kế theo phong cách giao diện hiện đại của **Asana**, tích hợp cơ sở dữ liệu thời gian thực **Supabase** và tệp cấu hình trung tâm `config.js` để dễ dàng tối ưu hóa và mở rộng.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. Quản lý Dự án Toàn Diện (Project Hub)
- **Mã dự án & Tên dự án**: Quy chuẩn mã hóa (VD: `VNE-APP-2026`, `VNE-AI-RECO`, `VNE-SEO-CWV`...).
- **Chỉ số KPI cụ thể**: Mục tiêu đo lường rõ ràng (DAU, thời gian đọc, Core Web Vitals LCP, tỉ lệ chuyển đổi).
- **Trạng thái & Lộ trình**: Khởi động, Đang triển khai, Đang nghiệm thu, Hoàn thành, Tạm hoãn.
- **Nhiều giai đoạn (Phases / Milestones)**: Theo dõi từng mốc (UX Discovery -> UI Prototype -> Dev & Reco SDK -> UAT -> Release).
- **Checklist hai chiều**:
  - *Đã làm được* (Completed items)
  - *Còn tồn tại* (Pending items)
  - Thanh đo tiến độ tự động (%)
- **Công cụ quản trị & Liên kết**: Tích hợp nhanh liên kết Figma, Jira, Google Analytics 4, Metabase, Notion.
- **Dự án liên kết**: Quản lý sự phụ thuộc chéo giữa các hệ thống (App - AI - CDP).

### 2. Quản lý Công việc (Task Engine)
- Luôn chỉ định: **Ngày hạn chót, Tên công việc, Người thực hiện (thuộc 20 nhân sự), và Dự án cụ thể**.
- **2 Chế độ xem linh hoạt (Asana views)**:
  - *Chế độ Danh sách (List View)*: Bảng dữ liệu tương tác nhanh, trực quan hóa trạng thái, tag dự án và độ ưu tiên.
  - *Chế độ Bảng (Kanban Board)*: Phân luồng công việc 4 cột (Chưa làm -> Đang làm -> Bị nghẽn -> Hoàn thành).
- **Slide-over Drawer chi tiết**: Cửa sổ trượt mở từ bên phải để cập nhật checklist con, đổi người làm, hạn chót, ghi chú và độ ưu tiên mà không cần chuyển trang.

### 3. Bộ Lọc & Tìm Kiếm Thông Minh
- **Bộ lọc thời gian**:
  - `Tất cả thời gian`
  - `Hôm nay`: Nổi bật các task có hạn vào hôm nay (`2026-09-28`).
  - `Quá hạn`: Cảnh báo đỏ các task chưa hoàn thành và đã trễ hạn.
  - `Sắp hết hạn`: Lọc các task đến hạn trong vòng 3 ngày tới.
  - `Theo ngày`: Cho phép chọn ngày cụ thể từ lịch.
- **Đang triển khai**: Nút chuyển nhanh xem toàn bộ công việc đang chạy.
- **Lọc theo nhóm chuyên môn**: `Quản lý`, `UX/UI Designer`, `SEO`, `Data`.
- **Lọc theo trạng thái**: `Chưa làm`, `Đang làm`, `Bị nghẽn`, `Hoàn thành`.
- **Tìm kiếm toàn cục**: Tìm kiếm tức thì theo từ khóa tên task, dự án, hoặc người làm (phím tắt `/`).

### 4. Quản lý 20 Nhân sự & Tài Khoản (User/Password)
- Hiển thị danh mục đầy đủ **20 nhân sự** phòng Product.
- **Xem User/Pass trực tiếp**: Bảng tra cứu tài khoản đăng nhập, hỗ trợ nút sao chép mật khẩu 1 chạm.
- Thông tin đầy đủ: Vị trí, Cấp bậc (Quản lý / Nhân viên), Địa điểm (Hà Nội / TP.HCM), Email, Điện thoại, Dự án đang tham gia, và tình trạng tải công việc (Đang làm việc, Bận cao độ, Sẵn sàng nhận việc, Nghỉ phép).
- Xuất danh sách nhân sự sang file Excel / CSV.

### 5. Báo Cáo & Thống Kê Chuyên Sâu
- **Báo cáo Toàn Phòng**:
  - Tỉ lệ hoàn thành KPI tổng thể.
  - Khối lượng công việc phân bổ cho 4 nhóm (Quản lý, UX/UI, SEO, Data).
  - Thống kê các điểm nghẽn và rủi ro trễ hạn.
- **Báo cáo Cá Nhân (20 Nhân sự)**:
  - Dropdown chọn bất kỳ nhân sự nào để tra cứu thống kê chi tiết: số task được giao, task đang làm, task bị nghẽn, task quá hạn, tỉ lệ hoàn tất và danh sách nhiệm vụ cụ thể.

### 6. Thùng Rác (Trash Bin)
- Cơ chế xóa mềm (Soft-delete) an toàn cho cả công việc và dự án.
- Cho phép **Khôi phục (Restore)** hoặc **Xóa vĩnh viễn (Delete forever)**.

### 7. Tệp Cấu Hình Hệ Thống `config.js`
- Tệp cấu hình mở đặt tại [config.js](file:///c:/Users/nguyenhieu/Desktop/vnexpress-products/config.js).
- Cho phép dễ dàng tối ưu hóa:
  - Thông tin kết nối Supabase (URL, Anon key).
  - Trạng thái công việc và màu sắc nhận diện.
  - Danh mục nhóm chuyên môn và biểu tượng.
  - Các mốc ngày cảnh báo và KPI.
  - Cơ chế tự động lưu Offline LocalStorage nếu mất kết nối mạng.

---

## 👥 Danh Sách 20 Nhân Sự Phòng Product & Tài Khoản Đăng Nhập

| STT | Họ và Tên | Username | Password | Nhóm | Cấp Bậc | Chức Danh | Địa Điểm |
|:---:|:---|:---|:---|:---|:---|:---|:---|
| 1 | **Nguyễn Trung Hiếu** | `nguyen.hieu` | `vne@Head2026` | Quản lý | Quản lý | Trưởng phòng Product (Head of Product) | FPT Cầu Giấy, HN |
| 2 | **Trần Thị Hương Lan** | `tran.lan` | `vne@PO#2026` | Quản lý | Quản lý | Phó phòng Product & Lead PO | FPT Cầu Giấy, HN |
| 3 | **Lê Tuấn Minh** | `le.minh` | `vne@POApp26` | Quản lý | Quản lý | Product Owner (Mobile App) | FPT Tân Thuận, HCM |
| 4 | **Hoàng Minh Đức** | `hoang.duc` | `vne@TPM2026` | Quản lý | Quản lý | Technical Project Manager (TPM) | FPT Cầu Giấy, HN |
| 5 | **Vũ Phương Thảo** | `vu.thao` | `vne@LeadUX26` | UX/UI Designer | Quản lý | Lead UI/UX Designer | FPT Cầu Giấy, HN |
| 6 | **Đặng Nhật Quang** | `dang.quang` | `vne@UIQuang26` | UX/UI Designer | Nhân viên | Senior UI Designer (Design System) | FPT Cầu Giấy, HN |
| 7 | **Phạm Trà My** | `pham.my` | `vne@UXMy#2026` | UX/UI Designer | Nhân viên | Senior UX Researcher | FPT Tân Thuận, HCM |
| 8 | **Bùi Anh Tuấn** | `bui.tuan` | `vne@Design2026` | UX/UI Designer | Nhân viên | UI/UX Product Designer | FPT Cầu Giấy, HN |
| 9 | **Ngô Thu Hà** | `ngo.ha` | `vne@HaUX2026` | UX/UI Designer | Nhân viên | Interaction Designer & Prototyper | FPT Tân Thuận, HCM |
| 10 | **Đoàn Quốc Việt** | `doan.viet` | `vne@VietArt26` | UX/UI Designer | Nhân viên | Visual & Motion Designer | FPT Cầu Giấy, HN |
| 11 | **Đinh Thái Sơn** | `dinh.son` | `vne@LeadSEO26` | SEO | Quản lý | Lead SEO & Growth Hacker | FPT Cầu Giấy, HN |
| 12 | **Mai Kim Phượng** | `mai.phuong` | `vne@PhuongSEO26` | SEO | Nhân viên | Senior Technical SEO Specialist | FPT Cầu Giấy, HN |
| 13 | **Nguyễn Tuấn Anh** | `nguyen.anh` | `vne@AnhSEO2026` | SEO | Nhân viên | Content SEO & Onpage Lead | FPT Tân Thuận, HCM |
| 14 | **Lê Thu Trang** | `le.trang` | `vne@TrangSEO26` | SEO | Nhân viên | SEO Performance & Audit Analyst | FPT Cầu Giấy, HN |
| 15 | **Trần Trung Kiên** | `tran.kien` | `vne@DataLead26` | Data | Quản lý | Lead Data Scientist & AI | FPT Cầu Giấy, HN |
| 16 | **Vũ Hải Nam** | `vu.nam` | `vne@NamData26` | Data | Nhân viên | Senior Data Analyst (Product Analytics) | FPT Cầu Giấy, HN |
| 17 | **Đỗ Thùy Linh** | `do.linh` | `vne@LinhBI2026` | Data | Nhân viên | BI Engineer & Dashboard Specialist | FPT Tân Thuận, HCM |
| 18 | **Hoàng Hải Yến** | `hoang.yen` | `vne@YenTrack26` | Data | Nhân viên | Tracking & Telemetry Specialist (GA4/CDP) | FPT Cầu Giấy, HN |
| 19 | **Phạm Quang Duy** | `pham.duy` | `vne@DuyData26` | Data | Nhân viên | Data Engineer (Pipeline & Lakehouse) | FPT Tân Thuận, HCM |
| 20 | **Nguyễn Minh Tâm** | `nguyen.tam` | `vne@TamOps2026` | Data | Nhân viên | Product Data Operations | FPT Cầu Giấy, HN |

---

## 🛠️ Cấu Trúc Mã Nguồn

```
vnexpress-products/
├── index.html        # Giao diện chính chuẩn Asana (Sidebars, Topbar, Modals, Drawers)
├── styles.css        # Hệ thống thiết kế Vanilla CSS, Dark/Light theme, Micro-animations
├── app.js            # Toàn bộ logic quản lý, bộ lọc, Kanban, báo cáo và đồng bộ
├── config.js         # Tệp cấu hình các thành phần dự án, kết nối Supabase, nhóm, trạng thái
├── initialData.js    # Dữ liệu hạt giống mặc định & bộ đệm ngoại tuyến (Offline cache)
└── README.md         # Hướng dẫn chi tiết & danh mục tài khoản
```

## 🌐 Hướng Dẫn Mở & Sử Dụng

1. Bạn chỉ cần mở tệp [index.html](file:///c:/Users/nguyenhieu/Desktop/vnexpress-products/index.html) bằng bất kỳ trình duyệt nào (Google Chrome, Microsoft Edge, Firefox, Cốc Cốc...).
2. Ứng dụng tự động kết nối với Supabase qua API đã cấu hình sẵn trong `config.js`.
3. Khi bạn thực hiện bất kỳ thao tác nào (tạo task mới, thay đổi trạng thái, chỉnh sửa checklist, tạo dự án mới), dữ liệu sẽ được lưu tự động lên Supabase Cloud và bộ đệm trình duyệt LocalStorage.
