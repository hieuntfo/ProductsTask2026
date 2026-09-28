/**
 * VnExpress Products Management Configuration
 * Tối ưu hóa và điều chỉnh các thành phần dự án
 */

window.APP_CONFIG = {
  // Thông tin thương hiệu & Phòng ban
  appName: "VnExpress Products",
  organization: "VnExpress",
  department: "Phòng Phát Triển Sản Phẩm (Product Department)",
  version: "2.4.0",
  currentDate: "2026-09-28", // Ngày hệ thống mốc tham chiếu

  // Kết nối Supabase
  supabase: {
    enabled: true,
    url: "https://jfoewprbjtetoktmfugs.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmb2V3cHJianRldG9rdG1mdWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NDExNDksImV4cCI6MjEwNjExNzE0OX0.bIGV6dNWW7n9am2yDH3XgA_uHy36TRCLJNIUP9SIk_k",
    timeout: 8000,
    storageKey: "vne_products_cache_v1"
  },

  // Danh mục nhóm chuyên môn (Teams)
  teams: [
    {
      id: "Quản lý",
      name: "Quản lý & PO",
      short: "Quản lý",
      color: "#9f224e", // VnExpress Burgundy
      badgeBg: "rgba(159, 34, 78, 0.12)",
      badgeColor: "#9f224e",
      icon: "fa-crown",
      description: "Định hướng chiến lược, KPI sản phẩm, điều phối dự án & quản trị tiến độ"
    },
    {
      id: "UX/UI Designer",
      name: "UX/UI Designer",
      short: "UX/UI",
      color: "#6366f1", // Indigo
      badgeBg: "rgba(99, 102, 241, 0.12)",
      badgeColor: "#6366f1",
      icon: "fa-bezier-curve",
      description: "Nghiên cứu hành vi độc giả, thiết kế Design System & trải nghiệm tương tác"
    },
    {
      id: "SEO",
      name: "SEO Specialist",
      short: "SEO",
      color: "#059669", // Emerald
      badgeBg: "rgba(5, 150, 105, 0.12)",
      badgeColor: "#059669",
      icon: "fa-chart-line",
      description: "Tối ưu hóa Core Web Vitals, Google Discover, cấu trúc dữ liệu và organic traffic"
    },
    {
      id: "Data",
      name: "Data & AI Analytics",
      short: "Data",
      color: "#d97706", // Amber
      badgeBg: "rgba(217, 119, 6, 0.12)",
      badgeColor: "#d97706",
      icon: "fa-brain",
      description: "Xây dựng thuật toán AI gợi ý tin tức, CDP độc giả và phân tích chuyển đổi"
    }
  ],

  // Trạng thái công việc (Task Statuses)
  taskStatuses: [
    {
      id: "Chưa làm",
      label: "Chưa làm",
      color: "#64748b",
      bgColor: "#f1f5f9",
      borderColor: "#cbd5e1",
      icon: "fa-circle-notch",
      isPending: true
    },
    {
      id: "Đang làm",
      label: "Đang làm",
      color: "#2563eb",
      bgColor: "#eff6ff",
      borderColor: "#bfdbfe",
      icon: "fa-spinner",
      isActive: true
    },
    {
      id: "Bị nghẽn",
      label: "Bị nghẽn",
      color: "#dc2626",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
      icon: "fa-triangle-exclamation",
      isBlocked: true
    },
    {
      id: "Hoàn thành",
      label: "Hoàn thành",
      color: "#16a34a",
      bgColor: "#f0fdf4",
      borderColor: "#bbf7d0",
      icon: "fa-circle-check",
      isCompleted: true
    }
  ],

  // Trạng thái dự án (Project Statuses)
  projectStatuses: [
    { id: "Khởi động", label: "Khởi động", color: "#64748b", bg: "#f1f5f9" },
    { id: "Đang triển khai", label: "Đang triển khai", color: "#2563eb", bg: "#eff6ff" },
    { id: "Đang nghiệm thu", label: "Đang nghiệm thu", color: "#d97706", bg: "#fffbeb" },
    { id: "Hoàn thành", label: "Hoàn thành", color: "#16a34a", bg: "#f0fdf4" },
    { id: "Tạm hoãn", label: "Tạm hoãn", color: "#dc2626", bg: "#fef2f2" }
  ],

  // Mức độ ưu tiên (Priority Levels)
  priorities: [
    { id: "Thấp", label: "Thấp", color: "#64748b", icon: "fa-arrow-down" },
    { id: "Trung bình", label: "Trung bình", color: "#3b82f6", icon: "fa-minus" },
    { id: "Cao", label: "Cao", color: "#f59e0b", icon: "fa-arrow-up" },
    { id: "Khẩn cấp", label: "Khẩn cấp", color: "#ef4444", icon: "fa-fire" }
  ],

  // Bộ lọc thời gian (Time Filters)
  timeFilters: [
    { id: "all", label: "Tất cả thời gian", icon: "fa-calendar" },
    { id: "today", label: "Hạn hôm nay", icon: "fa-calendar-day", badge: "Hôm nay" },
    { id: "overdue", label: "Quá hạn", icon: "fa-triangle-exclamation", badge: "Cảnh báo" },
    { id: "soon", label: "Sắp hết hạn (3 ngày)", icon: "fa-clock", badge: "Gấp" },
    { id: "custom", label: "Theo ngày...", icon: "fa-calendar-days" }
  ],

  // Văn phòng làm việc
  locations: [
    "Tòa nhà FPT Cầu Giấy, Hà Nội",
    "Tòa nhà FPT Tân Thuận, TP.HCM"
  ],

  // Trạng thái làm việc của nhân sự
  workStatuses: [
    { id: "Đang làm việc", color: "#16a34a", label: "Đang làm việc" },
    { id: "Bận cao độ", color: "#ef4444", label: "Bận cao độ" },
    { id: "Sẵn sàng nhận việc", color: "#2563eb", label: "Sẵn sàng nhận việc" },
    { id: "Nghỉ phép", color: "#94a3b8", label: "Nghỉ phép" }
  ],

  // Công cụ quản lý mẫu sẵn sàng liên kết
  availableTools: [
    { name: "Figma", icon: "fa-figma", prefix: "https://figma.com/" },
    { name: "Jira / Linear", icon: "fa-jira", prefix: "https://jira." },
    { name: "Google Analytics 4", icon: "fa-chart-pie", prefix: "https://analytics.google.com/" },
    { name: "Metabase BI", icon: "fa-database", prefix: "https://metabase." },
    { name: "Google Search Console", icon: "fa-magnifying-glass-chart", prefix: "https://search.google.com/" },
    { name: "Notion Docs", icon: "fa-book-open", prefix: "https://notion.so/" },
    { name: "Supabase DB", icon: "fa-server", prefix: "https://supabase.com/" }
  ]
};
