(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('net')) :
    typeof define === 'function' && define.amd ? define(['net'], factory) :
    (global.tcp = factory(global.net));
}(this, (function (net) { 'use strict';

    net = net && net.hasOwnProperty('default') ? net['default'] : net;

    function tcp({ socketTimeout = 30000 } = {}) {
        return function socket(params, emitter) {
            let listener;
            function bind() {
                listener = net.createServer(soc => emitter.emit('socket', soc));
                listener.on('error', err => emitter.emit('error', err));
                listener.listen(params.port, () => emitter.emit('ready'));
            }
            function remote(handle) {
                return {
                    host: handle.remoteAddress,
                    port: handle.remotePort,
                };
            }
            function connect(handle) {
                const connection = handle || net.connect(params.port, params.host);
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

    return tcp;

})));
