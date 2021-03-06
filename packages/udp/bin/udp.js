(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('dgram')) :
    typeof define === 'function' && define.amd ? define(['dgram'], factory) :
    (global.udp = factory(global.dgram));
}(this, (function (dgram) { 'use strict';

    dgram = dgram && dgram.hasOwnProperty('default') ? dgram['default'] : dgram;

    function udp({ type = 'udp4', localAddr = '0.0.0.0', reuseAddr = true, socketTimeout = 30000, connectTimeout = 1000, } = {}) {
        return function socket(params, emitter) {
            let listener;
            const clientCache = {};
            function addClient(client) {
                const local = client.local();
                const key = `${local.host}.${local.port}`;
                if (local.host === params.host && local.port === params.port)
                    return;
                clientCache[key].client = client;
                clientCache[key].timeout = setTimeout(client.destroy, socketTimeout);
                for (let i = 0; i < clientCache[key].data.length; i++) {
                    clientCache[key].client.emit('frame', clientCache[key].data[i]);
                }
                clientCache[key].data.length = 0;
            }
            function resolveClient(origin, data) {
                const handle = {
                    host: origin.address,
                    port: origin.port,
                    socket: listener,
                };
                if (data[0] === 83 && data[1] === 89 && data[2] === 78) {
                    send(handle, Buffer.from('ACK'));
                    data = null;
                }
                const key = `${origin.address}.${origin.port}`;
                clearTimeout(clientCache[key] && clientCache[key].timeout);
                if (!clientCache[key]) {
                    clientCache[key] = {
                        client: null,
                        data: [],
                        timeout: null,
                    };
                    emitter.emit('socket', handle);
                }
                if (data) {
                    if (clientCache[key].client)
                        clientCache[key].client.emit('frame', data);
                    else
                        clientCache[key].data.push(data);
                }
            }
            function bind() {
                listener = dgram.createSocket({ type: type, reuseAddr });
                listener.on('message', (data, origin) => resolveClient(origin, data));
                listener.on('error', err => emitter.emit('error', err));
                listener.bind(params.port, localAddr);
                emitter.emit('ready');
            }
            function remote(handle) {
                return handle;
            }
            function send(handle, payload) {
                if (handle) {
                    handle.socket.send(Buffer.from(payload), handle.port, handle.host);
                }
            }
            function stop() {
                listener.close();
            }
            function connect(handle) {
                if (handle)
                    return handle;
                const connection = dgram.createSocket(type);
                let timeout;
                connection.on('error', err => emitter.emit('error', err));
                connection.on('message', req => {
                    if (req[0] === 65 && req[1] === 67 && req[2] === 75) {
                        clearTimeout(timeout);
                        emitter.emit('connect', connection);
                    }
                    else
                        emitter.emit('frame', req);
                });
                connection.bind(null, localAddr);
                const res = {
                    host: params.host,
                    port: params.port,
                    socket: connection,
                };
                send(res, Buffer.from('SYN'));
                timeout = setTimeout(() => disconnect(res), connectTimeout);
                return res;
            }
            function disconnect(handle) {
                if (handle)
                    handle = null;
                emitter.emit('disconnect');
            }
            emitter.on('connection', addClient);
            return {
                bind,
                connect,
                disconnect,
                remote,
                send,
                stop,
            };
        };
    }

    return udp;

})));
