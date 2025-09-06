import { registerError } from './notification.js';

const nav = document.querySelector('.navbar');
const searchContainer = document.querySelector('.database_nav');

window.onscroll = () => {
    if (window.pageYOffset > document.querySelector('.hero').offsetHeight) searchContainer.classList.add('shadowed');
    else searchContainer.classList.remove('shadowed');
};

// 纯前端：从本地 JSON 读取游戏列表并缓存
let GAMES = [];
fetch('/assets/JSON/games.json')
    .then(res => res.json())
    .then(games => {
        GAMES = games || [];

        const searchBar = document.querySelector('[data-func="search"]');
        searchBar.placeholder = `Search ${GAMES.length} games`;

        searchBar.addEventListener('input', (e) => {
            if (searchBar.value) {
                var result = false;

                document.querySelectorAll('.game').forEach(game => {
                    if (game.title.toLowerCase().includes(searchBar.value.toLowerCase())) {
                        result = true;
                        game.classList.remove('hidden');
                    } else game.classList.add('hidden');
                });

                if (result) document.querySelector('.searchErr').classList.add('hidden');
                else document.querySelector('.searchErr').classList.remove('hidden');
            } else {
                document.querySelectorAll('.game').forEach(game => game.classList.remove('hidden'));
                document.querySelector('.searchErr').classList.add('hidden');
            }
        });

        document.querySelector('.games').innerHTML = '';

        GAMES.forEach(game => {
            const gameEl = document.createElement('div');
            gameEl.classList = 'game';
            gameEl.title = game.name;
            gameEl.innerHTML = `<img src="${game.thumbnail}"/><p>${game.name}</p>`;
            document.querySelector('.games').appendChild(gameEl);

            gameEl.querySelector('img').onerror = (e) => {
                registerError(`Could not load splash image for ${e.target.parentElement.title}`);
                e.target.parentElement.classList.add('failed');
                e.target.src = '/assets/img/logo.png';
            };

            gameEl.addEventListener('click', (e) => openGame(game.id));
        });

        searchBar.focus();
    })
    .catch(e => registerError('Could not load games'));

// 用本地内存数据打开游戏
const openGame = (id) => {
    const game = GAMES.find(g => g.id === id);
    if (!game) {
        registerError(`Could not load game #${id}`);
        return;
    }

    // 如果是跳转模式（用于访问 demo-gd-embed.html 等独立页面），直接跳转
    if (game.use === 'redirect') {
        window.location.href = game.url;
        return;
    }

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

        frame.querySelector('[data-attr="fullscreen"]').addEventListener('click', (e) => frame.querySelector('.mainGame').requestFullscreen());

        // 推荐位：取与当前不同的前几项
        const recomendations = GAMES.filter(g => g.id !== id).slice(0, 6);
        const recomendedGames = frame.querySelectorAll('.gameThumb');
        for (let i = 0; i < Math.min(recomendations.length, recomendedGames.length); i++) {
            recomendedGames[i].innerHTML = `<img src="${recomendations[i].thumbnail}" title="${recomendations[i].name}" />`;

            recomendedGames[i].querySelector('img').onerror = (e) => {
                e.target.parentElement.classList.add('failed');
                e.target.src = '/assets/img/logo.png';
            };

            recomendedGames[i].addEventListener('click', (e) => {
                document.querySelector('.innerGame').remove();
                openGame(recomendations[i].id);
            });
        }

        frame.querySelector('.logo').addEventListener('click', (e) => closeGame());
        frame.querySelector('#back').addEventListener('click', (e) => closeGame());
    };
};

const closeGame = () => {
    const gameFrame = document.querySelector('.gameFrame');
    const gameDatabase = document.querySelector('.games');

    nav.classList.remove('hidden');
    document.body.classList.remove('noscroll');
    document.documentElement.classList.remove('noscroll');

    gameFrame.classList.add('hidden');
    gameDatabase.classList.remove('hidden');

    document.querySelector('.innerGame').remove();
    document.querySelector('.database_nav').classList.remove('hidden');

    gameDatabase.scrollIntoView();
};

window.onresize = () => document.querySelector('.gameFrame').scrollIntoView();
