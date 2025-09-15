import { registerError } from './notification.js';

const nav = document.querySelector('.navbar');
const searchContainer = document.querySelector('.database_nav');

window.onscroll = () => {
    if (window.pageYOffset > document.querySelector('.hero').offsetHeight) searchContainer.classList.add('shadowed');
    else searchContainer.classList.remove('shadowed');
};

// 纯前端：从本地 JSON 读取游戏列表并缓存
let GAMES = [];
async function fetchJsonWithFallback(relPath, options) {
    const candidates = [relPath, '/' + relPath.replace(/^\/+/, '')];
    for (const url of candidates) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
        } catch (err) {}
    }
    throw new Error('Failed to fetch: ' + relPath);
}

fetchJsonWithFallback('assets/JSON/games.json')
    .then(res => res.json())
    .then(games => {
        GAMES = games || [];
        window.GAMES = GAMES; // 暴露给全局

        const searchBar = document.querySelector('[data-func="search"]');
        searchBar.placeholder = `搜索 ${GAMES.length} 个游戏`;

        // 渲染游戏列表
        renderGames(GAMES);

        // 搜索功能
        searchBar.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            // 获取当前的分类过滤器
            const currentCategory = window.getCurrentCategory ? window.getCurrentCategory() : 'all';

            // 先根据分类过滤，再根据搜索词过滤
            let baseGames = GAMES;
            if (currentCategory && currentCategory !== 'all') {
                baseGames = GAMES.filter(game => {
                    if (!game.category) return false;
                    const gameCategory = game.category.toLowerCase();
                    const targetCategory = currentCategory.toLowerCase();
                    return gameCategory === targetCategory ||
                           gameCategory.includes(targetCategory) ||
                           targetCategory.includes(gameCategory);
                });
            }

            const filtered = baseGames.filter(game =>
                game.name.toLowerCase().includes(query) ||
                (game.category && game.category.toLowerCase().includes(query))
            );
            renderGames(filtered);
        });

        searchBar.focus();
    })
    .catch(() => registerError('Could not load games'));

// 渲染游戏列表
function renderGames(games) {
    const gamesContainer = document.querySelector('.games');
    gamesContainer.innerHTML = '';

    games.forEach(game => {
        const gameEl = document.createElement('div');
        gameEl.classList = 'game';
        gameEl.title = game.name;
        gameEl.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.name}"/>
            <p>${game.name}</p>
        `;
        gamesContainer.appendChild(gameEl);

        gameEl.querySelector('img').onerror = (e) => {
            registerError(`Could not load splash image for ${e.target.parentElement.title}`);
            e.target.parentElement.classList.add('failed');
            e.target.src = '/assets/img/logo.png';
        };

        gameEl.addEventListener('click', () => openGame(game.id));
    });
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

