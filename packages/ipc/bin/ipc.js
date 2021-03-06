(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('net')) :
    typeof define === 'function' && define.amd ? define(['net'], factory) :
    (global.ipc = factory(global.net));
}(this, (function (net) { 'use strict';

    net = net && net.hasOwnProperty('default') ? net['default'] : net;

    function ipc({ socketTimeout = 30000, path = '/tmp/app.socket-' } = {}) {
        return function socket(params, emitter) {
            let listener;
            function bind() {
                listener = net.createServer(soc => emitter.emit('socket', soc));
                listener.on('error', err => emitter.emit('error', err));
                listener.listen(path + params.port, () => emitter.emit('ready'));
            }
            function remote(handle) {
                return {
                    host: handle['_server']._pipeName,
                    port: handle['_handle'].fd,
                };
            }
            function connect(handle) {
                const connection = handle || net.connect(`${path}${params.port}`);
                connection.on('data', req => emitter.emit('frame', req));
                connection.on('error', err => emitter.emit('error', err));
                connection.on('connect', () => emitter.emit('connect', connection));
                connection.on('close', () => emitter.emit('disconnect'));
                connection.setTimeout(socketTimeout, () => emitter.emit('disconnect'));
                return connection;
            }
            function stop() {
                if (listener)
                    listener.close();
            }
            function send(handle, payload) {
                if (handle)
                    handle.write(Buffer.from(payload));
            }
            function disconnect(handle) {
                if (handle) {
                    handle.end();
                    handle.destroy();
                }
            }
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

    return ipc;

})));
