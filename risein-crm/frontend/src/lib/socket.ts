import { io, Socket } from "socket.io-client";

const SOCKET_URL = ""; // Use relative paths for browser-side WebSocket

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, { autoConnect: true, reconnection: true });
    }
    return socket;
}
