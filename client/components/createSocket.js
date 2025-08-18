// client/components/createSocket.js
import { io } from "socket.io-client";

export function createSocket(token) {
  const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
  return io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket"],
  });
}
