/**
 * ========================================
 * Banquet Master v7.0 - Main Application
 * Dependencies: config.js, utils.js, data.js
 * ========================================
 */

        // ============ APPLICATION ============
        const app = {
            data: null,
            view: 'dashboard',
            focusedCell: null,
            syncTimeout: null,
            syncInProgress: false,

            async init() {
                this.load();

                // v7.0: Check authentication before initializing app
                if (!this.checkAuth()) {
                    this.showLoginScreen();
                    return;
                }

                this.hideLoginScreen();
                this.showUserInfo();
                this.setupNav();
                this.setupInputSync();
                this.setupThemeToggle();
                this.setupKeyboardNav();
                this.setupOptimisticSync();
                this.setupLoginHandlers();
                this.render();
                await this.cloudDownload(true);
            },

            load() {
                // v7.0: Changed key from bm_v6 to bm_v7
                const raw = localStorage.getItem('bm_v7');
                if (raw) {
                    try {
                        this.data = JSON.parse(raw);
                        if (!Array.isArray(this.data.categories)) throw new Error();
                    } catch {
                        this.data = JSON.parse(JSON.stringify(DEFAULTS));
                    }
                } else {
                    // Try to migrate from v6 
                    const v6Raw = localStorage.getItem('bm_v6');
                    if (v6Raw) {
                        try {
                            const v6Data = JSON.parse(v6Raw);
                            this.data = { ...JSON.parse(JSON.stringify(DEFAULTS)), ...v6Data };
                            this.data.version = '7.0';
                            this.save();
                        } catch {
                            this.data = JSON.parse(JSON.stringify(DEFAULTS));
                        }
                    } else {
                        this.data = JSON.parse(JSON.stringify(DEFAULTS));
                    }
                }

                // Ensure all fields exist
                if (!this.data.templates) this.data.templates = [];
                if (!this.data.session.tables) this.data.session.tables = 1;
                if (!this.data.session.guests) this.data.session.guests = 10;
                if (!this.data.session.kitchenNotes) this.data.session.kitchenNotes = '';
                if (this.data.darkMode === undefined) this.data.darkMode = false;

                // v7.0: Ensure user system exists
                if (!this.data.version) this.data.version = '7.0';
                if (!this.data.users) this.data.users = DEFAULTS.users;
                if (this.data.currentUser === undefined) this.data.currentUser = null;

                // Apply dark mode
                if (this.data.darkMode) {
                    document.body.classList.add('dark-mode');
                }
            },

            save() {
                localStorage.setItem('bm_v7', JSON.stringify(this.data));
                // Optimistic UI: Save locally first, then sync to cloud
                this.debouncedCloudSync();
            },

            // ============ OPTIMISTIC UI SYNC ============
            setupOptimisticSync() {
                // Auto-sync every 5 minutes if there are changes
                setInterval(() => {
                    if (!this.syncInProgress) {
                        this.cloudUpload(true); // silent auto-sync
                    }
                }, 5 * 60 * 1000);
            },

            debouncedCloudSync() {
                // Clear existing timeout
                if (this.syncTimeout) {
                    clearTimeout(this.syncTimeout);
                }

                // Set new timeout - batch multiple saves into one sync
                this.syncTimeout = setTimeout(() => {
                    if (!this.syncInProgress) {
                        this.cloudUpload(true); // silent background sync
                    }
                }, 2000); // 2 second debounce
            },

            // ============ v7.0: AUTHENTICATION SYSTEM ============
            hashPassword(password) {
                // Use CryptoJS SHA256 for password hashing
                return CryptoJS.SHA256(password).toString();
            },

            checkAuth() {
                // Check if user is logged in
                return this.data.currentUser !== null;
            },

            login() {
                const username = document.getElementById('login-username').value.trim();
                const password = document.getElementById('login-password').value;
                const errorEl = document.getElementById('login-error');

                if (!username || !password) {
                    errorEl.textContent = '请输入用户名和密码';
                    errorEl.classList.add('show');
                    setTimeout(() => errorEl.classList.remove('show'), 3000);
                    return;
                }

                // Find user
                const user = this.data.users.find(u => u.username === username);
                if (!user) {
                    errorEl.textContent = '用户名不存在';
                    errorEl.classList.add('show');
                    setTimeout(() => errorEl.classList.remove('show'), 3000);
                    return;
                }

                // Verify password
                const passwordHash = this.hashPassword(password);
                if (user.passwordHash !== passwordHash) {
                    errorEl.textContent = '密码错误';
                    errorEl.classList.add('show');
                    setTimeout(() => errorEl.classList.remove('show'), 3000);
                    return;
                }

                // Login successful
                this.data.currentUser = {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    email: user.email
                };
                this.save();

                // Hide login screen and show app
                this.hideLoginScreen();
                this.showUserInfo();

                // Initialize app components
                this.setupNav();
                this.setupInputSync();
                this.setupThemeToggle();
                this.setupKeyboardNav();
                this.setupOptimisticSync();
                this.render();
                this.cloudDownload(true);

                this.toast(`🎉 欢迎回来，${user.name}！`);
            },

            logout() {
                if (!confirm('确定要退出登录吗？')) return;

                this.data.currentUser = null;
                this.save();

                // Show login screen
                this.showLoginScreen();
                this.toast('已安全退出登录');

                // Clear user info from header
                const userInfoEl = document.getElementById('user-info-container');
                if (userInfoEl) userInfoEl.innerHTML = '';
            },

            showLoginScreen() {
                const loginScreen = document.getElementById('login-screen');
                const app = document.getElementById('app');

                loginScreen.classList.remove('hidden');
                if (app) app.style.display = 'none';

                // Clear input fields
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                document.getElementById('login-error').classList.remove('show');
            },

            hideLoginScreen() {
                const loginScreen = document.getElementById('login-screen');
                const app = document.getElementById('app');

                loginScreen.classList.add('hidden');
                if (app) app.style.display = 'grid';
            },

            showUserInfo() {
                const user = this.data.currentUser;
                if (!user) return;

                // Find or create user info container in header
                let container = document.getElementById('user-info-container');
                if (!container) {
                    // Insert before theme toggle
                    const headerActions = document.querySelector('.header-actions');
                    container = document.createElement('div');
                    container.id = 'user-info-container';
                    headerActions.insertBefore(container, headerActions.firstChild);
                }

                // Get initials for avatar
                const initials = user.name.substring(0, 2).toUpperCase();
                const roleLabel = {
                    'admin': '管理员',
                    'manager': '经理',
                    'user': '用户'
                }[user.role] || '用户';

                container.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-details">
                            <div class="user-name">${user.name}</div>
                            <div class="user-role">${roleLabel}</div>
                        </div>
                        <button class="logout-btn" onclick="app.logout()">退出</button>
                    </div>
                `;

                // Set body class based on role for CSS control
                document.body.classList.remove('admin-role', 'manager-role', 'user-role');
                document.body.classList.add(`${user.role}-role`);
            },

            setupLoginHandlers() {
                // Allow Enter key to submit login
                const passwordInput = document.getElementById('login-password');
                if (passwordInput && !passwordInput.dataset.handlerBound) {
                    passwordInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.login();
                        }
                    });
                    passwordInput.dataset.handlerBound = 'true';
                }

                const usernameInput = document.getElementById('login-username');
                if (usernameInput && !usernameInput.dataset.handlerBound) {
                    usernameInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            document.getElementById('login-password').focus();
                        }
                    });
                    usernameInput.dataset.handlerBound = 'true';
                }
            },

            // ============ THEME ============
            setupThemeToggle() {
                document.getElementById('theme-toggle').onclick = () => {
                    this.data.darkMode = !this.data.darkMode;
                    document.body.classList.toggle('dark-mode');
                    document.getElementById('theme-toggle').textContent = this.data.darkMode ? '☀️' : '🌙';
                    this.save();
                    this.toast(this.data.darkMode ? '🌙 深色模式' : '☀️ 浅色模式');
                };
                // Set initial icon
                document.getElementById('theme-toggle').textContent = this.data.darkMode ? '☀️' : '🌙';
            },

            // ============ NAVIGATION ============
            setupNav() {
                document.querySelectorAll('.nav-item[data-view]').forEach(el => {
                    el.onclick = () => this.nav(el.dataset.view);
                });
            },

            nav(view) {
                this.view = view;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById(`view-${view}`)?.classList.add('active');

                const titles = {
                    dashboard: '智能仪表盘',
                    menu: '宴请拟单',
                    fruit: '水果采购',
                    settings: '系统设置'
                };
                document.getElementById('view-title').textContent = titles[view] || view;

                this.render();
            },

            // ============ INPUT SYNC ============
            setupInputSync() {
                ['inp-date', 'inp-dept', 'inp-room', 'inp-tables'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.oninput = (e) => {
                            const key = id.replace('inp-', '');
                            this.data.session[key] = key === 'tables' ? parseInt(e.target.value) || 1 : e.target.value;
                            this.save();
                            this.updateCostSummary();
                        };
                    }
                });

                const notesEl = document.getElementById('kitchen-notes');
                if (notesEl) {
                    notesEl.oninput = (e) => {
                        this.data.session.kitchenNotes = e.target.value;
                        this.save();
                    };
                }

                // Supplier name editing
                ['sup-0', 'sup-1', 'sup-2'].forEach((id, idx) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.onblur = () => {
                            this.data.supplierNames[idx] = el.textContent.trim() || `供应商 ${String.fromCharCode(65 + idx)}`;
                            this.save();
                            this.renderFruit();
                        };
                    }
                });
            },

            // ============ CALENDAR ============
            renderCalendar() {
                const grid = document.getElementById('calendar-grid');
                const title = document.getElementById('calendar-title');
                const { calendarYear: year, calendarMonth: month } = this.data;

                title.textContent = `${year}年${month + 1}月`;

                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startPad = firstDay.getDay();
                const totalDays = lastDay.getDate();
                const today = new Date().toISOString().split('T')[0];

                // Archive map
                const archiveMap = {};
                this.data.archives.forEach(a => {
                    const d = a.session?.date;
                    if (d) {
                        if (!archiveMap[d]) archiveMap[d] = [];
                        archiveMap[d].push(a.session.dept || '未命名');
                    }
                });

                let html = ['日', '一', '二', '三', '四', '五', '六']
                    .map(d => `<div class="calendar-weekday">${d}</div>`)
                    .join('');

                // Previous month padding
                const prevMonth = new Date(year, month, 0);
                for (let i = startPad - 1; i >= 0; i--) {
                    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${prevMonth.getDate() - i}</div></div>`;
                }

                // Current month
                for (let d = 1; d <= totalDays; d++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isToday = dateStr === today;
                    const events = archiveMap[dateStr] || [];

                    html += `
                        <div class="calendar-day ${isToday ? 'today' : ''}" onclick="app.showDayDetail('${dateStr}')">
                            <div class="calendar-day-number">${d}</div>
                            ${events.slice(0, 2).map(e => `<div class="calendar-event">${e}</div>`).join('')}
                        </div>
                    `;
                }

                // Next month padding
                const endPad = (7 - (startPad + totalDays) % 7) % 7;
                for (let i = 1; i <= endPad; i++) {
                    html += `<div class="calendar-day other-month"><div class="calendar-day-number">${i}</div></div>`;
                }

                grid.innerHTML = html;
            },

            prevMonth() {
                this.data.calendarMonth--;
                if (this.data.calendarMonth < 0) {
                    this.data.calendarMonth = 11;
                    this.data.calendarYear--;
                }
                this.save();
                this.renderCalendar();
            },

            nextMonth() {
                this.data.calendarMonth++;
                if (this.data.calendarMonth > 11) {
                    this.data.calendarMonth = 0;
                    this.data.calendarYear++;
                }
                this.save();
                this.renderCalendar();
            },

            showDayDetail(dateStr) {
                const archives = this.data.archives.filter(a => a.session?.date === dateStr);
                if (!archives.length) {
                    this.openModal('detail', `📅 ${dateStr}`, '<p style="color:var(--text-secondary)">当日暂无归档记录</p>');
                    return;
                }

                let html = archives.map(a => {
                    const dishes = a.selectedIds.map(sid => a.items.find(i => i.id === sid)?.name).filter(Boolean);
                    return `
                        <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--border)">
                            <div style="font-weight:600; margin-bottom:8px">${a.session.dept || '未命名'} - ${a.session.room || '未指定包厢'}</div>
                            <div style="font-size:12px; color:var(--text-secondary)">桌数: ${a.session.tables || 1} | 菜品: ${dishes.length}道</div>
                            <div style="margin-top:8px; font-size:13px">${dishes.join(', ') || '无已选菜品'}</div>
                        </div>
                    `;
                }).join('');

                this.openModal('detail', `📅 ${dateStr}`, html);
            },

            newSession() {
                this.data.session.date = new Date().toISOString().split('T')[0];
                this.data.session.dept = '';
                this.data.session.room = '';
                this.data.selectedIds = [];
                this.data.session.kitchenNotes = '';
                this.save();
                this.nav('menu');
                this.toast('已创建今日新菜单');
            },

            // ============ DASHBOARD STATS ============
            renderDashboard() {
                this.renderCalendar();

                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                // Filter archives for current month
                const monthArchives = this.data.archives.filter(a => {
                    const archiveDate = a.session?.date || '';
                    return archiveDate.startsWith(currentMonth);
                });

                // Count
                document.getElementById('stat-count').textContent = monthArchives.length;

                // Budget (sum of fruit costs)
                let totalBudget = 0;
                monthArchives.forEach(a => {
                    if (a.fruit && a.session?.guests) {
                        a.fruit.forEach(f => {
                            const total = U.round(f.perCapita * a.session.guests);
                            const winIdx = U.minIdx(f.prices);
                            if (winIdx > -1) {
                                totalBudget += U.round(total * f.prices[winIdx]);
                            }
                        });
                    }
                });
                document.getElementById('stat-budget').textContent = `¥${U.round(totalBudget)}`;

                // Top department
                const deptCount = {};
                monthArchives.forEach(a => {
                    const dept = a.session?.dept || '未命名';
                    deptCount[dept] = (deptCount[dept] || 0) + 1;
                });
                let topDept = '—';
                let maxCount = 0;
                for (const dept in deptCount) {
                    if (deptCount[dept] > maxCount) {
                        maxCount = deptCount[dept];
                        topDept = dept;
                    }
                }
                document.getElementById('stat-dept').textContent = topDept;
            },

            // ============ MENU ============
            renderMenu() {
                document.getElementById('inp-date').value = this.data.session.date;
                document.getElementById('inp-dept').value = this.data.session.dept;
                document.getElementById('inp-room').value = this.data.session.room;
                document.getElementById('inp-tables').value = this.data.session.tables;
                document.getElementById('kitchen-notes').value = this.data.session.kitchenNotes || '';

                const container = document.getElementById('menu-renderer');
                container.innerHTML = '';

                this.data.categories.forEach(cat => {
                    const section = document.createElement('div');
                    section.className = 'menu-section';

                    const items = this.data.items.filter(i => i.cid === cat.id);

                    section.innerHTML = `
                        <div class="menu-section-header">
                            <span class="menu-section-title">${cat.name}</span>
                            <button class="btn btn-sm btn-secondary" onclick="app.addItem('${cat.id}')">+ 添加</button>
                        </div>
                        <div class="menu-grid" data-cid="${cat.id}"></div>
                    `;

                    const grid = section.querySelector('.menu-grid');

                    items.forEach(item => {
                        const isSel = this.data.selectedIds.includes(item.id);
                        const card = document.createElement('div');
                        card.className = `menu-card ${isSel ? 'selected' : ''}`;
                        card.dataset.id = item.id;
                        card.innerHTML = `
                            <div class="checkbox">${isSel ? '✓' : ''}</div>
                            <span class="name">${item.name}</span>
                            <span class="price">¥${item.price || 0}</span>
                        `;
                        card.onclick = () => this.toggleSelect(item.id);
                        grid.appendChild(card);
                    });

                    container.appendChild(section);
                });

                this.updateCostSummary();
            },

            toggleSelect(id) {
                const idx = this.data.selectedIds.indexOf(id);
                if (idx > -1) this.data.selectedIds.splice(idx, 1);
                else this.data.selectedIds.push(id);
                this.save();
                this.renderMenu();
            },

            addItem(cid) {
                const name = prompt('输入新菜品名称:');
                if (name?.trim()) {
                    const price = parseFloat(prompt('输入估算单价 (¥):', '30') || 30);
                    this.data.items.push({
                        id: U.id(),
                        cid,
                        name: name.trim(),
                        price: U.round(price)
                    });
                    this.save();
                    this.renderMenu();
                }
            },

            updateCostSummary() {
                let totalCost = 0;
                this.data.selectedIds.forEach(sid => {
                    const item = this.data.items.find(i => i.id === sid);
                    if (item) totalCost += (item.price || 0);
                });

                const tables = this.data.session.tables || 1;
                document.getElementById('cost-per-table').textContent = `¥${U.round(totalCost)}`;
                document.getElementById('cost-total').textContent = `¥${U.round(totalCost * tables)}`;
            },

            // ============ TEMPLATE SYSTEM ============
            saveTemplate() {
                const name = prompt('模板名称:', `套餐-${new Date().toLocaleDateString()}`);
                if (!name?.trim()) return;

                this.data.templates.push({
                    id: U.id(),
                    name: name.trim(),
                    selectedIds: [...this.data.selectedIds],
                    createdAt: new Date().toISOString()
                });
                this.save();
                this.toast('✅ 模板已保存');
            },

            loadTemplate() {
                if (!this.data.templates.length) {
                    this.toast('⚠️ 暂无模板');
                    return;
                }

                let html = this.data.templates.map(t => `
                    <div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:10px; cursor:pointer; transition:all 0.2s;"
                         onmouseover="this.style.borderColor='var(--accent)'"
                         onmouseout="this.style.borderColor='var(--border)'"
                         onclick="app.applyTemplate('${t.id}')">
                        <div style="font-weight:600; margin-bottom:4px">${t.name}</div>
                        <div style="font-size:12px; color:var(--text-secondary)">${t.selectedIds.length} 道菜品</div>
                    </div>
                `).join('');

                this.openModal('template', '⚡ 选择模板', html);
            },

            applyTemplate(tid) {
                const template = this.data.templates.find(t => t.id === tid);
                if (!template) return;

                this.data.selectedIds = [...template.selectedIds];
                this.save();
                this.closeModal('template');
                this.renderMenu();
                this.toast(`✅ 已加载模板: ${template.name}`);
            },

            // ============ ARCHIVE ============
            archiveCurrent() {
                const snapshot = {
                    id: U.id(),
                    timestamp: new Date().toISOString(),
                    session: { ...this.data.session },
                    selectedIds: [...this.data.selectedIds],
                    items: JSON.parse(JSON.stringify(this.data.items)),
                    fruit: JSON.parse(JSON.stringify(this.data.fruit))
                };
                this.data.archives.unshift(snapshot);
                this.save();
                this.toast('✅ 已归档到历史记录');
                this.renderCalendar();
            },

            // ============ FRUIT TABLE ============
            renderFruit() {
                const guests = this.data.session.guests || 10;
                document.getElementById('fruit-guests').textContent = guests;

                const tbody = document.getElementById('fruit-tbody');
                tbody.innerHTML = '';

                const all = [...this.data.fruit, { id: '__new__', name: '', perCapita: 0.1, prices: [0, 0, 0] }];

                all.forEach((f, idx) => {
                    const isNew = f.id === '__new__';
                    const total = isNew ? 0 : U.round(f.perCapita * guests);
                    const winIdx = U.minIdx(f.prices);
                    const winPrice = winIdx > -1 ? f.prices[winIdx] : 0;
                    const winName = winIdx > -1 ? this.data.supplierNames[winIdx] : '—';

                    const tr = document.createElement('tr');
                    tr.dataset.row = idx;

                    tr.innerHTML = `
                        <td><input type="text" value="${f.name}" placeholder="+ 新增水果" data-field="name" data-row="${idx}"></td>
                        <td><input type="number" step="0.1" value="${isNew ? '' : f.perCapita}" data-field="perCapita" data-row="${idx}" data-col="1"></td>
                        <td style="font-weight:600">${isNew ? '—' : total}</td>
                        ${f.prices.map((p, i) => `
                            <td class="admin-only ${i === winIdx && !isNew ? 'winner-cell' : ''}">
                                <input type="number" class="price-input" step="0.1" value="${p || ''}" data-field="price" data-idx="${i}" data-row="${idx}" data-col="${i + 2}">
                                ${i === winIdx && !isNew ? '<span class="winner-badge">WIN</span>' : ''}
                            </td>
                        `).join('')}
                        <td class="admin-only" style="font-weight:600; color:var(--accent)">${isNew ? '—' : (winIdx > -1 ? `${winName} (¥${winPrice})` : '待输入')}</td>
                    `;

                    tr.querySelectorAll('input').forEach(inp => {
                        inp.oninput = () => this.handleFruitInput(inp);
                        inp.onfocus = () => {
                            this.focusedCell = { row: parseInt(inp.dataset.row), col: parseInt(inp.dataset.col) };
                        };
                    });

                    tbody.appendChild(tr);
                });
            },

            handleFruitInput(inp) {
                const rowIdx = parseInt(inp.dataset.row);
                const field = inp.dataset.field;
                const val = inp.value.trim();

                if (rowIdx === this.data.fruit.length) {
                    // New row
                    if (field === 'name' && val) {
                        this.data.fruit.push({
                            id: U.id(),
                            name: val,
                            perCapita: 0.1,
                            prices: [0, 0, 0],
                            history: []
                        });
                        this.save();
                        this.renderFruit();
                    }
                    return;
                }

                const fruit = this.data.fruit[rowIdx];
                if (!fruit) return;

                if (field === 'name') {
                    fruit.name = val;
                } else if (field === 'perCapita') {
                    fruit.perCapita = parseFloat(val) || 0;
                } else if (field === 'price') {
                    const priceIdx = parseInt(inp.dataset.idx);
                    const newPrice = parseFloat(val) || 0;
                    fruit.prices[priceIdx] = newPrice;

                    // Save to history
                    if (newPrice > 0) {
                        if (!fruit.history) fruit.history = [];
                        fruit.history.push({
                            supplier: this.data.supplierNames[priceIdx],
                            price: newPrice,
                            date: new Date().toISOString()
                        });
                    }
                }

                this.save();
                this.renderFruit();
            },

            // ============ KEYBOARD NAVIGATION ============
            setupKeyboardNav() {
                document.addEventListener('keydown', (e) => {
                    if (this.view !== 'fruit' || !this.focusedCell) return;
                    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) return;

                    e.preventDefault();

                    let { row, col } = this.focusedCell;
                    const maxRow = this.data.fruit.length; // including new row
                    const maxCol = 4; // perCapita + 3 suppliers

                    if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
                    else if (e.key === 'ArrowDown') row = Math.min(maxRow, row + 1);
                    else if (e.key === 'ArrowLeft') col = Math.max(1, col - 1);
                    else if (e.key === 'ArrowRight' || e.key === 'Tab') col = Math.min(maxCol, col + 1);

                    const targetInput = document.querySelector(`#fruit-tbody input[data-row="${row}"][data-col="${col}"]`);
                    if (targetInput) {
                        targetInput.focus();
                        targetInput.select();
                    }
                });
            },

            // ============ EXPORT CSV ============
            exportCSV() {
                const guests = this.data.session.guests || 10;
                const BOM = '\uFEFF';
                let csv = BOM + '品名,人均(kg),总需(kg),中标供应商,单价(¥),预算(¥)\n';

                this.data.fruit.forEach(f => {
                    const total = U.round(f.perCapita * guests);
                    const winIdx = U.minIdx(f.prices);
                    const winPrice = winIdx > -1 ? f.prices[winIdx] : 0;
                    const winName = winIdx > -1 ? this.data.supplierNames[winIdx] : '待定';
                    const budget = U.round(total * winPrice);
                    csv += `"${f.name}",${f.perCapita},${total},"${winName}",${winPrice},${budget}\n`;
                });

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `水果采购单_${this.data.session.date}.csv`;
                a.click();
                this.toast('✅ CSV 已导出');
            },

            // ============ v7.0: PROCUREMENT SUMMARY ============
            showProcurementSummary() {
                const guests = this.data.session.guests || 10;

                // Group fruits by winning supplier
                const supplierGroups = {};

                this.data.fruit.forEach(f => {
                    if (!f.name) return;

                    const total = U.round(f.perCapita * guests);
                    const winIdx = U.minIdx(f.prices);

                    if (winIdx === -1) return; // No valid price

                    const supplierName = this.data.supplierNames[winIdx] || `供应商 ${String.fromCharCode(65 + winIdx)}`;

                    if (!supplierGroups[supplierName]) {
                        supplierGroups[supplierName] = {
                            items: [],
                            total: 0
                        };
                    }

                    supplierGroups[supplierName].items.push({
                        name: f.name,
                        spec: `${f.perCapita}kg/人`,
                        quantity: total,
                        price: f.prices[winIdx]
                    });

                    supplierGroups[supplierName].total++;
                });

                // Generate HTML
                let html = '';

                if (Object.keys(supplierGroups).length === 0) {
                    html = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">暂无采购数据，请先填写水果比价信息</p>';
                } else {
                    html += `<div style="margin-bottom: 20px; color: var(--text-secondary);">
                        <strong>预计人数:</strong> ${guests} 人 | 
                        <strong>供应商数量:</strong> ${Object.keys(supplierGroups).length}
                    </div>`;

                    Object.entries(supplierGroups).forEach(([supplier, data]) => {
                        html += `
                            <div style="margin-bottom: 24px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; background: var(--glass-bg);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <h4 style="margin: 0; color: var(--accent);">📦 ${supplier}</h4>
                                    <button class="btn btn-sm btn-primary" onclick="app.printSupplierOrder('${supplier}')">
                                        🖨️ 打印采购单
                                    </button>
                                </div>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: rgba(0,0,0,0.02); text-align: left;">
                                            <th style="padding: 8px; border-bottom: 1px solid var(--border);">水果名称</th>
                                            <th style="padding: 8px; border-bottom: 1px solid var(--border);">规格</th>
                                            <th style="padding: 8px; border-bottom: 1px solid var(--border);">数量(kg)</th>
                                            <th style="padding: 8px; border-bottom: 1px solid var(--border);">单价(¥/kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.items.map(item => `
                                            <tr>
                                                <td style="padding: 8px; border-bottom: 1px solid var(--border);">${item.name}</td>
                                                <td style="padding: 8px; border-bottom: 1px solid var(--border);">${item.spec}</td>
                                                <td style="padding: 8px; border-bottom: 1px solid var(--border); font-weight: 600;">${item.quantity}</td>
                                                <td style="padding: 8px; border-bottom: 1px solid var(--border);">¥${item.price}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                <div style="margin-top: 8px; text-align: right; color: var(--text-secondary);">
                                    <strong>共 ${data.total} 种水果</strong>
                                </div>
                            </div>
                        `;
                    });
                }

                document.getElementById('modal-procurement-body').innerHTML = html;
                document.getElementById('modal-procurement').classList.add('active');
            },

            printSupplierOrder(supplierName) {
                const guests = this.data.session.guests || 10;
                const date = this.data.session.date || new Date().toISOString().split('T')[0];

                // Get items for this supplier
                const items = [];
                this.data.fruit.forEach(f => {
                    if (!f.name) return;

                    const winIdx = U.minIdx(f.prices);
                    if (winIdx === -1) return;

                    const currentSupplier = this.data.supplierNames[winIdx] || `供应商 ${String.fromCharCode(65 + winIdx)}`;

                    if (currentSupplier === supplierName) {
                        items.push({
                            name: f.name,
                            spec: `${f.perCapita}kg/人`,
                            quantity: U.round(f.perCapita * guests)
                        });
                    }
                });

                // Generate print content
                const printContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>采购单 - ${supplierName}</title>
                        <style>
                            @page { margin: 15mm; }
                            body { 
                                font-family: 'SimSun', serif; 
                                font-size: 14px; 
                                line-height: 1.6;
                                color: #333;
                            }
                            h2 { 
                                text-align: center; 
                                margin-bottom: 20px;
                                font-size: 24px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 10px;
                            }
                            .meta {
                                margin-bottom: 20px;
                                font-size: 12px;
                                color: #666;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin-bottom: 20px;
                            }
                            th, td { 
                                border: 1px solid #333; 
                                padding: 10px; 
                                text-align: left; 
                            }
                            th { 
                                background: #f0f0f0; 
                                font-weight: bold; 
                            }
                            .total {
                                text-align: right;
                                font-weight: bold;
                                margin-top: 10px;
                                font-size: 16px;
                            }
                            .footer {
                                margin-top: 40px;
                                padding-top: 20px;
                                border-top: 1px solid #999;
                                font-size: 12px;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <h2>水果采购单</h2>
                        <div class="meta">
                            <div><strong>供应商:</strong> ${supplierName}</div>
                            <div><strong>日期:</strong> ${date}</div>
                            <div><strong>预计人数:</strong> ${guests} 人</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 10%">序号</th>
                                    <th style="width: 40%">水果名称</th>
                                    <th style="width: 25%">规格</th>
                                    <th style="width: 25%">数量(kg)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map((item, idx) => `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td>${item.name}</td>
                                        <td>${item.spec}</td>
                                        <td style="font-weight: bold;">${item.quantity}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="total">
                            总计: ${items.length} 种水果
                        </div>
                        <div class="footer">
                            <p>签收人: __________________ &nbsp;&nbsp;&nbsp; 签收日期: __________________</p>
                            <p style="color: #999; font-size: 10px;">此采购单由"宴请管理系统 v7.0"自动生成</p>
                        </div>
                    </html>
                `;

                // Open print window
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                }, 250);

                this.toast(`✅ 正在打印 ${supplierName} 采购单`);
            },

            // ============ PRINT ============
            printMenu() {
                const overlay = document.getElementById('print-overlay');
                const s = this.data.session;

                // Group dishes by category
                const groups = {};
                this.data.selectedIds.forEach(sid => {
                    const item = this.data.items.find(i => i.id === sid);
                    if (!item) return;
                    const cat = this.data.categories.find(c => c.id === item.cid);
                    if (!cat) return;
                    if (!groups[cat.id]) groups[cat.id] = { name: cat.name, items: [] };
                    groups[cat.id].items.push(item);
                });

                // Guest Copy (no prices)
                let guestCopy = `
                    <div class="print-page" style="page-break-after: always;">
                        <div class="print-title">Banquet Menu - Guest Copy</div>
                        <div class="print-subtitle">${s.date} | ${s.dept || '—'} | ${s.room || '—'} | ${s.tables || 1} 桌</div>
                `;

                for (const cid in groups) {
                    const g = groups[cid];
                    guestCopy += `<div class="print-section">`;
                    guestCopy += `<div class="print-section-title">${g.name}</div>`;
                    g.items.forEach(item => {
                        guestCopy += `<div class="print-item"><span>${item.name}</span></div>`;
                    });
                    guestCopy += `</div>`;
                }

                guestCopy += `</div>`;

                // Kitchen Copy (with prices and notes)
                let kitchenCopy = `
                    <div class="print-page">
                        <div class="print-title">Banquet Menu - Kitchen Copy</div>
                        <div class="print-subtitle">${s.date} | ${s.dept || '—'} | ${s.room || '—'} | ${s.tables || 1} 桌</div>
                `;

                if (s.kitchenNotes) {
                    kitchenCopy += `<div class="print-highlight">🏷️ Kitchen Notes: ${s.kitchenNotes}</div>`;
                }

                for (const cid in groups) {
                    const g = groups[cid];
                    kitchenCopy += `<div class="print-section">`;
                    kitchenCopy += `<div class="print-section-title">${g.name}</div>`;
                    g.items.forEach(item => {
                        kitchenCopy += `<div class="print-item"><span>${item.name}</span><span>¥${item.price || 0}</span></div>`;
                    });
                    kitchenCopy += `</div>`;
                }

                kitchenCopy += `</div>`;

                overlay.innerHTML = guestCopy + kitchenCopy;
                overlay.classList.add('active');
                setTimeout(() => {
                    window.print();
                    overlay.classList.remove('active');
                }, 200);
            },

            // ============ CLOUD SYNC ============
            async cloudUpload(silent = false) {
                if (this.syncInProgress) return; // Prevent concurrent syncs

                this.syncInProgress = true;
                this.setCloudStatus('syncing', '正在上传...');
                try {
                    const res = await fetch(API_URL, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Master-Key': CLOUD_API_KEY
                        },
                        body: JSON.stringify(this.data)
                    });
                    if (!res.ok) throw new Error('Upload failed');
                    this.setCloudStatus('online', '云端同步正常');
                    if (!silent) this.toast('✅ 云端已更新');
                } catch (e) {
                    console.error(e);
                    this.setCloudStatus('offline', '离线模式');
                    if (!silent) this.toast('❌ 上传失败');
                } finally {
                    this.syncInProgress = false;
                }
            },

            async cloudDownload(silent = false) {
                if (this.syncInProgress) return;

                this.syncInProgress = true;
                this.setCloudStatus('syncing', '正在同步...');
                try {
                    const res = await fetch(API_URL, {
                        headers: { 'X-Master-Key': CLOUD_API_KEY }
                    });
                    if (!res.ok) throw new Error('Download failed');
                    const json = await res.json();
                    if (json.record && json.record.categories) {
                        this.data = json.record;
                        this.save();

                        // Apply dark mode if needed
                        if (this.data.darkMode) {
                            document.body.classList.add('dark-mode');
                            document.getElementById('theme-toggle').textContent = '☀️';
                        }

                        this.render();
                        this.setCloudStatus('online', '云端同步正常');
                        if (!silent) this.toast('✅ 已同步最新数据');
                    } else {
                        this.setCloudStatus('online', '云端同步正常');
                    }
                } catch (e) {
                    console.error(e);
                    this.setCloudStatus('offline', '离线模式');
                    if (!silent) this.toast('❌ 同步失败');
                } finally {
                    this.syncInProgress = false;
                }
            },

            setCloudStatus(status, text) {
                const dot = document.getElementById('status-dot');
                const txt = document.getElementById('status-text');
                dot.className = 'status-dot ' + status;
                txt.textContent = text;
            },

            // ============ SETTINGS ============
            exportJSON() {
                const str = JSON.stringify(this.data, null, 2);
                const url = URL.createObjectURL(new Blob([str], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = `BanquetMaster_${this.data.session.date}.json`;
                a.click();
                this.toast('✅ 已导出备份');
            },

            importJSON(input) {
                const file = input.files[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = e => {
                    try {
                        this.data = JSON.parse(e.target.result);
                        this.save();
                        location.reload();
                    } catch {
                        this.toast('❌ JSON 解析失败');
                    }
                };
                r.readAsText(file);
            },

            factoryReset() {
                if (confirm('⚠️ 确定恢复出厂设置？所有本地数据将被清除。')) {
                    this.data = JSON.parse(JSON.stringify(DEFAULTS));
                    this.save();
                    location.reload();
                }
            },

            // ============ UI HELPERS ============
            toast(msg, duration = 2500) {
                const t = document.getElementById('toast');
                t.textContent = msg;
                t.classList.add('show');
                setTimeout(() => t.classList.remove('show'), duration);
            },

            openModal(type, title, body) {
                const modal = document.getElementById(`modal-${type}`);
                const titleEl = document.getElementById(`modal-${type}-title`);
                const bodyEl = document.getElementById(`modal-${type}-body`);

                if (titleEl) titleEl.textContent = title;
                if (bodyEl) bodyEl.innerHTML = body;
                modal.classList.add('open');
            },

            closeModal(type) {
                document.getElementById(`modal-${type}`).classList.remove('open');
            },

            // ============ RENDER ============
            render() {
                if (this.view === 'dashboard') this.renderDashboard();
                else if (this.view === 'menu') this.renderMenu();
                else if (this.view === 'fruit') this.renderFruit();
            }
        };

        // ============ BOOT ============
        document.addEventListener('DOMContentLoaded', () => {
            app.init();
        });