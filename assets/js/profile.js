// import { registerError } from './notification.js';
import loadPageScripts from './page.js';
// import API from './api.js';

if (window.location.pathname === '/assets/pages/profile.html') {
    if (!window.frameElement) window.location.replace('/app#profile');

    loadPageScripts(new URLSearchParams(window.location.search), window.location.hash.replace('#', ''));
}

// const usernameDisplay = document.querySelector('#username');

// 注释掉所有登录相关的API调用和用户状态处理
/*
API.get(`/me`)
    .then(user => {
        if (!user.error) {
            // 用户已登录，显示用户信息
            if (window.location.pathname !== '/assets/pages/profile.html') {
                document.querySelector('.avatar-small').style.backgroundImage = `url('${API.servers[0]}${user.avatar}')`;
                usernameDisplay.innerText = user.username;
            } else {
                window.parent.document.body.classList.add('noscroll');
                window.parent.document.documentElement.classList.add('noscroll');
                const overlay = document.querySelector('.uploadIcon');
                const inputBtn = document.querySelector('.button.is-rounded.is-danger.has-right-sharp');
                document.querySelector('.avatar').style.backgroundImage = `url("${API.servers[0]}${user.avatar}")`;
                document.querySelector('[data-attr="username"]').value = user.username;
                document.querySelector('.userid').innerText = '#' + user.id;

                document.querySelector('#app').classList.remove('hidden');
                document.querySelector('#loader').classList.add('hidden');

                window.parent.document.querySelector('.modal-close').addEventListener('click', (event) => {
                    window.parent.document.documentElement.classList.remove('noscroll');
                    window.parent.document.body.classList.remove('noscroll');
                    window.parent.history.pushState({}, '', window.parent.location.pathname);
                    window.parent.document.querySelector('.modal.is-active').remove();
                    parentstyles.remove();
                });

                window.parent.document.querySelector('.modal-background').addEventListener('click', (event) => {
                    window.parent.document.documentElement.classList.remove('noscroll');
                    window.parent.document.body.classList.remove('noscroll');
                    window.parent.history.pushState({}, '', window.parent.location.pathname);
                    window.parent.document.querySelector('.modal.is-active').remove();
                    parentstyles.remove();
                });
            }
        } else {
            // 用户未登录，显示默认状态
            handleGuestMode();
            // 仍然显示错误提示（按用户要求）
            registerError('Could not load profile data');
        }
    }).catch(e => {
        // 网络错误或其他问题
        handleGuestMode();
        registerError('Could not load profile data');
    });

// 处理访客模式
function handleGuestMode() {
    if (window.location.pathname !== '/assets/pages/profile.html') {
        // 设置默认头像和用户名
        const avatarElement = document.querySelector('.avatar-small');
        if (avatarElement) {
            avatarElement.style.backgroundImage = `url('/assets/img/default-avatar.png')`;
        }
        
        if (usernameDisplay) {
            usernameDisplay.innerText = 'Guest';
        }
        
        // 可以添加登录按钮或提示
        addLoginPrompt();
    }
}

// 添加登录提示
function addLoginPrompt() {
    const navElement = document.querySelector('.navbar-end');
    if (navElement && !document.querySelector('.login-btn')) {
        const loginBtn = document.createElement('a');
        loginBtn.className = 'navbar-item login-btn';
        loginBtn.href = '/auth.html';
        loginBtn.textContent = '登录';
        loginBtn.style.color = '#00d1b2';
        navElement.appendChild(loginBtn);
    }
}
*/

// 简单的占位符，避免文件为空
console.log('Profile module loaded - authentication disabled');
