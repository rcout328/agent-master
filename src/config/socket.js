import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5002';

const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 60000,
    transports: ['polling', 'websocket'],
    withCredentials: false,
    extraHeaders: {
        'Access-Control-Allow-Origin': '*'
    }
});

// Connection event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
    console.log('Attempting to reconnect...');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect') {
        console.log('Reconnecting...');
        socket.connect();
    }
});

// Safe emit function with retry mechanism
const safeEmit = async (event, data, maxRetries = 3) => {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const tryEmit = () => {
            if (!socket.connected) {
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries}`);
                    setTimeout(tryEmit, 1000 * retries);
                    return;
                }
                reject(new Error('Failed to connect to server'));
                return;
            }

            socket.emit(event, data, (response) => {
                if (response?.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });

            // Set a timeout for the response
            setTimeout(() => {
                reject(new Error('Request timed out'));
            }, 30000); // 30 seconds timeout
        };

        tryEmit();
    });
};

// Check connection status
const checkConnection = () => {
    return socket.connected;
};

// Export the socket instance and helper functions
export { socket, safeEmit, checkConnection }; 