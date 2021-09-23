/* eslint-disable sort-keys */
/* eslint-disable max-len */
import WebSocket from "../websocket/WebSocket";
import config from "../config";
import logger from "../logger/Logger";

const webSocketConnectionStatus = {
    "notAvailable": "not_available",
    "notConnected": "not_connected",
    "connected": "connected",
    "error": "error",
    "closed": "closed",
    "connecting": "connecting"
};

export default class SessionApi {

    oauth2: OAuth2Object;

    id: string;

    // eslint-disable-next-line @typescript-eslint/ban-types
    callback: Function;

    webSocketUrl: string;

    options: SessionOptions;

    webSocket: WebSocket;

    webSocketStatus: string;

    constructor (options: SessionOptions, oauth2: OAuth2Object) {

        const {callback} = options;
        const {isStreaming} = options;

        if (!callback || typeof callback !== "function") {

            throw new Error("callback function is required for establishing connection with Session-Manger Websocket.");

        }

        let basePath = options.basePath || config.basePath;

        basePath = basePath.replace(
            /^http/u,
            "ws"
        );

        // Add comments explaining
        let session = "session";
        if (isStreaming) {

            session = "v1";

        }

        const uri = `${basePath}/${session}/subscribe`;

        if (!oauth2) {

            throw new Error("oauth2 is required for Session-Manager API.");

        }

        const {id} = options;

        if (!id) {

            throw new Error("id is required for establishing connection.");

        }

        this.oauth2 = oauth2;
        this.id = id;
        this.callback = callback;
        this.webSocketUrl = `${uri}/${this.id}`;
        this.options = options;

        this.connect = this.connect.bind(this);
        this.onConnectWebSocket = this.onConnectWebSocket.bind(this);
        this.onErrorWebSocket = this.onErrorWebSocket.bind(this);
        this.onMessageWebSocket = this.onMessageWebSocket.bind(this);
        this.onCloseWebSocket = this.onCloseWebSocket.bind(this);
        this.disconnect = this.disconnect.bind(this);

    }

    onCloseWebSocket (): void {

        logger.debug(
            new Date().toISOString(),
            "WebSocket Closed."
        );
        this.webSocketStatus = webSocketConnectionStatus.closed;

    }

    onConnectWebSocket (): void {

        logger.debug("WebSocket Connected.");
        this.webSocketStatus = webSocketConnectionStatus.connected;

    }

    onErrorWebSocket (err: string): void {

        this.webSocketStatus = webSocketConnectionStatus.error;
        logger.error(err);

    }

    onMessageWebSocket (result: string): void {

        // Expecting insight data
        if (result) {

            const data = JSON.parse(result);
            logger.debug(
                "Websocket Message: ",
                {data}
            );
            this.callback(data);

        }

    }

    connect (): void {

        logger.debug(`WebSocket Connecting on: ${this.webSocketUrl}`);
        this.webSocketStatus = webSocketConnectionStatus.connecting;
        this.webSocket = new WebSocket({
            "url": this.webSocketUrl,
            "accessToken": this.oauth2.activeToken,
            "onError": this.onErrorWebSocket,
            "onClose": this.onCloseWebSocket,
            "onMessage": this.onMessageWebSocket,
            "onConnect": this.onConnectWebSocket
        });

    }

    disconnect (): void {

        logger.debug("Disconnecting WebSocket Connection");
        this.webSocket.disconnect();

    }

}
