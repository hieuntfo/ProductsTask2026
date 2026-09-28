/**
 * VnExpress Products Hub - Application Core Logic
 * Asana-style Work & Project Management for Product Department (20 Members)
 * Full Supabase Cloud Sync + Robust Local Offline Fallback
 */

// =============================================================================
// GLOBAL APP STATE
// =============================================================================
const state = {
  projects: [],
  tasks: [],
  members: [],
  deletedItems: [], // Soft-deleted items: { type: 'task'|'project', item, deletedAt }
  
  // UI & Navigation States
  currentView: 'tasks', // 'tasks' | 'projects' | 'members' | 'reports' | 'trash' | 'config'
  activeTab: 'list',    // 'list' | 'board'
  
  // Filtering system
  filters: {
    date: 'all',        // 'all' | 'today' | 'overdue' | 'soon' | 'custom'
    customDate: '2026-09-28',
    team: 'all',        // 'all' | 'Quản lý' | 'UX/UI Designer' | 'SEO' | 'Data'
    status: 'all',      // 'all' | 'Chưa làm' | 'Đang làm' | 'Bị nghẽn' | 'Hoàn thành'
    search: '',
    subFilter: 'all',   // 'all' | 'active' ("Đang triển khai")
    project: 'all'      // 'all' or projectId
  },

  // Current selections
  selectedTaskId: null,
  selectedProjectId: null,
  selectedMemberId: 'mem_01', // for individual report drilldown
  currentUser: null,          // currently active logged in user
  theme: 'light',
  isOnline: true,
  isSyncing: false
};

// =============================================================================
// SUPABASE CLIENT INITIALIZATION & HELPERS
// =============================================================================
let supabaseClient = null;

function initSupabase() {
  const cfg = window.APP_CONFIG.supabase;
  if (window.supabase && cfg.enabled && cfg.url && cfg.anonKey) {
    try {
      supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
      console.log('Supabase client initialized successfully.');
      updateSyncStatus('online', 'Supabase Cloud');
    } catch (err) {
      console.warn('Supabase initialization failed:', err);
      updateSyncStatus('local', 'Offline LocalStorage');
    }
  } else {
    updateSyncStatus('local', 'Offline LocalStorage');
  }
}

function updateSyncStatus(status, text) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('sync-status-text');
  if (!dot || !txt) return;

  if (status === 'syncing') {
    dot.className = 'status-dot syncing';
    txt.textContent = 'Đang đồng bộ...';
  } else if (status === 'online') {
    dot.className = 'status-dot';
    dot.style.backgroundColor = '#16a34a';
    txt.textContent = text || 'Supabase Online';
    state.isOnline = true;
  } else {
    dot.className = 'status-dot';
    dot.style.backgroundColor = '#d97706';
    txt.textContent = text || 'Offline Mode';
    state.isOnline = false;
  }
}

// =============================================================================
// DATA FETCHING & SYNCHRONIZATION
// =============================================================================
async function loadApplicationData() {
  updateSyncStatus('syncing');

  // Try fetching from Supabase first
  if (supabaseClient) {
    try {
      const [membersRes, projectsRes, tasksRes] = await Promise.all([
        supabaseClient.from('members').select('*'),
        supabaseClient.from('projects').select('*').eq('is_deleted', false),
        supabaseClient.from('tasks').select('*').eq('is_deleted', false)
      ]);

      if (!membersRes.error && membersRes.data && membersRes.data.length > 0) {
        state.members = membersRes.data;
      }
      if (!projectsRes.error && projectsRes.data && projectsRes.data.length > 0) {
        state.projects = projectsRes.data;
      }
      if (!tasksRes.error && tasksRes.data && tasksRes.data.length > 0) {
        state.tasks = tasksRes.data;
      }

      // Check soft-deleted
      const [delProjects, delTasks] = await Promise.all([
        supabaseClient.from('projects').select('*').eq('is_deleted', true),
        supabaseClient.from('tasks').select('*').eq('is_deleted', true)
      ]);

      state.deletedItems = [];
      if (delProjects.data) {
        delProjects.data.forEach(p => state.deletedItems.push({ type: 'project', item: p, deletedAt: p.updated_at || new Date().toISOString() }));
      }
      if (delTasks.data) {
        delTasks.data.forEach(t => state.deletedItems.push({ type: 'task', item: t, deletedAt: t.updated_at || new Date().toISOString() }));
      }

      console.log('Loaded data from Supabase successfully:', {
        members: state.members.length,
        projects: state.projects.length,
        tasks: state.tasks.length
      });
      updateSyncStatus('online', 'Supabase Cloud');
      saveToLocalStorage();
      return;
    } catch (err) {
      console.warn('Could not query Supabase, falling back to local storage:', err);
    }
  }

  // Fallback to LocalStorage or Initial Data
  loadFromLocalStorage();
  updateSyncStatus('local', 'Offline LocalStorage');
}

function loadFromLocalStorage() {
  const localCache = localStorage.getItem(window.APP_CONFIG.supabase.storageKey);
  if (localCache) {
    try {
      const parsed = JSON.parse(localCache);
      state.members = parsed.members || window.INITIAL_DATA.members;
      state.projects = parsed.projects || window.INITIAL_DATA.projects;
      state.tasks = parsed.tasks || window.INITIAL_DATA.tasks;
      state.deletedItems = parsed.deletedItems || [];
      return;
    } catch (e) {
      console.error('Error parsing localStorage:', e);
    }
  }

  // Pure default initial data
  state.members = JSON.parse(JSON.stringify(window.INITIAL_DATA.members));
  state.projects = JSON.parse(JSON.stringify(window.INITIAL_DATA.projects));
  state.tasks = JSON.parse(JSON.stringify(window.INITIAL_DATA.tasks));
  state.deletedItems = [];
  saveToLocalStorage();
}

function saveToLocalStorage() {
  const data = {
    members: state.members,
    projects: state.projects,
    tasks: state.tasks,
    deletedItems: state.deletedItems,
    lastSaved: new Date().toISOString()
  };
  localStorage.setItem(window.APP_CONFIG.supabase.storageKey, JSON.stringify(data));
}

// Background sync mutation to Supabase
async function syncMutation(table, action, record) {
  saveToLocalStorage(); // always write locally first
  if (!supabaseClient) return;

  try {
    updateSyncStatus('syncing');
    if (action === 'insert') {
      await supabaseClient.from(table).insert([record]);
    } else if (action === 'update') {
      await supabaseClient.from(table).update(record).eq('id', record.id);
    } else if (action === 'delete') {
      await supabaseClient.from(table).delete().eq('id', record.id);
    }
    updateSyncStatus('online', 'Supabase Cloud');
  } catch (e) {
    console.error(`Sync error on ${table}:`, e);
    updateSyncStatus('local', 'Đã lưu cục bộ (Lỗi mạng)');
  }
}

// =============================================================================
// UTILITY FUNCTIONS & FORMATTERS
// =============================================================================
const REF_DATE = window.APP_CONFIG.currentDate || '2026-09-28';

function getMemberById(id) {
  return state.members.find(m => m.id === id) || {
    id: 'unknown',
    full_name: 'Chưa phân công',
    role: 'N/A',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'
  };
}

function getProjectById(id) {
  return state.projects.find(p => p.id === id) || {
    id: 'unknown',
    name: 'Không xác định',
    code: 'VNE'
  };
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getDateBadgeClass(dueDate, status) {
  if (status === 'Hoàn thành') return 'completed';
  if (!dueDate) return '';

  if (dueDate < REF_DATE) {
    return 'overdue';
  } else if (dueDate === REF_DATE) {
    return 'today';
  } else {
    // Check if within 3 days
    const diff = (new Date(dueDate) - new Date(REF_DATE)) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff <= 3) return 'soon';
  }
  return '';
}

function getDateBadgeLabel(dueDate, status) {
  if (status === 'Hoàn thành') return formatDateDisplay(dueDate);
  if (!dueDate) return 'Không có hạn';

  if (dueDate < REF_DATE) {
    return `Quá hạn (${formatDateDisplay(dueDate)})`;
  } else if (dueDate === REF_DATE) {
    return `Hôm nay (${formatDateDisplay(dueDate)})`;
  } else {
    const diff = Math.round((new Date(dueDate) - new Date(REF_DATE)) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff <= 3) {
      return `Còn ${diff} ngày (${formatDateDisplay(dueDate)})`;
    }
  }
  return formatDateDisplay(dueDate);
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'Khẩn cấp': return { color: '#ef4444', bg: '#fef2f2' };
    case 'Cao': return { color: '#f59e0b', bg: '#fffbeb' };
    case 'Trung bình': return { color: '#3b82f6', bg: '#eff6ff' };
    default: return { color: '#64748b', bg: '#f1f5f9' };
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'Hoàn thành': return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'fa-circle-check' };
    case 'Đang làm': return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'fa-spinner' };
    case 'Bị nghẽn': return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'fa-triangle-exclamation' };
    default: return { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'fa-circle-notch' };
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// =============================================================================
// FILTER & SEARCH LOGIC
// =============================================================================
function getFilteredTasks() {
  return state.tasks.filter(task => {
    // 1. Project filter
    if (state.filters.project !== 'all' && task.project_id !== state.filters.project) {
      return false;
    }

    // 2. SubFilter: "Đang triển khai"
    if (state.filters.subFilter === 'active') {
      if (task.status === 'Hoàn thành') return false;
    }

    // 3. Team filter
    if (state.filters.team !== 'all' && task.team !== state.filters.team) {
      return false;
    }

    // 4. Status filter
    if (state.filters.status !== 'all' && task.status !== state.filters.status) {
      return false;
    }

    // 5. Date filter
    if (state.filters.date === 'today') {
      if (task.due_date !== REF_DATE) return false;
    } else if (state.filters.date === 'overdue') {
      if (task.status === 'Hoàn thành' || !task.due_date || task.due_date >= REF_DATE) return false;
    } else if (state.filters.date === 'soon') {
      if (task.status === 'Hoàn thành' || !task.due_date) return false;
      const diff = (new Date(task.due_date) - new Date(REF_DATE)) / (1000 * 60 * 60 * 24);
      if (diff <= 0 || diff > 3) return false;
    } else if (state.filters.date === 'custom') {
      if (task.due_date !== state.filters.customDate) return false;
    }

    // 6. Search query
    if (state.filters.search.trim()) {
      const q = state.filters.search.toLowerCase().trim();
      const project = getProjectById(task.project_id);
      const assignee = getMemberById(task.assignee_id);
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      const matchProject = (project.name || '').toLowerCase().includes(q) || (project.code || '').toLowerCase().includes(q);
      const matchAssignee = (assignee.full_name || '').toLowerCase().includes(q) || (assignee.username || '').toLowerCase().includes(q);

      if (!matchTitle && !matchDesc && !matchProject && !matchAssignee) {
        return false;
      }
    }

    return true;
  });
}

// =============================================================================
// MAIN RENDER CONTROLLER
// =============================================================================
function renderApp() {
  updateCountsAndStats();
  renderSidebarPinnedProjects();

  // Hide all view panes
  const panes = document.querySelectorAll('.view-content-pane');
  panes.forEach(pane => pane.style.display = 'none');

  const filterToolbar = document.getElementById('filter-toolbar');
  const viewTabs = document.getElementById('view-tabs-container');
  const statsBanner = document.getElementById('stats-banner');

  // Handle active view
  if (state.currentView === 'tasks') {
    if (filterToolbar) filterToolbar.style.display = 'flex';
    if (viewTabs) viewTabs.style.display = 'flex';
    if (statsBanner) statsBanner.style.display = 'grid';

    document.getElementById('view-title-text').textContent = state.filters.subFilter === 'active' ? 'Đang triển khai (Active Tasks)' : 'Tất cả công việc';
    document.getElementById('view-subtitle-text').textContent = 'Quản lý, phân công và kiểm soát tiến độ 20 nhân sự phòng Product';
    document.getElementById('view-icon-badge').innerHTML = state.filters.subFilter === 'active' ? '<i class="fa-solid fa-bolt-lightning" style="color: #2563eb;"></i>' : '<i class="fa-solid fa-list-check"></i>';

    if (state.activeTab === 'list') {
      document.getElementById('view-tasks-list').style.display = 'block';
      renderTasksList();
    } else {
      document.getElementById('view-tasks-board').style.display = 'block';
      renderTasksBoard();
    }
  } else if (state.currentView === 'projects') {
    if (filterToolbar) filterToolbar.style.display = 'none';
    if (viewTabs) viewTabs.style.display = 'none';
    if (statsBanner) statsBanner.style.display = 'none';

    document.getElementById('view-title-text').textContent = 'Quản lý Dự án (Projects Hub)';
    document.getElementById('view-subtitle-text').textContent = 'Theo dõi mục tiêu KPI, các giai đoạn (phases), liên kết công cụ và checklist dự án';
    document.getElementById('view-icon-badge').innerHTML = '<i class="fa-solid fa-rocket" style="color: #9f224e;"></i>';
    document.getElementById('view-projects').style.display = 'block';
    renderProjects();
  } else if (state.currentView === 'members') {
    if (filterToolbar) filterToolbar.style.display = 'none';
    if (viewTabs) viewTabs.style.display = 'none';
    if (statsBanner) statsBanner.style.display = 'none';

    document.getElementById('view-title-text').textContent = 'Đội ngũ Nhân sự (20 Nhân sự)';
    document.getElementById('view-subtitle-text').textContent = 'Quản lý thông tin đăng nhập User/Password, địa điểm làm việc, vị trí và dự án tham gia';
    document.getElementById('view-icon-badge').innerHTML = '<i class="fa-solid fa-users" style="color: #6366f1;"></i>';
    document.getElementById('view-members').style.display = 'block';
    renderMembers();
  } else if (state.currentView === 'reports') {
    if (filterToolbar) filterToolbar.style.display = 'none';
    if (viewTabs) viewTabs.style.display = 'none';
    if (statsBanner) statsBanner.style.display = 'none';

    document.getElementById('view-title-text').textContent = 'Báo cáo & Thống kê Sản phẩm';
    document.getElementById('view-subtitle-text').textContent = 'Báo cáo tổng quan toàn phòng, tiến độ KPI và thống kê chi tiết theo 20 nhân sự';
    document.getElementById('view-icon-badge').innerHTML = '<i class="fa-solid fa-chart-pie" style="color: #059669;"></i>';
    document.getElementById('view-reports').style.display = 'block';
    renderReports();
  } else if (state.currentView === 'trash') {
    if (filterToolbar) filterToolbar.style.display = 'none';
    if (viewTabs) viewTabs.style.display = 'none';
    if (statsBanner) statsBanner.style.display = 'none';

    document.getElementById('view-title-text').textContent = 'Thùng rác (Trash Bin)';
    document.getElementById('view-subtitle-text').textContent = 'Khôi phục hoặc xóa hoàn toàn các công việc và dự án đã xóa';
    document.getElementById('view-icon-badge').innerHTML = '<i class="fa-solid fa-trash-can" style="color: #64748b;"></i>';
    document.getElementById('view-trash').style.display = 'block';
    renderTrash();
  } else if (state.currentView === 'config') {
    if (filterToolbar) filterToolbar.style.display = 'none';
    if (viewTabs) viewTabs.style.display = 'none';
    if (statsBanner) statsBanner.style.display = 'none';

    document.getElementById('view-title-text').textContent = 'Cấu hình Hệ thống (System Config)';
    document.getElementById('view-subtitle-text').textContent = 'Tối ưu hóa các tham số dự án, kết nối Supabase và quy chuẩn phòng ban';
    document.getElementById('view-icon-badge').innerHTML = '<i class="fa-solid fa-sliders" style="color: #d97706;"></i>';
    document.getElementById('view-config').style.display = 'block';
    renderConfigView();
  }
}

// =============================================================================
// UPDATE COUNTS & STATS
// =============================================================================
function updateCountsAndStats() {
  const activeTasks = state.tasks.filter(t => t.status !== 'Hoàn thành');
  const inProgressTasks = state.tasks.filter(t => t.status === 'Đang làm');
  const blockedTasks = state.tasks.filter(t => t.status === 'Bị nghẽn');
  const completedTasks = state.tasks.filter(t => t.status === 'Hoàn thành');
  const dueTodayTasks = state.tasks.filter(t => t.due_date === REF_DATE && t.status !== 'Hoàn thành');
  const overdueTasks = state.tasks.filter(t => t.due_date < REF_DATE && t.status !== 'Hoàn thành');

  // Sidebar badges
  const sbTasks = document.getElementById('sidebar-tasks-count');
  if (sbTasks) sbTasks.textContent = state.tasks.length;
  
  const sbActive = document.getElementById('sidebar-active-count');
  if (sbActive) sbActive.textContent = activeTasks.length;

  const sbProjects = document.getElementById('sidebar-projects-count');
  if (sbProjects) sbProjects.textContent = state.projects.length;

  const sbTrash = document.getElementById('sidebar-trash-count');
  if (sbTrash) sbTrash.textContent = state.deletedItems.length;

  // Filter pills badges
  const pillToday = document.getElementById('pill-count-today');
  if (pillToday) pillToday.textContent = dueTodayTasks.length;

  const pillOverdue = document.getElementById('pill-count-overdue');
  if (pillOverdue) pillOverdue.textContent = overdueTasks.length;

  // Stat banner values
  const stTotal = document.getElementById('stat-total-tasks');
  if (stTotal) stTotal.textContent = state.tasks.length;

  const stInProg = document.getElementById('stat-in-progress');
  if (stInProg) stInProg.textContent = inProgressTasks.length;

  const stBlocked = document.getElementById('stat-blocked');
  if (stBlocked) stBlocked.textContent = blockedTasks.length;

  const stDueToday = document.getElementById('stat-due-today');
  if (stDueToday) stDueToday.textContent = dueTodayTasks.length;

  const stCompleted = document.getElementById('stat-completed');
  if (stCompleted) stCompleted.textContent = completedTasks.length;
}

function renderSidebarPinnedProjects() {
  const container = document.getElementById('sidebar-pinned-projects');
  if (!container) return;

  const colors = ['#9f224e', '#6366f1', '#059669', '#d97706', '#2563eb'];
  container.innerHTML = state.projects.slice(0, 5).map((p, idx) => `
    <div class="sidebar-project-item ${state.filters.project === p.id ? 'active' : ''}" data-project-id="${p.id}" title="${p.name}">
      <span class="project-dot" style="background-color: ${colors[idx % colors.length]};"></span>
      <span>${p.code}</span>
    </div>
  `).join('');
}

// =============================================================================
// RENDER VIEW 1: TASKS LIST VIEW (Asana Precision Table)
// =============================================================================
function renderTasksList() {
  const tbody = document.getElementById('tasks-table-body');
  if (!tbody) return;

  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 48px; color: var(--text-muted);">
          <i class="fa-solid fa-inbox" style="font-size: 36px; margin-bottom: 12px; display: block; opacity: 0.5;"></i>
          <p style="font-size: 15px; font-weight: 600;">Không tìm thấy công việc nào phù hợp</p>
          <p style="font-size: 13px;">Hãy thử xóa bộ lọc hoặc bấm "+ Tạo Công việc" để thêm mới.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(task => {
    const isCompleted = task.status === 'Hoàn thành';
    const project = getProjectById(task.project_id);
    const assignee = getMemberById(task.assignee_id);
    const priorityMeta = getPriorityColor(task.priority);
    const statusMeta = getStatusStyle(task.status);
    const dateClass = getDateBadgeClass(task.due_date, task.status);
    const dateLabel = getDateBadgeLabel(task.due_date, task.status);
    
    // Subtasks summary
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const doneSub = subtasks.filter(s => s.completed).length;
    const subtaskBadge = subtasks.length > 0 ? `
      <span class="subtask-indicator" title="${doneSub}/${subtasks.length} checklist hoàn thành">
        <i class="fa-solid fa-list-check"></i> ${doneSub}/${subtasks.length}
      </span>
    ` : '';

    return `
      <tr data-task-id="${task.id}">
        <td>
          <div class="task-check-circle ${isCompleted ? 'completed' : ''}" data-action="toggle-status" data-task-id="${task.id}" title="${isCompleted ? 'Mở lại công việc' : 'Đánh dấu hoàn thành'}">
            <i class="fa-solid fa-check" style="font-size: 10px;"></i>
          </div>
        </td>
        <td>
          <div class="task-title-cell" data-action="open-drawer" data-task-id="${task.id}">
            <span class="task-title-text ${isCompleted ? 'completed' : ''}">${task.title}</span>
            ${subtaskBadge}
          </div>
        </td>
        <td>
          <span class="project-chip" title="${project.name}">
            <i class="fa-solid fa-folder" style="color: var(--brand-primary); font-size: 11px;"></i>
            ${project.code}
          </span>
        </td>
        <td>
          <span class="team-chip" style="background: rgba(159, 34, 78, 0.08); color: var(--text-secondary);">
            ${task.team}
          </span>
        </td>
        <td>
          <div class="assignee-cell" title="${assignee.full_name} (${assignee.role})">
            <img src="${assignee.avatar}" class="assignee-avatar" alt="${assignee.full_name}">
            <span style="font-size: 12.5px; font-weight: 500;">${assignee.full_name.split(' ').slice(-2).join(' ')}</span>
          </div>
        </td>
        <td>
          <span class="date-badge ${dateClass}">
            <i class="fa-regular fa-calendar"></i>
            ${dateLabel}
          </span>
        </td>
        <td>
          <span class="priority-pill" style="color: ${priorityMeta.color}; background: ${priorityMeta.bg};">
            ${task.priority || 'Trung bình'}
          </span>
        </td>
        <td>
          <span class="status-badge" style="color: ${statusMeta.color}; background: ${statusMeta.bg}; border: 1px solid ${statusMeta.border};">
            <i class="fa-solid ${statusMeta.icon}" style="font-size: 11px;"></i>
            ${task.status}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-icon" style="width: 28px; height: 28px;" data-action="delete-task" data-task-id="${task.id}" title="Xóa vào thùng rác">
            <i class="fa-regular fa-trash-can" style="font-size: 12px; color: var(--text-muted);"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// =============================================================================
// RENDER VIEW 2: TASKS KANBAN BOARD VIEW
// =============================================================================
function renderTasksBoard() {
  const container = document.getElementById('kanban-board-container');
  if (!container) return;

  const statuses = [
    { id: 'Chưa làm', label: 'Chưa làm', dotColor: '#64748b' },
    { id: 'Đang làm', label: 'Đang làm', dotColor: '#2563eb' },
    { id: 'Bị nghẽn', label: 'Bị nghẽn', dotColor: '#dc2626' },
    { id: 'Hoàn thành', label: 'Hoàn thành', dotColor: '#16a34a' }
  ];

  const filtered = getFilteredTasks();

  container.innerHTML = statuses.map(col => {
    const colTasks = filtered.filter(t => t.status === col.id);

    return `
      <div class="kanban-column" data-status="${col.id}">
        <div class="kanban-column-header">
          <div class="kanban-title-wrap">
            <span class="kanban-col-dot" style="background-color: ${col.dotColor};"></span>
            <span class="kanban-column-title">${col.label}</span>
          </div>
          <span class="kanban-count-badge">${colTasks.length}</span>
        </div>

        <div class="kanban-cards-list">
          ${colTasks.map(task => {
            const project = getProjectById(task.project_id);
            const assignee = getMemberById(task.assignee_id);
            const priorityMeta = getPriorityColor(task.priority);
            const dateClass = getDateBadgeClass(task.due_date, task.status);
            const dateLabel = getDateBadgeLabel(task.due_date, task.status);
            const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
            const doneSub = subtasks.filter(s => s.completed).length;

            return `
              <div class="kanban-card" data-action="open-drawer" data-task-id="${task.id}">
                <div class="kanban-card-top">
                  <span class="project-chip">
                    <i class="fa-solid fa-folder" style="color: var(--brand-primary); font-size: 10px;"></i>
                    ${project.code}
                  </span>
                  <span class="priority-pill" style="color: ${priorityMeta.color}; background: ${priorityMeta.bg}; font-size: 10.5px;">
                    ${task.priority}
                  </span>
                </div>

                <div class="kanban-card-title">${task.title}</div>

                <div class="kanban-card-footer">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${assignee.avatar}" class="assignee-avatar" title="${assignee.full_name}" alt="${assignee.full_name}">
                    ${subtasks.length > 0 ? `
                      <span class="subtask-indicator"><i class="fa-solid fa-list-check"></i> ${doneSub}/${subtasks.length}</span>
                    ` : ''}
                  </div>
                  <span class="date-badge ${dateClass}" style="font-size: 11px;">
                    ${dateLabel}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// RENDER VIEW 3: PROJECTS VIEW (Modern Hub)
// =============================================================================
function renderProjects() {
  const container = document.getElementById('projects-grid-container');
  if (!container) return;

  if (state.projects.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 48px; background: var(--bg-surface); border-radius: var(--radius-lg);">
        <i class="fa-solid fa-rocket" style="font-size: 40px; color: var(--brand-primary); margin-bottom: 12px;"></i>
        <p style="font-size: 16px; font-weight: 700;">Chưa có dự án nào</p>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">Bấm nút "+ Tạo Dự án" để tạo mới.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.projects.map(p => {
    // Project tasks
    const pTasks = state.tasks.filter(t => t.project_id === p.id);
    const pCompleted = pTasks.filter(t => t.status === 'Hoàn thành').length;
    const taskPercent = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0;

    // Checklists (Đã làm được / Còn tồn tại)
    const checklists = Array.isArray(p.checklist) ? p.checklist : [];
    const doneCheck = checklists.filter(c => c.completed).length;
    const pendingCheck = checklists.length - doneCheck;
    const checklistPercent = checklists.length > 0 ? Math.round((doneCheck / checklists.length) * 100) : 0;

    // Phases
    const phases = Array.isArray(p.phases) ? p.phases : [];

    // Tools & Links
    const tools = Array.isArray(p.tools) ? p.tools : [];

    // Linked Projects
    const linked = Array.isArray(p.linked_projects) ? p.linked_projects : [];

    return `
      <div class="project-card" data-project-id="${p.id}">
        <div class="project-header-row">
          <div>
            <span class="project-code-tag">${p.code}</span>
            <h3 class="project-name">${p.name}</h3>
          </div>
          <span class="status-badge" style="background: var(--brand-light); color: var(--brand-primary);">
            ${p.status}
          </span>
        </div>

        <div class="project-kpi-box">
          <div class="project-kpi-title"><i class="fa-solid fa-bullseye"></i> Mục tiêu & KPI</div>
          <div>${p.kpi || 'Chưa cập nhật KPI'}</div>
        </div>

        <!-- Task & Checklist Progress -->
        <div class="progress-section">
          <div class="progress-header">
            <span>Tiến độ Công việc (${pCompleted}/${pTasks.length})</span>
            <span>${taskPercent}%</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${taskPercent}%;"></div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-header">
            <span>Checklist tồn đọng & đã làm (${doneCheck}/${checklists.length})</span>
            <span style="color: ${pendingCheck > 0 ? '#d97706' : '#16a34a'};">
              Đã xong: ${doneCheck} | Còn tồn tại: ${pendingCheck}
            </span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${checklistPercent}%; background: linear-gradient(90deg, #10b981, #3b82f6);"></div>
          </div>
        </div>

        <!-- Phases List -->
        <div>
          <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
            <i class="fa-solid fa-timeline"></i> Giai đoạn (${phases.length})
          </div>
          <div class="phases-chips-row">
            ${phases.map(ph => `
              <span class="phase-pill ${ph.status || 'pending'}">
                <i class="fa-solid ${ph.status === 'completed' ? 'fa-circle-check' : ph.status === 'in_progress' ? 'fa-spinner' : 'fa-circle-notch'}"></i>
                ${ph.name}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- External Tools & Links -->
        <div>
          <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
            <i class="fa-solid fa-link"></i> Công cụ quản trị
          </div>
          <div class="tools-links-row">
            ${tools.map(tl => `
              <a href="${tl.url || '#'}" target="_blank" class="tool-link-btn" title="Mở ${tl.name}">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                ${tl.name}
              </a>
            `).join('')}
          </div>
        </div>

        ${linked.length > 0 ? `
          <div style="font-size: 11.5px; color: var(--text-muted);">
            <strong>Dự án liên kết:</strong> ${linked.join(', ')}
          </div>
        ` : ''}

        <div class="project-card-footer">
          <div style="font-size: 11.5px; color: var(--text-muted);">
            <i class="fa-regular fa-calendar"></i> ${formatDateDisplay(p.start_date)} → ${formatDateDisplay(p.end_date)}
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-secondary" style="height: 30px; font-size: 12px; padding: 0 10px;" data-action="filter-project-tasks" data-project-id="${p.id}">
              <i class="fa-solid fa-list-check"></i> Xem tasks
            </button>
            <button class="btn-icon" style="width: 30px; height: 30px;" data-action="edit-project" data-project-id="${p.id}" title="Chỉnh sửa dự án">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-icon" style="width: 30px; height: 30px;" data-action="delete-project" data-project-id="${p.id}" title="Xóa vào thùng rác">
              <i class="fa-regular fa-trash-can" style="color: #dc2626;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// RENDER VIEW 4: 20 MEMBERS DIRECTORY (With User/Pass View)
// =============================================================================
function renderMembers() {
  const container = document.getElementById('members-grid-container');
  if (!container) return;

  container.innerHTML = state.members.map(m => {
    // Member's tasks
    const mTasks = state.tasks.filter(t => t.assignee_id === m.id);
    const mActive = mTasks.filter(t => t.status !== 'Hoàn thành').length;
    const mCompleted = mTasks.filter(t => t.status === 'Hoàn thành').length;

    // Projects they are involved in
    const pIds = [...new Set(mTasks.map(t => t.project_id))];
    const projectCodes = pIds.map(pid => getProjectById(pid).code).filter(Boolean);

    // Work status style
    const isBusy = m.work_status === 'Bận cao độ';
    const isLeave = m.work_status === 'Nghỉ phép';
    const statusBg = isBusy ? '#fee2e2' : isLeave ? '#f1f5f9' : '#dcfce7';
    const statusColor = isBusy ? '#b91c1c' : isLeave ? '#64748b' : '#15803d';

    return `
      <div class="member-card" data-member-id="${m.id}">
        <div class="member-top-info">
          <img src="${m.avatar}" class="member-avatar-lg" alt="${m.full_name}">
          <div class="member-title-block">
            <h3>${m.full_name}</h3>
            <div class="member-position">${m.position}</div>
            <span class="team-chip" style="margin-top: 4px; background: rgba(99, 102, 241, 0.1); color: #4338ca;">
              ${m.role} • ${m.level}
            </span>
          </div>
        </div>

        <!-- Credentials display (Requested: Luôn hiển thị user/pass) -->
        <div class="member-credentials-box">
          <div class="cred-row">
            <span class="cred-label"><i class="fa-solid fa-user-lock"></i> Username:</span>
            <span class="cred-value">${m.username}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label"><i class="fa-solid fa-key"></i> Password:</span>
            <span class="cred-value" style="color: var(--brand-primary);">${m.password}</span>
          </div>
        </div>

        <div class="member-contact-info">
          <div><i class="fa-regular fa-envelope" style="width: 16px; color: var(--text-muted);"></i> ${m.email}</div>
          <div><i class="fa-solid fa-phone" style="width: 16px; color: var(--text-muted);"></i> ${m.phone || '09xx.xxx.xxx'}</div>
          <div><i class="fa-solid fa-location-dot" style="width: 16px; color: var(--text-muted);"></i> ${m.location}</div>
        </div>

        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Dự án đang làm:</span>
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
            ${projectCodes.length > 0 ? projectCodes.map(code => `
              <span class="project-chip" style="font-size: 10.5px;">${code}</span>
            `).join('') : '<span style="font-size: 11px; color: var(--text-muted);">Chưa tham gia dự án</span>'}
          </div>
        </div>

        <div class="member-footer-stats">
          <span class="status-badge" style="background: ${statusBg}; color: ${statusColor}; font-size: 11px;">
            <i class="fa-solid fa-circle" style="font-size: 7px;"></i> ${m.work_status || 'Đang làm việc'}
          </span>
          <div style="font-size: 11.5px; font-weight: 600;">
            <span style="color: #2563eb;">${mActive} đang làm</span> | <span style="color: #16a34a;">${mCompleted} xong</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// RENDER VIEW 5: REPORTS & ANALYTICS VIEW
// =============================================================================
function renderReports() {
  const container = document.getElementById('reports-container');
  if (!container) return;

  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === 'Hoàn thành').length;
  const inProgressTasks = state.tasks.filter(t => t.status === 'Đang làm').length;
  const blockedTasks = state.tasks.filter(t => t.status === 'Bị nghẽn').length;
  const overdueTasks = state.tasks.filter(t => t.due_date < REF_DATE && t.status !== 'Hoàn thành').length;
  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Selected member for individual drilldown
  const member = getMemberById(state.selectedMemberId);
  const mTasks = state.tasks.filter(t => t.assignee_id === member.id);
  const mCompleted = mTasks.filter(t => t.status === 'Hoàn thành').length;
  const mInProgress = mTasks.filter(t => t.status === 'Đang làm').length;
  const mBlocked = mTasks.filter(t => t.status === 'Bị nghẽn').length;
  const mOverdue = mTasks.filter(t => t.due_date < REF_DATE && t.status !== 'Hoàn thành').length;
  const mRate = mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0;

  container.innerHTML = `
    <!-- Top Executive Department Stats -->
    <div class="reports-charts-grid">
      <div class="chart-card">
        <div class="chart-card-title">
          <h3><i class="fa-solid fa-chart-pie" style="color: var(--brand-primary);"></i> Hiệu Suất & Tỉ Lệ Hoàn Thành Phòng Product</h3>
          <span style="font-size: 18px; font-weight: 800; color: var(--brand-primary);">${rate}% Hoàn tất</span>
        </div>
        <div class="progress-bar-track" style="height: 12px;">
          <div class="progress-bar-fill" style="width: ${rate}%;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; margin-top: 10px;">
          <div class="mini-stat-card"><div class="mini-stat-val" style="color: #64748b;">${totalTasks}</div><div class="mini-stat-lbl">Tổng task</div></div>
          <div class="mini-stat-card"><div class="mini-stat-val" style="color: #2563eb;">${inProgressTasks}</div><div class="mini-stat-lbl">Đang làm</div></div>
          <div class="mini-stat-card"><div class="mini-stat-val" style="color: #dc2626;">${blockedTasks}</div><div class="mini-stat-lbl">Bị nghẽn</div></div>
          <div class="mini-stat-card"><div class="mini-stat-val" style="color: #b91c1c;">${overdueTasks}</div><div class="mini-stat-lbl">Quá hạn</div></div>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-title">
          <h3><i class="fa-solid fa-people-group" style="color: #6366f1;"></i> Phân Bổ Công Việc Theo 4 Nhóm Chuyên Môn</h3>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; justify-content: center; height: 100%;">
          ${['Quản lý', 'UX/UI Designer', 'SEO', 'Data'].map(tName => {
            const count = state.tasks.filter(t => t.team === tName).length;
            const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
            const colors = { 'Quản lý': '#9f224e', 'UX/UI Designer': '#6366f1', 'SEO': '#059669', 'Data': '#d97706' };
            return `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; margin-bottom: 4px;">
                  <span>${tName}</span>
                  <span>${count} tasks (${pct}%)</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width: ${pct}%; background: ${colors[tName]};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Individual Member Drilldown Report Section (User Request: Báo cáo cá nhân chi tiết) -->
    <div class="individual-report-section">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 style="font-size: 16px; font-weight: 700;"><i class="fa-solid fa-user-check" style="color: var(--brand-primary);"></i> Báo Cáo Hiệu Suất Cá Nhân Chi Tiết</h3>
          <p style="font-size: 12.5px; color: var(--text-muted);">Chọn bất kỳ ai trong 20 nhân sự để xem chi tiết khối lượng, điểm nghẽn và tiến độ</p>
        </div>
        <div class="member-select-bar">
          <label style="font-weight: 600; font-size: 13px;">Chọn nhân sự:</label>
          <select id="report-member-select" class="member-select-dropdown">
            ${state.members.map(m => `
              <option value="${m.id}" ${m.id === state.selectedMemberId ? 'selected' : ''}>
                ${m.full_name} (${m.role} - ${m.position})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Member Profile Header in Report -->
      <div class="member-report-profile">
        <img src="${member.avatar}" style="width: 64px; height: 64px; border-radius: 50%;" alt="${member.full_name}">
        <div style="flex: 1;">
          <h3 style="font-size: 17px; font-weight: 800;">${member.full_name}</h3>
          <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
            ${member.position} • <strong>${member.role}</strong> (${member.location})
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            <i class="fa-regular fa-envelope"></i> ${member.email} | <i class="fa-solid fa-user-lock"></i> Username: <code>${member.username}</code>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 28px; font-weight: 800; color: ${mRate >= 50 ? '#16a34a' : '#2563eb'};">${mRate}%</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Tỉ lệ hoàn thành</div>
        </div>
      </div>

      <!-- Member Specific Stats -->
      <div class="member-report-stats">
        <div class="mini-stat-card"><div class="mini-stat-val">${mTasks.length}</div><div class="mini-stat-lbl">Tổng task giao</div></div>
        <div class="mini-stat-card"><div class="mini-stat-val" style="color: #2563eb;">${mInProgress}</div><div class="mini-stat-lbl">Đang làm</div></div>
        <div class="mini-stat-card"><div class="mini-stat-val" style="color: #dc2626;">${mBlocked}</div><div class="mini-stat-lbl">Bị nghẽn</div></div>
        <div class="mini-stat-card"><div class="mini-stat-val" style="color: #b91c1c;">${mOverdue}</div><div class="mini-stat-lbl">Quá hạn</div></div>
        <div class="mini-stat-card"><div class="mini-stat-val" style="color: #16a34a;">${mCompleted}</div><div class="mini-stat-lbl">Đã hoàn thành</div></div>
      </div>

      <!-- Member Specific Tasks List -->
      <div style="margin-top: 10px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">Danh sách nhiệm vụ của ${member.full_name}:</h4>
        <div class="tasks-table-container">
          <table class="tasks-table">
            <thead>
              <tr>
                <th>Công việc</th>
                <th>Dự án</th>
                <th>Hạn chót</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${mTasks.length > 0 ? mTasks.map(t => {
                const prj = getProjectById(t.project_id);
                const pColor = getPriorityColor(t.priority);
                const sColor = getStatusStyle(t.status);
                const dClass = getDateBadgeClass(t.due_date, t.status);
                return `
                  <tr>
                    <td><strong style="cursor: pointer;" data-action="open-drawer" data-task-id="${t.id}">${t.title}</strong></td>
                    <td><span class="project-chip">${prj.code}</span></td>
                    <td><span class="date-badge ${dClass}">${formatDateDisplay(t.due_date)}</span></td>
                    <td><span class="priority-pill" style="color:${pColor.color}; background:${pColor.bg};">${t.priority}</span></td>
                    <td><span class="status-badge" style="color:${sColor.color}; background:${sColor.bg};">${t.status}</span></td>
                  </tr>
                `;
              }).join('') : `
                <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Nhân sự hiện chưa có công việc nào được giao.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Attach listener to member report dropdown
  const select = document.getElementById('report-member-select');
  if (select) {
    select.addEventListener('change', (e) => {
      state.selectedMemberId = e.target.value;
      renderReports();
    });
  }
}

// =============================================================================
// RENDER VIEW 6: TRASH BIN (Thùng rác & Khôi phục)
// =============================================================================
function renderTrash() {
  const container = document.getElementById('trash-items-list');
  if (!container) return;

  if (state.deletedItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; color: var(--text-muted);">
        <i class="fa-solid fa-trash-can" style="font-size: 36px; margin-bottom: 12px; display: block; opacity: 0.4;"></i>
        <p style="font-size: 15px; font-weight: 600;">Thùng rác trống</p>
        <p style="font-size: 13px;">Không có mục nào bị xóa gần đây.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.deletedItems.map((entry, index) => {
    const isTask = entry.type === 'task';
    const title = isTask ? entry.item.title : `${entry.item.code} - ${entry.item.name}`;

    return `
      <div class="trash-item-row">
        <div class="trash-item-details">
          <span class="trash-type-badge">${isTask ? 'Công việc' : 'Dự án'}</span>
          <div>
            <div style="font-weight: 600; color: var(--text-main); font-size: 13.5px;">${title}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">Đã xóa: ${new Date(entry.deletedAt).toLocaleString('vi-VN')}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" style="height: 30px; font-size: 12px; padding: 0 10px;" data-action="restore-trash" data-index="${index}">
            <i class="fa-solid fa-rotate-left"></i> Khôi phục
          </button>
          <button class="btn-icon" style="width: 30px; height: 30px; color: #dc2626;" data-action="delete-forever" data-index="${index}" title="Xóa vĩnh viễn">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// RENDER VIEW 7: CONFIG SYSTEM EDITOR
// =============================================================================
function renderConfigView() {
  const urlInput = document.getElementById('cfg-supabase-url');
  if (urlInput) urlInput.value = window.APP_CONFIG.supabase.url;

  const jsonEditor = document.getElementById('cfg-json-editor');
  if (jsonEditor) {
    jsonEditor.value = JSON.stringify(window.APP_CONFIG, null, 2);
  }
}

// =============================================================================
// SLIDE-OVER TASK DETAIL DRAWER LOGIC
// =============================================================================
function openTaskDrawer(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  state.selectedTaskId = taskId;

  const drawer = document.getElementById('task-drawer');
  const backdrop = document.getElementById('task-drawer-backdrop');

  // Populate fields
  document.getElementById('drawer-task-title').value = task.title || '';
  document.getElementById('drawer-task-desc').value = task.description || '';
  document.getElementById('drawer-task-team').value = task.team || 'UX/UI Designer';
  document.getElementById('drawer-task-priority').value = task.priority || 'Trung bình';
  document.getElementById('drawer-task-status').value = task.status || 'Chưa làm';
  document.getElementById('drawer-task-due').value = task.due_date || REF_DATE;

  // Populate projects select
  const projectSelect = document.getElementById('drawer-task-project');
  projectSelect.innerHTML = state.projects.map(p => `
    <option value="${p.id}" ${p.id === task.project_id ? 'selected' : ''}>${p.code} - ${p.name}</option>
  `).join('');

  // Populate members select
  const assigneeSelect = document.getElementById('drawer-task-assignee');
  assigneeSelect.innerHTML = state.members.map(m => `
    <option value="${m.id}" ${m.id === task.assignee_id ? 'selected' : ''}>${m.full_name} (${m.role})</option>
  `).join('');

  // Status Chip & Toggle Complete button
  updateDrawerStatusVisuals(task.status);

  // Render Subtasks
  renderDrawerSubtasks(task.subtasks || []);

  drawer.classList.add('open');
  backdrop.classList.add('open');
}

function closeTaskDrawer() {
  document.getElementById('task-drawer').classList.remove('open');
  document.getElementById('task-drawer-backdrop').classList.remove('open');
  state.selectedTaskId = null;
}

function updateDrawerStatusVisuals(status) {
  const chip = document.getElementById('drawer-status-chip');
  const btn = document.getElementById('drawer-btn-complete-toggle');
  const meta = getStatusStyle(status);

  chip.textContent = status;
  chip.style.color = meta.color;
  chip.style.backgroundColor = meta.bg;
  chip.style.border = `1px solid ${meta.border}`;

  if (status === 'Hoàn thành') {
    btn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> <span>Mở lại công việc</span>`;
  } else {
    btn.innerHTML = `<i class="fa-regular fa-circle-check"></i> <span>Đánh dấu hoàn thành</span>`;
  }
}

function renderDrawerSubtasks(subtasks) {
  const container = document.getElementById('drawer-subtasks-list');
  const counter = document.getElementById('drawer-subtasks-count');
  if (!container) return;

  const doneCount = subtasks.filter(s => s.completed).length;
  if (counter) counter.textContent = `${doneCount}/${subtasks.length}`;

  container.innerHTML = subtasks.map((st, idx) => `
    <div class="subtask-item-row ${st.completed ? 'completed' : ''}" data-idx="${idx}">
      <input type="checkbox" ${st.completed ? 'checked' : ''} data-action="toggle-subtask" data-idx="${idx}">
      <input type="text" value="${st.title}" data-action="edit-subtask-title" data-idx="${idx}">
      <button class="btn-icon" style="width: 22px; height: 22px; border: none; background: transparent;" data-action="delete-subtask" data-idx="${idx}">
        <i class="fa-solid fa-xmark" style="color: var(--text-muted); font-size: 11px;"></i>
      </button>
    </div>
  `).join('');
}

async function saveTaskDrawerChanges() {
  if (!state.selectedTaskId) return;

  const task = state.tasks.find(t => t.id === state.selectedTaskId);
  if (!task) return;

  task.title = document.getElementById('drawer-task-title').value.trim() || task.title;
  task.description = document.getElementById('drawer-task-desc').value.trim();
  task.project_id = document.getElementById('drawer-task-project').value;
  task.assignee_id = document.getElementById('drawer-task-assignee').value;
  task.team = document.getElementById('drawer-task-team').value;
  task.priority = document.getElementById('drawer-task-priority').value;
  task.status = document.getElementById('drawer-task-status').value;
  task.due_date = document.getElementById('drawer-task-due').value;

  // Harvest subtasks from list
  const subRows = document.querySelectorAll('#drawer-subtasks-list .subtask-item-row');
  const newSubtasks = [];
  subRows.forEach(row => {
    const chk = row.querySelector('input[type="checkbox"]');
    const txt = row.querySelector('input[type="text"]');
    if (txt && txt.value.trim()) {
      newSubtasks.push({
        id: 'st_' + Math.random().toString(36).substr(2, 6),
        title: txt.value.trim(),
        completed: chk.checked
      });
    }
  });
  task.subtasks = newSubtasks;
  task.updated_at = new Date().toISOString();

  await syncMutation('tasks', 'update', task);
  showToast('Đã lưu thay đổi công việc thành công!', 'success');
  renderApp();
  closeTaskDrawer();
}

// =============================================================================
// MODAL: CREATE / EDIT TASK
// =============================================================================
function openCreateTaskModal() {
  const modal = document.getElementById('modal-task-overlay');
  
  // Reset form
  document.getElementById('task-form-title').value = '';
  document.getElementById('task-form-desc').value = '';
  document.getElementById('task-form-due-date').value = REF_DATE;
  document.getElementById('task-form-start-date').value = REF_DATE;
  document.getElementById('task-form-priority').value = 'Trung bình';
  document.getElementById('task-form-status').value = 'Chưa làm';

  // Projects dropdown
  const projSelect = document.getElementById('task-form-project');
  projSelect.innerHTML = state.projects.map(p => `
    <option value="${p.id}">${p.code} - ${p.name}</option>
  `).join('');

  // Assignee dropdown (20 members)
  const assignSelect = document.getElementById('task-form-assignee');
  assignSelect.innerHTML = state.members.map(m => `
    <option value="${m.id}">${m.full_name} (${m.role} - ${m.position})</option>
  `).join('');

  modal.classList.add('open');
}

async function handleCreateTaskSubmit() {
  const title = document.getElementById('task-form-title').value.trim();
  const projectId = document.getElementById('task-form-project').value;
  const assigneeId = document.getElementById('task-form-assignee').value;
  const team = document.getElementById('task-form-team').value;
  const priority = document.getElementById('task-form-priority').value;
  const startDate = document.getElementById('task-form-start-date').value;
  const dueDate = document.getElementById('task-form-due-date').value;
  const status = document.getElementById('task-form-status').value;
  const description = document.getElementById('task-form-desc').value.trim();

  if (!title) {
    showToast('Vui lòng nhập tên công việc', 'error');
    return;
  }
  if (!dueDate) {
    showToast('Vui lòng chọn hạn chót', 'error');
    return;
  }

  const newTask = {
    id: 'tsk_' + Date.now().toString(36),
    project_id: projectId,
    title,
    description,
    assignee_id: assigneeId,
    team,
    status,
    priority,
    start_date: startDate,
    due_date: dueDate,
    subtasks: [],
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.tasks.unshift(newTask);
  await syncMutation('tasks', 'insert', newTask);

  showToast(`Đã tạo công việc "${title}" thành công!`, 'success');
  document.getElementById('modal-task-overlay').classList.remove('open');
  renderApp();
}

// =============================================================================
// MODAL: CREATE / EDIT PROJECT
// =============================================================================
function openProjectModal(projectId = null) {
  state.selectedProjectId = projectId;
  const modal = document.getElementById('modal-project-overlay');
  const titleEl = document.getElementById('modal-project-title');

  let project = null;
  if (projectId) {
    project = state.projects.find(p => p.id === projectId);
    titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--brand-primary);"></i> Chỉnh Sửa Dự Án: ${project.code}`;
  } else {
    titleEl.innerHTML = `<i class="fa-solid fa-rocket" style="color: var(--brand-primary);"></i> Tạo Dự Án Mới`;
  }

  document.getElementById('project-form-code').value = project ? project.code : 'VNE-PRD-' + (state.projects.length + 1).toString().padStart(2, '0');
  document.getElementById('project-form-name').value = project ? project.name : '';
  document.getElementById('project-form-kpi').value = project ? project.kpi : '';
  document.getElementById('project-form-status').value = project ? project.status : 'Đang triển khai';
  document.getElementById('project-form-start-date').value = project ? project.start_date : REF_DATE;
  document.getElementById('project-form-end-date').value = project ? project.end_date : '2026-12-31';

  // Render phases rows
  const phasesContainer = document.getElementById('project-phases-list');
  const phases = project && Array.isArray(project.phases) ? project.phases : [
    { id: 'p1', name: 'Nghiên cứu & UX Discovery', status: 'completed', deadline: '2026-09-30' },
    { id: 'p2', name: 'Thiết kế UI & Prototype', status: 'in_progress', deadline: '2026-10-31' }
  ];
  phasesContainer.innerHTML = phases.map(ph => `
    <div class="subtask-item-row phase-item-row">
      <input type="text" class="phase-name-input" value="${ph.name}" placeholder="Tên giai đoạn...">
      <select class="form-control phase-status-input" style="width: 130px; height: 28px; font-size: 11.5px;">
        <option value="pending" ${ph.status === 'pending' ? 'selected' : ''}>Chưa tới</option>
        <option value="in_progress" ${ph.status === 'in_progress' ? 'selected' : ''}>Đang làm</option>
        <option value="completed" ${ph.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
      </select>
      <input type="date" class="form-control phase-date-input" value="${ph.deadline || ''}" style="width: 130px; height: 28px; font-size: 11.5px;">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  // Render checklists rows (đã làm được vs còn tồn tại)
  const checklistContainer = document.getElementById('project-checklist-list');
  const checklists = project && Array.isArray(project.checklist) ? project.checklist : [
    { id: 'ck1', title: 'Hoàn tất khảo sát ý kiến độc giả', completed: true },
    { id: 'ck2', title: 'Tối ưu độ trễ API và hiệu suất máy chủ', completed: false }
  ];
  checklistContainer.innerHTML = checklists.map(ck => `
    <div class="subtask-item-row project-ck-row">
      <input type="checkbox" ${ck.completed ? 'checked' : ''} class="ck-completed-input" title="Đánh dấu đã làm được">
      <input type="text" class="ck-title-input" value="${ck.title}" placeholder="Mục checklist dự án...">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  // Render tools rows
  const toolsContainer = document.getElementById('project-tools-list');
  const tools = project && Array.isArray(project.tools) ? project.tools : [
    { name: 'Figma Design', url: 'https://figma.com' },
    { name: 'Jira Sprint', url: 'https://jira.internal' }
  ];
  toolsContainer.innerHTML = tools.map(tl => `
    <div class="subtask-item-row project-tool-row">
      <input type="text" class="tool-name-input" value="${tl.name}" placeholder="Tên công cụ (Figma, Jira, GA4...)" style="width: 150px;">
      <input type="text" class="tool-url-input" value="${tl.url}" placeholder="URL liên kết...">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');

  modal.classList.add('open');
}

async function handleProjectSubmit() {
  const code = document.getElementById('project-form-code').value.trim();
  const name = document.getElementById('project-form-name').value.trim();
  const kpi = document.getElementById('project-form-kpi').value.trim();
  const status = document.getElementById('project-form-status').value;
  const startDate = document.getElementById('project-form-start-date').value;
  const endDate = document.getElementById('project-form-end-date').value;

  if (!code || !name) {
    showToast('Vui lòng điền mã và tên dự án', 'error');
    return;
  }

  // Harvest phases
  const phaseRows = document.querySelectorAll('#project-phases-list .phase-item-row');
  const phases = [];
  phaseRows.forEach((r, idx) => {
    const pName = r.querySelector('.phase-name-input').value.trim();
    if (pName) {
      phases.push({
        id: 'p_' + (idx + 1),
        name: pName,
        status: r.querySelector('.phase-status-input').value,
        deadline: r.querySelector('.phase-date-input').value
      });
    }
  });

  // Harvest checklist
  const ckRows = document.querySelectorAll('#project-checklist-list .project-ck-row');
  const checklist = [];
  ckRows.forEach((r, idx) => {
    const ckTitle = r.querySelector('.ck-title-input').value.trim();
    if (ckTitle) {
      checklist.push({
        id: 'ck_' + (idx + 1),
        title: ckTitle,
        completed: r.querySelector('.ck-completed-input').checked
      });
    }
  });

  // Harvest tools
  const toolRows = document.querySelectorAll('#project-tools-list .project-tool-row');
  const tools = [];
  toolRows.forEach(r => {
    const tName = r.querySelector('.tool-name-input').value.trim();
    const tUrl = r.querySelector('.tool-url-input').value.trim();
    if (tName) {
      tools.push({ name: tName, url: tUrl });
    }
  });

  if (state.selectedProjectId) {
    // Update existing
    const prj = state.projects.find(p => p.id === state.selectedProjectId);
    if (prj) {
      prj.code = code;
      prj.name = name;
      prj.kpi = kpi;
      prj.status = status;
      prj.start_date = startDate;
      prj.end_date = endDate;
      prj.phases = phases;
      prj.checklist = checklist;
      prj.tools = tools;
      prj.updated_at = new Date().toISOString();

      await syncMutation('projects', 'update', prj);
      showToast(`Đã cập nhật dự án ${code} thành công!`, 'success');
    }
  } else {
    // Create new
    const newPrj = {
      id: 'proj_' + Date.now().toString(36),
      code,
      name,
      kpi,
      status,
      start_date: startDate,
      end_date: endDate,
      phases,
      checklist,
      tools,
      linked_projects: [],
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.projects.unshift(newPrj);
    await syncMutation('projects', 'insert', newPrj);
    showToast(`Đã tạo dự án ${code} thành công!`, 'success');
  }

  document.getElementById('modal-project-overlay').classList.remove('open');
  renderApp();
}

// =============================================================================
// MODAL: 20 MEMBERS CREDENTIALS DIRECTORY
// =============================================================================
function openCredentialsModal() {
  const modal = document.getElementById('modal-credentials-overlay');
  renderCredentialsTable();
  modal.classList.add('open');
}

function renderCredentialsTable() {
  const tbody = document.getElementById('credentials-table-body');
  const query = (document.getElementById('filter-cred-input')?.value || '').toLowerCase().trim();
  const roleFilter = document.getElementById('filter-cred-role')?.value || 'all';

  if (!tbody) return;

  const filtered = state.members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (query) {
      const match = m.full_name.toLowerCase().includes(query) ||
                    m.username.toLowerCase().includes(query) ||
                    m.position.toLowerCase().includes(query) ||
                    m.email.toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${m.avatar}" class="assignee-avatar" alt="${m.full_name}">
          <div>
            <div style="font-weight: 700; color: var(--text-main); font-size: 13px;">${m.full_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${m.level}</div>
          </div>
        </div>
      </td>
      <td><code style="font-family: var(--font-mono); font-weight: 600; color: #2563eb;">${m.username}</code></td>
      <td>
        <span style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-primary); background: var(--brand-light); padding: 3px 6px; border-radius: 4px;">
          ${m.password}
        </span>
      </td>
      <td>
        <div><span class="team-chip" style="background: rgba(99, 102, 241, 0.1); color: #4338ca;">${m.role}</span></div>
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 3px;">${m.position}</div>
      </td>
      <td style="font-size: 12px; color: var(--text-secondary);">${m.location}</td>
      <td style="font-size: 12px;">
        <div>${m.email}</div>
        <div style="color: var(--text-muted); font-size: 11px;">${m.phone || '09xx.xxx.xxx'}</div>
      </td>
      <td>
        <button class="btn-secondary" style="height: 28px; font-size: 11.5px; padding: 0 8px;" onclick="navigator.clipboard.writeText('${m.password}'); showToast('Đã copy mật khẩu của ${m.full_name}!', 'info')">
          <i class="fa-regular fa-copy"></i> Copy Pass
        </button>
      </td>
    </tr>
  `).join('');
}

// =============================================================================
// SOFT-DELETE & TRASH LOGIC
// =============================================================================
async function softDeleteTask(taskId) {
  const idx = state.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;

  const [task] = state.tasks.splice(idx, 1);
  task.is_deleted = true;
  task.updated_at = new Date().toISOString();

  state.deletedItems.unshift({
    type: 'task',
    item: task,
    deletedAt: new Date().toISOString()
  });

  await syncMutation('tasks', 'update', task);
  showToast(`Đã chuyển công việc "${task.title}" vào thùng rác`, 'info');
  renderApp();
}

async function softDeleteProject(projectId) {
  const idx = state.projects.findIndex(p => p.id === projectId);
  if (idx === -1) return;

  const [prj] = state.projects.splice(idx, 1);
  prj.is_deleted = true;
  prj.updated_at = new Date().toISOString();

  state.deletedItems.unshift({
    type: 'project',
    item: prj,
    deletedAt: new Date().toISOString()
  });

  await syncMutation('projects', 'update', prj);
  showToast(`Đã chuyển dự án "${prj.code}" vào thùng rác`, 'info');
  renderApp();
}

async function restoreDeletedItem(index) {
  if (index < 0 || index >= state.deletedItems.length) return;
  const [entry] = state.deletedItems.splice(index, 1);

  if (entry.type === 'task') {
    entry.item.is_deleted = false;
    entry.item.updated_at = new Date().toISOString();
    state.tasks.unshift(entry.item);
    await syncMutation('tasks', 'update', entry.item);
    showToast(`Đã khôi phục công việc "${entry.item.title}"!`, 'success');
  } else {
    entry.item.is_deleted = false;
    entry.item.updated_at = new Date().toISOString();
    state.projects.unshift(entry.item);
    await syncMutation('projects', 'update', entry.item);
    showToast(`Đã khôi phục dự án "${entry.item.code}"!`, 'success');
  }

  renderApp();
}

async function permanentDeleteItem(index) {
  if (index < 0 || index >= state.deletedItems.length) return;
  const [entry] = state.deletedItems.splice(index, 1);

  const table = entry.type === 'task' ? 'tasks' : 'projects';
  await syncMutation(table, 'delete', entry.item);
  showToast('Đã xóa vĩnh viễn mục này!', 'error');
  renderApp();
}

// =============================================================================
// DOM EVENT LISTENERS & SETUP
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadApplicationData();
  renderApp();

  // Navigation Items
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      const view = item.getAttribute('data-view');
      const sub = item.getAttribute('data-sub');

      state.currentView = view;
      state.filters.subFilter = sub || 'all';

      renderApp();
    });
  });

  // Sidebar Team Filter Shortcuts
  document.querySelectorAll('.sidebar-nav [data-filter-team]').forEach(item => {
    item.addEventListener('click', () => {
      const team = item.getAttribute('data-filter-team');
      state.currentView = 'tasks';
      state.filters.team = team;

      // Update filter pills UI
      document.querySelectorAll('[data-filter-team]').forEach(p => p.classList.remove('active'));
      const activePill = document.querySelector(`.filter-toolbar [data-filter-team="${team}"]`);
      if (activePill) activePill.classList.add('active');

      // Update sidebar nav active
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById('nav-all-tasks').classList.add('active');

      renderApp();
    });
  });

  // Pinned Projects click
  document.getElementById('sidebar-pinned-projects')?.addEventListener('click', (e) => {
    const item = e.target.closest('.sidebar-project-item');
    if (!item) return;
    const pid = item.getAttribute('data-project-id');
    state.currentView = 'tasks';
    state.filters.project = pid;
    renderApp();
  });

  // View Sub-Tabs (List vs Board)
  document.getElementById('tab-btn-list')?.addEventListener('click', () => {
    state.activeTab = 'list';
    document.getElementById('tab-btn-list').classList.add('active');
    document.getElementById('tab-btn-board').classList.remove('active');
    renderApp();
  });

  document.getElementById('tab-btn-board')?.addEventListener('click', () => {
    state.activeTab = 'board';
    document.getElementById('tab-btn-board').classList.add('active');
    document.getElementById('tab-btn-list').classList.remove('active');
    renderApp();
  });

  // Filter Pills: Date
  document.querySelectorAll('[data-filter-date]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-date]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const val = pill.getAttribute('data-filter-date');
      state.filters.date = val;

      const datePicker = document.getElementById('filter-custom-date-input');
      if (val === 'custom') {
        datePicker.style.display = 'inline-block';
        datePicker.focus();
      } else {
        datePicker.style.display = 'none';
      }

      renderApp();
    });
  });

  document.getElementById('filter-custom-date-input')?.addEventListener('change', (e) => {
    state.filters.customDate = e.target.value;
    renderApp();
  });

  // Filter Pills: Team
  document.querySelectorAll('.filter-toolbar [data-filter-team]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-toolbar [data-filter-team]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filters.team = pill.getAttribute('data-filter-team');
      renderApp();
    });
  });

  // Filter Pills: Status
  document.querySelectorAll('[data-filter-status]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-status]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filters.status = pill.getAttribute('data-filter-status');
      renderApp();
    });
  });

  // Reset Filters Button
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    state.filters.date = 'all';
    state.filters.team = 'all';
    state.filters.status = 'all';
    state.filters.search = '';
    state.filters.project = 'all';
    state.filters.subFilter = 'all';

    // Reset pills UI
    document.querySelectorAll('[data-filter-date]').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-filter-date="all"]').classList.add('active');

    document.querySelectorAll('.filter-toolbar [data-filter-team]').forEach(p => p.classList.remove('active'));
    document.querySelector('.filter-toolbar [data-filter-team="all"]').classList.add('active');

    document.querySelectorAll('[data-filter-status]').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-filter-status="all"]').classList.add('active');

    document.getElementById('global-search-input').value = '';
    document.getElementById('search-clear-btn').style.display = 'none';
    document.getElementById('filter-custom-date-input').style.display = 'none';

    showToast('Đã đặt lại tất cả bộ lọc', 'info');
    renderApp();
  });

  // Global Search
  const searchInput = document.getElementById('global-search-input');
  const searchClear = document.getElementById('search-clear-btn');
  searchInput?.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    searchClear.style.display = e.target.value ? 'block' : 'none';
    renderApp();
  });

  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    searchClear.style.display = 'none';
    renderApp();
  });

  // Keyboard shortcut '/' to search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Modal Open Buttons
  document.getElementById('btn-create-task')?.addEventListener('click', openCreateTaskModal);
  document.getElementById('btn-create-project')?.addEventListener('click', () => openProjectModal(null));
  document.getElementById('btn-user-credentials')?.addEventListener('click', openCredentialsModal);

  // Modal Close Handlers
  document.getElementById('modal-task-close')?.addEventListener('click', () => document.getElementById('modal-task-overlay').classList.remove('open'));
  document.getElementById('modal-task-cancel')?.addEventListener('click', () => document.getElementById('modal-task-overlay').classList.remove('open'));
  document.getElementById('modal-task-submit')?.addEventListener('click', handleCreateTaskSubmit);

  document.getElementById('modal-project-close')?.addEventListener('click', () => document.getElementById('modal-project-overlay').classList.remove('open'));
  document.getElementById('modal-project-cancel')?.addEventListener('click', () => document.getElementById('modal-project-overlay').classList.remove('open'));
  document.getElementById('modal-project-submit')?.addEventListener('click', handleProjectSubmit);

  document.getElementById('modal-credentials-close')?.addEventListener('click', () => document.getElementById('modal-credentials-overlay').classList.remove('open'));
  document.getElementById('modal-credentials-ok')?.addEventListener('click', () => document.getElementById('modal-credentials-overlay').classList.remove('open'));

  // Project Modal Dynamic Row Adders
  document.getElementById('btn-add-phase-row')?.addEventListener('click', () => {
    const list = document.getElementById('project-phases-list');
    const row = document.createElement('div');
    row.className = 'subtask-item-row phase-item-row';
    row.innerHTML = `
      <input type="text" class="phase-name-input" placeholder="Tên giai đoạn mới...">
      <select class="form-control phase-status-input" style="width: 130px; height: 28px; font-size: 11.5px;">
        <option value="pending">Chưa tới</option>
        <option value="in_progress">Đang làm</option>
        <option value="completed">Hoàn thành</option>
      </select>
      <input type="date" class="form-control phase-date-input" style="width: 130px; height: 28px; font-size: 11.5px;">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    list.appendChild(row);
  });

  document.getElementById('btn-add-checklist-row')?.addEventListener('click', () => {
    const list = document.getElementById('project-checklist-list');
    const row = document.createElement('div');
    row.className = 'subtask-item-row project-ck-row';
    row.innerHTML = `
      <input type="checkbox" class="ck-completed-input" title="Đánh dấu đã làm được">
      <input type="text" class="ck-title-input" placeholder="Mục checklist mới...">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    list.appendChild(row);
  });

  document.getElementById('btn-add-tool-row')?.addEventListener('click', () => {
    const list = document.getElementById('project-tools-list');
    const row = document.createElement('div');
    row.className = 'subtask-item-row project-tool-row';
    row.innerHTML = `
      <input type="text" class="tool-name-input" placeholder="Tên công cụ..." style="width: 150px;">
      <input type="text" class="tool-url-input" placeholder="https://...">
      <button type="button" class="btn-icon" style="width: 24px; height: 24px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;
    list.appendChild(row);
  });

  // Filter Credentials in Modal
  document.getElementById('filter-cred-input')?.addEventListener('input', renderCredentialsTable);
  document.getElementById('filter-cred-role')?.addEventListener('change', renderCredentialsTable);

  // Drawer Handlers
  document.getElementById('drawer-btn-close')?.addEventListener('click', closeTaskDrawer);
  document.getElementById('task-drawer-backdrop')?.addEventListener('click', closeTaskDrawer);
  document.getElementById('drawer-btn-save')?.addEventListener('click', saveTaskDrawerChanges);

  document.getElementById('drawer-btn-complete-toggle')?.addEventListener('click', async () => {
    if (!state.selectedTaskId) return;
    const task = state.tasks.find(t => t.id === state.selectedTaskId);
    if (!task) return;
    task.status = task.status === 'Hoàn thành' ? 'Đang làm' : 'Hoàn thành';
    task.updated_at = new Date().toISOString();
    updateDrawerStatusVisuals(task.status);
    document.getElementById('drawer-task-status').value = task.status;
    await syncMutation('tasks', 'update', task);
    showToast(`Đã chuyển trạng thái sang "${task.status}"`, 'success');
    renderApp();
  });

  document.getElementById('drawer-btn-delete')?.addEventListener('click', async () => {
    if (!state.selectedTaskId) return;
    const tid = state.selectedTaskId;
    closeTaskDrawer();
    await softDeleteTask(tid);
  });

  // Drawer Add Subtask Button
  document.getElementById('drawer-btn-add-subtask')?.addEventListener('click', () => {
    const list = document.getElementById('drawer-subtasks-list');
    const row = document.createElement('div');
    row.className = 'subtask-item-row';
    row.innerHTML = `
      <input type="checkbox">
      <input type="text" placeholder="Nhập việc cần làm...">
      <button class="btn-icon" style="width: 22px; height: 22px; border: none; background: transparent;" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark" style="color: var(--text-muted); font-size: 11px;"></i>
      </button>
    `;
    list.appendChild(row);
    row.querySelector('input[type="text"]').focus();
  });

  // Global Click Delegations (Tables, Kanban Cards, Trash Actions)
  document.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    const taskId = actionEl.getAttribute('data-task-id');
    const prjId = actionEl.getAttribute('data-project-id');
    const idx = parseInt(actionEl.getAttribute('data-index'), 10);

    if (action === 'open-drawer' && taskId) {
      openTaskDrawer(taskId);
    } else if (action === 'toggle-status' && taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = task.status === 'Hoàn thành' ? 'Đang làm' : 'Hoàn thành';
        task.updated_at = new Date().toISOString();
        await syncMutation('tasks', 'update', task);
        showToast(task.status === 'Hoàn thành' ? 'Đã hoàn thành công việc!' : 'Đã mở lại công việc!', 'success');
        renderApp();
      }
    } else if (action === 'delete-task' && taskId) {
      e.stopPropagation();
      await softDeleteTask(taskId);
    } else if (action === 'edit-project' && prjId) {
      openProjectModal(prjId);
    } else if (action === 'delete-project' && prjId) {
      await softDeleteProject(prjId);
    } else if (action === 'filter-project-tasks' && prjId) {
      state.currentView = 'tasks';
      state.filters.project = prjId;
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
      document.getElementById('nav-all-tasks').classList.add('active');
      renderApp();
    } else if (action === 'restore-trash') {
      await restoreDeletedItem(idx);
    } else if (action === 'delete-forever') {
      await permanentDeleteItem(idx);
    }
  });

  // Empty Trash
  document.getElementById('btn-empty-trash')?.addEventListener('click', async () => {
    if (state.deletedItems.length === 0) return;
    if (confirm('Bạn có chắc chắn muốn dọn sạch thùng rác vĩnh viễn?')) {
      for (const entry of state.deletedItems) {
        const table = entry.type === 'task' ? 'tasks' : 'projects';
        await syncMutation(table, 'delete', entry.item);
      }
      state.deletedItems = [];
      saveToLocalStorage();
      showToast('Đã xóa sạch thùng rác', 'info');
      renderApp();
    }
  });

  // Dark / Light Theme Toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn?.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    themeBtn.innerHTML = state.theme === 'dark' ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>' : '<i class="fa-solid fa-moon"></i>';
  });

  // Export Members CSV
  document.getElementById('btn-export-members-csv')?.addEventListener('click', () => {
    let csv = '\uFEFFHọ Tên,Username,Password,Chức Vụ,Nhóm,Cấp Bậc,Email,Số Điện Thoại,Văn Phòng,Tình Trạng\n';
    state.members.forEach(m => {
      csv += `"${m.full_name}","${m.username}","${m.password}","${m.position}","${m.role}","${m.level}","${m.email}","${m.phone}","${m.location}","${m.work_status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `VnExpress_Product_Team_${REF_DATE}.csv`;
    link.click();
    showToast('Đã xuất file CSV 20 nhân sự thành công!', 'success');
  });

  // Config test button
  document.getElementById('btn-test-supabase')?.addEventListener('click', async () => {
    showToast('Đang kiểm tra kết nối Supabase...', 'info');
    try {
      if (supabaseClient) {
        const res = await supabaseClient.from('members').select('count', { count: 'exact' });
        if (!res.error) {
          showToast(`Kết nối Supabase thành công! (Tìm thấy ${res.count} nhân sự)`, 'success');
          updateSyncStatus('online', 'Supabase Cloud');
          return;
        }
      }
      showToast('Không thể kết nối Supabase, đang dùng bộ nhớ đệm', 'error');
    } catch (e) {
      showToast('Lỗi kết nối Supabase: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-resync-supabase')?.addEventListener('click', async () => {
    await loadApplicationData();
    renderApp();
    showToast('Đã đồng bộ lại dữ liệu với Supabase!', 'success');
  });

  // Save config button
  document.getElementById('btn-save-config')?.addEventListener('click', () => {
    const editor = document.getElementById('cfg-json-editor');
    try {
      const parsed = JSON.parse(editor.value);
      window.APP_CONFIG = parsed;
      showToast('Đã lưu cấu hình mới vào bộ nhớ!', 'success');
    } catch (err) {
      showToast('JSON cấu hình không hợp lệ: ' + err.message, 'error');
    }
  });
});
