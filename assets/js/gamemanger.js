import { registerError } from './notification.js';

const nav = document.querySelector('.navbar');

// 安全的滚动处理：仅当所需元素存在时才操作；兼容SPA不同路由页面
function handleScrollShadow() {
    const hero = document.querySelector('.hero');
    // 兼容旧类名 .database_nav 和现有的 .search-container
    const container = document.querySelector('.database_nav') || document.querySelector('.search-container');
    if (!hero || !container) return;
    const threshold = hero.offsetHeight || 0;
    if (window.pageYOffset > threshold) {
        container.classList.add('shadowed');
    } else {
        container.classList.remove('shadowed');
    }
}

window.addEventListener('scroll', handleScrollShadow, { passive: true });
// 首次加载也执行一次（在DOM就绪后）
document.addEventListener('DOMContentLoaded', handleScrollShadow);

// 纯前端：从本地 JSON 读取游戏列表并缓存
let GAMES = [];

// 创建游戏数据加载Promise，用于管理异步加载状态
let gamesLoadPromise = null;
let gamesLoadResolve = null;
let gamesLoadReject = null;

// 初始化游戏数据加载Promise
function initGamesLoadPromise() {
    if (!gamesLoadPromise) {
        gamesLoadPromise = new Promise((resolve, reject) => {
            gamesLoadResolve = resolve;
            gamesLoadReject = reject;
        });
    }
    return gamesLoadPromise;
}

// 获取游戏数据的Promise
function getGamesData() {
    return gamesLoadPromise || initGamesLoadPromise();
}

async function fetchJsonWithFallback(relPath, options) {
    const clean = relPath.replace(/^\/+/, '');
    const candidates = ['/' + clean, relPath]; // prefer absolute first
    for (const url of candidates) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch (err) {}
    }
    throw new Error('Failed to fetch: ' + relPath);
}

// 添加分类数据和渲染函数
const CATEGORIES = [
    { id: 'all', name: 'All', icon: '🎮' },
    { id: 'shooter', name: 'Shooter', icon: '🔫' },
    { id: 'racing', name: 'Racing', icon: '🏎️' },
    { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
    { id: 'adventure', name: 'Adventure', icon: '🗺️' },
    { id: 'action', name: 'Action', icon: '⚡' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'strategy', name: 'Strategy', icon: '🎯' },
    { id: 'escape', name: 'Escape', icon: '🚪' },
    { id: 'retro', name: 'Retro', icon: '👾' },
    { id: 'educational', name: 'Educational', icon: '📚' },
    { id: 'platformer', name: 'Platformer', icon: '🏃' },
    { id: 'casual', name: 'Casual', icon: '☕' },
    { id: 'simulation', name: 'Simulation', icon: '🎮' },
    { id: 'runner', name: 'Runner', icon: '🏃‍♂️' },
    { id: 'horror', name: 'Horror', icon: '👻' },
    { id: 'building', name: 'Building', icon: '🏗️' }
];

// 渲染分类卡片
function renderCategories() {
    const categoriesContainer = document.getElementById('categories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    
    CATEGORIES.forEach(category => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category-card';
        categoryEl.dataset.category = category.id;
        
        if (category.id === 'all') {
            categoryEl.classList.add('active');
        }
        
        categoryEl.innerHTML = `
            <span class="category-icon">${category.icon}</span>
            <div class="category-name">${category.name}</div>
        `;
        
        categoryEl.addEventListener('click', () => {
            // 移除所有active状态
            document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
            // 添加当前active状态
            categoryEl.classList.add('active');
            
            // 调用分类筛选
            if (window.navigateToCategory) {
                window.navigateToCategory(category.id);
            } else {
                filterGamesByCategory(category.id);
            }
        });
        
        categoriesContainer.appendChild(categoryEl);
    });
}

// 初始化游戏数据加载Promise
initGamesLoadPromise();

fetchJsonWithFallback('assets/JSON/games.json')
    .then(res => res.json())
    .then(games => {
        GAMES = games || [];
        window.GAMES = GAMES; // 暴露给全局

        // 解析Promise，通知所有等待的组件
        if (gamesLoadResolve) {
            gamesLoadResolve(GAMES);
        }

        const searchBar = document.querySelector('[data-func="search"]');
        if (searchBar) {
            searchBar.placeholder = `Search`;
        }

        // 渲染分类卡片
        renderCategories();

        // 渲染游戏列表
        renderGames(GAMES);

        // 搜索功能
        if (searchBar) {
            searchBar.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const currentCategory = getCurrentCategory();
                
                let baseGames = GAMES;
                if (currentCategory && currentCategory !== 'all') {
                    baseGames = GAMES.filter(game => {
                        if (!game.category) return false;
                        const gameCategory = game.category.toLowerCase();
                        const targetCategory = currentCategory.toLowerCase();
                        return gameCategory === targetCategory;
                    });
                }

                const filtered = baseGames.filter(game =>
                    game.name.toLowerCase().includes(query) ||
                    (game.category && game.category.toLowerCase().includes(query))
                );
                renderGames(filtered);
            });
        }

        if (searchBar) searchBar.focus();
    })
    .catch(error => {
        console.error('Failed to load games:', error);
        if (gamesLoadReject) {
            gamesLoadReject(error);
        }
        registerError('Could not load games');
    });

// 渲染游戏列表（内部无分页版本，作为后备）
function renderGamesInternal(games) {
    const gamesContainer = document.getElementById('games');
    if (!gamesContainer) return;

    gamesContainer.innerHTML = '';

    games.forEach(game => {
        const gameEl = document.createElement('div');
        gameEl.className = 'game';
        gameEl.onclick = () => showGameDetail(generateSlug(game.name));

        gameEl.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.name}" loading="lazy">
            <div class="game-info">
                <h3 class="game-title">${game.name}</h3>
            </div>
        `;

        gamesContainer.appendChild(gameEl);
    });
}

// 兼容导出：若页面定义了 window.renderGames（带分页），优先调用；否则用内部后备
function renderGames(games) {
    if (window.renderGames) {
        window.renderGames(games);
    } else {
        renderGamesInternal(games);
    }
}

// 用本地内存数据打开游戏
const openGame = (id) => {
    const game = GAMES.find(g => g.id === id);
    if (!game) {
        registerError(`Could not load game #${id}`);
        return;
    }

    // 使用新的路由系统跳转到游戏详情页
    if (window.navigateToGame) {
        window.navigateToGame(game.name);
        return;
    }

    // 如果是跳转模式（用于访问 demo-gd-embed.html 等独立页面），直接跳转
    if (game.use === 'redirect') {
        window.location.href = game.url;
        return;
    }

    // 旧版兼容代码（如果新路由系统未加载）
    const gameFrame = document.querySelector('.gameFrame');
    const gameDatabase = document.querySelector('.games');

    gameFrame.classList.remove('hidden');
    gameDatabase.classList.add('hidden');
    document.querySelector('.database_nav').classList.add('hidden');

    nav.classList.add('hidden');
    document.body.classList.add('noscroll');
    document.documentElement.classList.add('noscroll');

    if (game.use === 'emulator') {
        // 如果你需要支持模拟器，请确保 emulator.html 及相关资源就绪
        // game.url = `/assets/public/gs/emulator.html?file=${game.url}&core=${game.emulatorConfig?.core || ''}&id=${id}`;
    }

    const gameEl = document.createElement('iframe');
    gameEl.classList = 'innerGame';
    gameEl.src = '/assets/public/gs/game.html';
    gameEl.title = game.name;
    gameFrame.appendChild(gameEl);

    gameEl.scrollIntoView();

    gameEl.onload = () => {
        const frame = gameEl.contentWindow.document;

        frame.querySelector('.mainGame').src = game.url;
        frame.querySelector('.mainGame').onload = () => setTimeout(() => {
            frame.querySelectorAll('.mainGame')[1].classList.add('hidden');
            frame.querySelectorAll('.mainGame')[0].classList.remove('hidden');
        }, 1000);
        frame.querySelector('.gameTitle').innerText = game.name;

        frame.querySelector('[data-attr="fullscreen"]').addEventListener('click', () => frame.querySelector('.mainGame').requestFullscreen());

        // 推荐位：取与当前不同的前几项
        const recomendations = GAMES.filter(g => g.id !== id).slice(0, 6);
        const recomendedGames = frame.querySelectorAll('.gameThumb');
        for (let i = 0; i < Math.min(recomendations.length, recomendedGames.length); i++) {
            recomendedGames[i].innerHTML = `<img src="${recomendations[i].thumbnail}" title="${recomendations[i].name}" />`;

            recomendedGames[i].querySelector('img').onerror = (e) => {
                e.target.parentElement.classList.add('failed');
                e.target.src = '/assets/img/logo.png';
            };

            recomendedGames[i].addEventListener('click', () => {
                document.querySelector('.innerGame').remove();
                openGame(recomendations[i].id);
            });
        }

        frame.querySelector('#back').addEventListener('click', () => {
            gameFrame.classList.add('hidden');
            gameDatabase.classList.remove('hidden');
            document.querySelector('.database_nav').classList.remove('hidden');

            nav.classList.remove('hidden');
            document.body.classList.remove('noscroll');
            document.documentElement.classList.remove('noscroll');

            gameEl.remove();
        });
    };
};

// 暴露给全局
window.openGame = openGame;
window.getGamesData = getGamesData;

// 获取当前选中的分类
function getCurrentCategory() {
    const activeCard = document.querySelector('.category-card.active');
    return activeCard ? activeCard.dataset.category : 'all';
}

// 分类筛选功能
function filterGamesByCategory(category) {
    if (!window.GAMES) return;

    let filteredGames;
    if (category === 'all') {
        filteredGames = window.GAMES;
    } else {
        filteredGames = window.GAMES.filter(game => {
            if (!game.category) return false;
            const gameCategory = game.category.toLowerCase();
            const targetCategory = category.toLowerCase();
            return gameCategory === targetCategory;
        });
    }
    
    renderGames(filteredGames);
}


