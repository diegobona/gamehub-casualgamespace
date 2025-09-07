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

// 筛选游戏函数
function filterGames(category) {
    currentCategory = category;
    
    // 更新分类卡片的激活状态
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 筛选游戏
    let filteredGames;
    if (category === 'all') {
        filteredGames = allGames;
    } else {
        filteredGames = allGames.filter(game => game.category === category);
    }
    
    // 重新渲染游戏列表
    renderGames(filteredGames);
}

// 将函数添加到全局作用域
window.filterGames = filterGames;

// 渲染游戏列表函数
function renderGames(games) {
    const gamesContainer = document.querySelector('.games');
    gamesContainer.innerHTML = '';
    
    games.forEach(game => {
        const gameElement = document.createElement('div');
        gameElement.className = 'game';
        gameElement.innerHTML = `
            <img src=\"${game.thumbnail}\" alt=\"${game.name}\" onerror=\"this.parentElement.classList.add('failed')\">
            <p>${game.name}</p>
        `;
        gameElement.onclick = () => {
            if (game.use === 'redirect') {
                window.location.href = game.url;
            }
        };
        gamesContainer.appendChild(gameElement);
    });
}

// 分类筛选功能
function filterByCategory(category) {
    currentCategory = category;
    
    // 更新分类卡片的激活状态
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 筛选游戏
    let filteredGames;
    if (category === 'all') {
        filteredGames = allGames;
    } else {
        filteredGames = allGames.filter(game => game.category === category);
    }
    
    // 重新渲染游戏列表
    renderGames(filteredGames);
}

// 搜索功能
function searchGames(query) {
    currentCategory = category;
    
    // 更新分类卡片的激活状态
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    // 筛选游戏
    let filteredGames;
    if (category === 'all') {
        filteredGames = allGames;
    } else {
        filteredGames = allGames.filter(game => game.category === category);
    }
    
    // 重新渲染游戏列表
    renderGames(filteredGames);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载游戏数据
    fetch('/assets/JSON/games.json')
        .then(response => response.json())
        .then(data => {
            allGames = data;
            renderGames(allGames); // 初始显示所有游戏
            // 默认激活\"All Games\"分类
            document.querySelector('[data-category="all"]').classList.add('active');
        })
        .catch(error => {
            console.error('Error loading games:', error);
        });
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
