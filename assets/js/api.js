import cookie from '/assets/js/cookie.js';

class api_ {
    constructor() {
        try {
            this.servers = JSON.parse(localStorage.getItem('servers'));
        } catch (e) {
            console.error('Could not get serverlist');
        }
    }

    /**
     * 
     * @returns {Promise.<boolean, Error>}
     */
    // validSession = () => {
    //     // 纯前端场景：固定为未登录，避免触发网络请求
    //     return Promise.resolve(false);
    // };

    /**
     * 
     * @returns {boolean}
     */
      connected = () => {
        return false; // 纯前端模式，无服务器连接
    };

    /**
     * 
     * @param {string} route 
     * @returns {Promise.<object | string, Error>}
     */
    get = async (route) => {
        if (route) {
            try {
                const base = this.connected() ? this.servers[0] : '';
                const response = await fetch(base + route, {
                    credentials: 'include'
                });

                var data = await response.text();

                try {
                    data = JSON.parse(data);
                } catch (e) { }

                return data;
            } catch (e) {
                throw new Error('Could not connect to the server');
            }
        } else throw new Error('Missing parameters for API.get');
    };

    /**
     * 
     * @param {string} route 
     * @param {*} data 
     * @param {boolean} encoded 
     * @returns {Promise.<object | string, Error>}
     */
    post = async (route, data, encoded) => {
        if (route && data) {
            try {
                const base = this.connected() ? this.servers[0] : '';
                var response;

                if (encoded) {
                    if (typeof data == 'object') {
                        const encodingData = await this.encrypt(JSON.stringify(data));

                        response = await fetch(`${base}${route}?hostname=${window.location.hostname}`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'TokenID': encodingData.id
                            },
                            body: JSON.stringify({ data: encodingData.data })
                        });
                    } else {
                        const encodingData = await this.encrypt(data);

                        response = await fetch(`${base}${route}?hostname=${window.location.hostname}`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                                'TokenID': encodingData.id
                            },
                            body: JSON.stringify({ data: encodingData.data })
                        });
                    }
                } else {
                    if (typeof data == 'object') response = await fetch(`${base}${route}?hostname=${window.location.hostname}`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        redirect: 'follow',
                        referrerPolicy: 'no-referrer',
                        body: JSON.stringify(data)
                    });
                    else response = await fetch(`${base}${route}?hostname=${window.location.hostname}`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: data
                    });
                }

                var responseData = await response.text();

                try {
                    responseData = JSON.parse(responseData);
                } catch (e) { }

                return responseData;
            } catch (e) {
                throw new Error('Could not connect to the server');
            }
        } else throw new Error('Missing parameters for API.post');
    };

    encrypt = async (data) => {
        const token = await this.token();

        return {
            data: CryptoJS.AES.encrypt(data, token.token).toString(),
            id: token.id
        };
    };

    token = async () => {
        const token = await this.get('/token');
        return token;
    };

    uuid = () => {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    };
}

const API = new api_();

/**
 * 纯前端：跳过自动服务器发现逻辑，避免访问 GitHub 或外部服务。
 * 如需恢复自动发现，请取消下方代码注释，并确保 fetch('/config.json') 有效。
 */
// fetch('/config.json')
//     .then(res => res.json())
//     .then(config => {
//         if (!localStorage.getItem('servers')) {
//             if (config.server === 'auto') fetch('https://raw.githubusercontent.com/EmberNetwork/GameHub-Assets/main/servers.json')
//                 .then(res => res.json())
//                 .then(servers => {
//                     if (servers) {
//                         const serverList = [];
//                         var serversProcessed = 0;

//                         servers.forEach(server => {
//                             fetch(server)
//                                 .then(res => res.json())
//                                 .then(serverData => {
//                                     serversProcessed += 1;

//                                     if (serverData) {
//                                         if (serverData.status == 'ready') serverList.push(server);
//                                     }
//                                 }).catch(() => serversProcessed += 1);
//                         });

//                         const checker = setInterval(() => {
//                             if (serversProcessed === servers.length) {
//                                 clearInterval(checker);

//                                 if (serverList.length == 0) console.error('No available server was found');
//                                 else {
//                                     localStorage.setItem('servers', JSON.stringify(serverList));
//                                     location.reload();
//                                 }
//                             }
//                         }, 1);
//                     } else console.error('Could not fetch server list');
//                 }).catch(e => console.error('Could not fetch server list'));
//             else fetch(config.server)
//                 .then(res => res.json())
//                 .then(serverData => {
//                     if (serverData) {
//                         if (serverData.status == 'ready') {
//                             localStorage.setItem('servers', JSON.stringify(new Array(config.server)));
//                             location.reload();
//                         } else console.error('Could not connect to default server');
//                     } else console.error('Could not connect to default server');
//                 }).catch(e => console.error('Could not connect to default server'));
//         }
//     });

if (!sessionStorage.getItem('session')) sessionStorage.setItem('session', API.uuid());

const session = sessionStorage.getItem('session');

export default API;