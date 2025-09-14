import { registerSiteNotification, registerError } from './notification.js';
import loadPageScripts from './page.js';
import analytics from './analytics.js';
import tab from './tab.js';

const scripts = {
    'cryptojs': 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.js'
};
const authNeeded = [
    '/app'
];
const urlParams = new URLSearchParams(window.location.search);
const hash = window.location.hash.replace('#', '');

loadPageScripts(urlParams, hash);
analytics();

window.history.replaceState({}, '', window.location.pathname);

const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
$navbarBurgers.forEach(el => {
    el.addEventListener('click', () => {
        const target = el.dataset.target;
        const $target = document.getElementById(target);

        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');
    });
});

window.onerror = (e) => registerError(e);
window.console.error = (e) => registerError(e);
window.onmessageerror = (e) => registerError(e);

Object.keys(scripts).forEach(key => {
    const script = document.createElement('script');
    script.src = scripts[key];
    document.body.appendChild(script);
});

if (authNeeded.includes(window.location.pathname)) {
    const navmang = document.createElement('script');
    navmang.src = '/assets/js/nav.js';
    document.body.appendChild(navmang);

    setTimeout(() => {
        document.querySelector('#app').classList.remove('hidden');
        document.querySelector('#loader').classList.add('hidden');
        document.documentElement.classList.remove('noscroll');

        registerSiteNotification('GameHub is still in public beta, please report all bugs to our <a href="https://discord.gg/7VvJjhwYec">discord</a>.');
    }, 1000);
} else setTimeout(() => {
    document.querySelector('#app').classList.remove('hidden');
    document.querySelector('#loader').classList.add('hidden');
    document.documentElement.classList.remove('noscroll');

    // registerSiteNotification('GameHub is still in public beta, please report all bugs to our <a href="https://discord.gg/7VvJjhwYec">discord</a>.');
    if (urlParams.get('message') && urlParams.get('type')) registerSiteNotification(urlParams.get('message'), urlParams.get('type'));
}, 1000);

// 游戏筛选功能
let allGames = []; // 存储所有游戏数据
let currentCategory = 'all'; // 当前选中的分类
// 添加分页相关变量
let currentPage = 1;
let gamesPerPage = 50;
let currentFilteredGames = []; // 当前筛选后的游戏列表

// 筛选游戏函数
function filterGames(category) {
    currentCategory = category;
    currentPage = 1; // 重置到第一页
    
    // 更新分类卡片的激活状态
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 筛选游戏
    if (category === 'all') {
        currentFilteredGames = allGames;
    } else {
        currentFilteredGames = allGames.filter(game => game.category === category);
    }
    
    // 重新渲染游戏列表和分页
    renderGamesWithPagination();
}

// 将函数添加到全局作用域
window.filterGames = filterGames;

// 渲染游戏列表函数（带分页）
function renderGamesWithPagination() {
    const startIndex = (currentPage - 1) * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const gamesToShow = currentFilteredGames.slice(startIndex, endIndex);
    
    renderGames(gamesToShow);
    renderPagination();
}

// 渲染游戏列表函数
function renderGames(gamesToShow) {
    const gamesContainer = document.querySelector('.games');
    gamesContainer.innerHTML = '';
    
    gamesToShow.forEach((game) => {
        const gameElement = document.createElement('div');
        gameElement.className = 'game';
        gameElement.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.name}" onerror="this.parentElement.classList.add('failed')">
            <p>${game.name}</p>
        `;
        gamesContainer.appendChild(gameElement);

        // 统一点击逻辑：优先使用前端路由；否则回退到直接跳转
        gameElement.addEventListener('click', (e) => {
            e.preventDefault();
            const useRouter =
                typeof window.generateGameSlug === 'function' &&
                (typeof window.navigateTo === 'function' || typeof window.handleRoute === 'function');

            if (useRouter) {
                const slug = window.generateGameSlug
                    ? window.generateGameSlug(game.name)
                    : game.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '').trim();

                if (window.navigateTo) {
                    window.navigateTo(`/${slug}`);
                } else {
                    history.pushState(null, '', `/${slug}`);
                    if (window.handleRoute) window.handleRoute();
                }
            } else if (game.use === 'redirect') {
                window.location.href = game.url;
            }
        });
    });
}

// 渲染分页控件
function renderPagination() {
    const totalPages = Math.ceil(currentFilteredGames.length / gamesPerPage);
    const paginationContainer = document.querySelector('.pagination-container');

    // 防空：当页面没有分页容器时直接返回，避免抛错导致“Error loading games”
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.innerHTML = '← Previous Page';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderGamesWithPagination();
            scrollToTop();
        }
    };
    paginationContainer.appendChild(prevButton);
    
    // 页码按钮
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页和省略号
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'pagination-btn';
        firstPageBtn.textContent = '1';
        firstPageBtn.onclick = () => {
            currentPage = 1;
            renderGamesWithPagination();
            scrollToTop();
        };
        paginationContainer.appendChild(firstPageBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'pagination-btn';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.onclick = () => {
            currentPage = i;
            renderGamesWithPagination();
            scrollToTop();
        };
        paginationContainer.appendChild(pageButton);
    }
    
    // 最后一页和省略号
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'pagination-btn';
        lastPageBtn.textContent = totalPages;
        lastPageBtn.onclick = () => {
            currentPage = totalPages;
            renderGamesWithPagination();
            scrollToTop();
        };
        paginationContainer.appendChild(lastPageBtn);
    }
    
    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.innerHTML = 'Next Page →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderGamesWithPagination();
            scrollToTop();
        }
    };
    paginationContainer.appendChild(nextButton);
    
    // 页面信息
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    pageInfo.innerHTML = `Page ${currentPage} of ${totalPages} (${currentFilteredGames.length} games)`;
    paginationContainer.appendChild(pageInfo);
}

// 滚动到顶部
function scrollToTop() {
    document.querySelector('.games').scrollIntoView({ behavior: 'smooth' });
}

// 分类筛选功能
function filterByCategory(category) {
    filterGames(category); // 使用统一的筛选函数
}

// 搜索功能（修复原有的bug）
function searchGames(query) {
    currentPage = 1; // 重置到第一页
    
    if (!query.trim()) {
        // 如果搜索为空，显示当前分类的所有游戏
        filterGames(currentCategory);
        return;
    }
    
    // 在当前分类中搜索
    let baseGames;
    if (currentCategory === 'all') {
        baseGames = allGames;
    } else {
        baseGames = allGames.filter(game => game.category === currentCategory);
    }
    
    currentFilteredGames = baseGames.filter(game => 
        game.name.toLowerCase().includes(query.toLowerCase())
    );
    
    renderGamesWithPagination();
    
    // 显示/隐藏搜索错误提示
    const searchErr = document.querySelector('.searchErr');
    if (currentFilteredGames.length === 0) {
        searchErr.classList.remove('hidden');
    } else {
        searchErr.classList.add('hidden');
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 加载游戏数据
    // 在模块顶层或首次使用之前放置一个通用的 JSON 拉取助手（相对路径优先，绝对路径兜底）
    async function fetchJsonWithFallback(relPath, options) {
        const candidates = [relPath, '/' + relPath.replace(/^\/+/, '')];
        for (const url of candidates) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
            } catch (err) {
                // 忽略并尝试下一个候选
            }
        }
        throw new Error('Failed to fetch: ' + relPath);
    }

    try {
        const res = await fetchJsonWithFallback('assets/JSON/games.json', { cache: 'no-store' });
        const data = await res.json();
        allGames = data;
        currentFilteredGames = allGames;
        window.allGames = allGames; // 暴露给全局路由脚本使用
        renderGamesWithPagination(); // 使用分页渲染
        // 默认激活 "All Games" 分类
        const allCat = document.querySelector('[data-category="all"]');
        if (allCat) allCat.classList.add('active');
    } catch (error) {
        console.error('Error loading games:', error);
    }
    
    // 绑定搜索功能
    const searchInput = document.querySelector('[data-func="search"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchGames(e.target.value);
        });
    }
});

// 注释掉所有登录相关的全局变量和函数
/*
// 检查用户登录状态的全局函数
window.isLoggedIn = false;
window.currentUser = null;

// 在profile.js中设置全局状态
API.get(`/me`).then(user => {
    if (!user.error) {
        window.isLoggedIn = true;
        window.currentUser = user;
    }
});

// 需要登录的功能检查
function requireLogin(callback) {
    if (window.isLoggedIn) {
        callback();
    } else {
        registerError('此功能需要登录后使用');
        // 可选：跳转到登录页面
        // window.location.href = '/auth.html';
    }
}
*/
