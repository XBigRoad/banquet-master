/**
 * ========================================
 * Banquet Master v7.0 - Default Data
 * ========================================
 */

const DEFAULTS = {
    session: {
        date: new Date().toISOString().split('T')[0],
        dept: '',
        room: '',
        tables: 1,
        guests: 10,
        kitchenNotes: ''
    },
    categories: [
        { id: 'c1', name: '冷菜 Cold Dishes' },
        { id: 'c2', name: '热菜 Hot Dishes' },
        { id: 'c3', name: '汤羹 Soup' },
        { id: 'c4', name: '主食 Staple' },
        { id: 'c5', name: '酒水 Drinks' }
    ],
    items: [
        { id: 'i1', cid: 'c1', name: '拍黄瓜', price: 18 },
        { id: 'i2', cid: 'c1', name: '老醋花生', price: 22 },
        { id: 'i3', cid: 'c1', name: '蒜泥白肉', price: 38 },
        { id: 'i4', cid: 'c2', name: '宫保鸡丁', price: 45 },
        { id: 'i5', cid: 'c2', name: '红烧肉', price: 68 },
        { id: 'i6', cid: 'c2', name: '水煮鱼', price: 88 },
        { id: 'i7', cid: 'c3', name: '西湖牛肉羹', price: 32 },
        { id: 'i8', cid: 'c3', name: '紫菜蛋花汤', price: 15 },
        { id: 'i9', cid: 'c4', name: '扬州炒饭', price: 25 },
        { id: 'i10', cid: 'c4', name: '小笼包', price: 28 },
        { id: 'i11', cid: 'c5', name: '可乐', price: 8 },
        { id: 'i12', cid: 'c5', name: '雪花啤酒', price: 12 }
    ],
    selectedIds: [],
    fruit: [
        { id: 'f1', name: '富士苹果', perCapita: 0.2, prices: [8.5, 9.0, 8.8], history: [] },
        { id: 'f2', name: '香蕉', perCapita: 0.3, prices: [6.0, 5.8, 6.2], history: [] },
        { id: 'f3', name: '西瓜', perCapita: 0.5, prices: [4.5, 4.8, 4.2], history: [] }
    ],
    supplierNames: ['供应商 A', '供应商 B', '供应商 C'],
    templates: [],
    archives: [],
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    darkMode: false,
    // v7.0 Enterprise Features
    version: '7.0',
    users: [
        {
            id: 'admin_001',
            username: 'admin',
            passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
            role: 'admin',
            name: '系统管理员',
            email: 'admin@company.com',
            createdAt: new Date().toISOString()
        }
    ],
    currentUser: null
};
