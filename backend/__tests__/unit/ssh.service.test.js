const sshService = require('../../src/services/ssh.service');
const { Client } = require('ssh2');
const WebSocket = require('ws');

// Mock dependencies
jest.mock('ssh2', () => {
    return {
        Client: jest.fn()
    };
});

jest.mock('ws', () => {
    return {
        Server: jest.fn(),
        OPEN: 1
    };
});

describe('SSHService', () => {
    let mockClient;
    let mockWsServer;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Client mock
        mockClient = {
            on: jest.fn().mockReturnThis(),
            connect: jest.fn(),
            exec: jest.fn(),
            end: jest.fn(),
            shell: jest.fn()
        };
        Client.mockImplementation(() => mockClient);

        // Setup WebSocket Server mock
        mockWsServer = {
            on: jest.fn()
        };
        WebSocket.Server.mockImplementation(() => mockWsServer);

        // Reset service state
        sshService.sessions = new Map();
        sshService.wss = null;
    });

    // Helper to simulate typing
    const typeCredentials = (wsMessageHandler, password) => {
        for (const char of password) {
            wsMessageHandler(JSON.stringify({ type: 'input', data: char }));
        }
        wsMessageHandler(JSON.stringify({ type: 'input', data: '\n' }));
    };

    describe('init', () => {
        it('should initialize WebSocket server', () => {
            const mockHttpServer = {};
            sshService.init(mockHttpServer);
            expect(WebSocket.Server).toHaveBeenCalledWith({
                server: mockHttpServer,
                path: '/ws/ssh'
            });
            expect(mockWsServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
        });

        it('should handle incoming connections', () => {
            sshService.init({});
            const connectionHandler = mockWsServer.on.mock.calls.find(call => call[0] === 'connection')[1];

            const mockWs = {
                send: jest.fn(),
                close: jest.fn(),
                on: jest.fn(),
                readyState: WebSocket.OPEN
            };
            const mockReq = { url: '/ws/ssh?vmid=100&host=1.2.3.4' };

            // Spy on createSSHSession
            const createSpy = jest.spyOn(sshService, 'createSSHSession');
            createSpy.mockImplementation(() => { });

            connectionHandler(mockWs, mockReq);

            expect(createSpy).toHaveBeenCalledWith(mockWs, '100', '1.2.3.4');
            createSpy.mockRestore();
        });

        it('should reject missing params', () => {
            sshService.init({});
            const connectionHandler = mockWsServer.on.mock.calls.find(call => call[0] === 'connection')[1];

            const mockWs = { send: jest.fn(), close: jest.fn() };
            const mockReq = { url: '/ws/ssh' }; // Missing vmid

            connectionHandler(mockWs, mockReq);

            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('error'));
            expect(mockWs.close).toHaveBeenCalled();
        });
    });

    describe('createSSHSession', () => {
        let mockWs;

        beforeEach(() => {
            mockWs = {
                send: jest.fn(),
                close: jest.fn(),
                on: jest.fn(),
                readyState: WebSocket.OPEN
            };
        });

        it('should create session and handle auth flow', () => {
            sshService.createSSHSession(mockWs, '100', '1.2.3.4');

            expect(Client).toHaveBeenCalled();
            expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));

            // Simulate 'auth' message from frontend
            const wsMessageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
            wsMessageHandler(JSON.stringify({ type: 'auth', username: 'root' }));

            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining("password:"));

            // Simulate password input char by char
            typeCredentials(wsMessageHandler, 'pass');

            expect(mockClient.connect).toHaveBeenCalledWith(expect.objectContaining({
                host: '1.2.3.4',
                username: 'root',
                password: 'pass'
            }));
        });

        it('should handle ready event and shell creation', () => {
            sshService.createSSHSession(mockWs, '100', '1.2.3.4');

            // Get client event handlers
            const readyHandler = mockClient.on.mock.calls.find(call => call[0] === 'ready')[1];

            readyHandler();

            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'connected' }));
            expect(mockClient.shell).toHaveBeenCalled();
        });

        it('should handle shell data and closing', () => {
            sshService.createSSHSession(mockWs, '100', '1.2.3.4');
            const readyHandler = mockClient.on.mock.calls.find(call => call[0] === 'ready')[1];
            readyHandler();

            const shellCallback = mockClient.shell.mock.calls[0][1];
            const mockStream = {
                on: jest.fn(),
                write: jest.fn()
            };

            shellCallback(null, mockStream);

            // Check data forwarding
            const dataHandler = mockStream.on.mock.calls.find(call => call[0] === 'data')[1];
            dataHandler(Buffer.from('hello'));
            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('hello'));

            // Check close handling
            const closeHandler = mockStream.on.mock.calls.find(call => call[0] === 'close')[1];
            closeHandler();
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'disconnect' }));
            expect(mockWs.close).toHaveBeenCalled();
        });

        it('should handle keyboard interactive', () => {
            sshService.createSSHSession(mockWs, '100', '1.2.3.4');
            // Simulate calling connect
            const wsMessageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
            wsMessageHandler(JSON.stringify({ type: 'auth', username: 'root' }));

            typeCredentials(wsMessageHandler, 'pass');

            const kbiHandler = mockClient.on.mock.calls.find(call => call[0] === 'keyboard-interactive')[1];
            const finish = jest.fn();

            kbiHandler('name', 'inst', 'lang', ['prompt'], finish);

            expect(finish).toHaveBeenCalledWith(['pass']);
        });

        it('should handle client error', () => {
            sshService.createSSHSession(mockWs, '100', '1.2.3.4');
            const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];

            jest.useFakeTimers();
            errorHandler(new Error('Connection failed'));

            expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('SSH Error'));
            jest.runAllTimers();
            expect(mockWs.close).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe('execCommand', () => {
        it('should execute command and return stdout', async () => {
            const host = '1.2.3.4';
            const cmd = 'echo hello';
            const mockStream = {
                on: jest.fn().mockReturnThis(),
                stderr: { on: jest.fn().mockReturnThis() }
            };

            mockClient.on.mockImplementation((event, cb) => {
                if (event === 'ready') setTimeout(cb, 0);
                return mockClient;
            });

            mockClient.exec.mockImplementation((command, cb) => {
                cb(null, mockStream);
                const dataHandler = mockStream.on.mock.calls.find(call => call[0] === 'data')[1];
                const closeHandler = mockStream.on.mock.calls.find(call => call[0] === 'close')[1];

                setTimeout(() => {
                    dataHandler('hello output');
                    closeHandler(0, null);
                }, 10);
            });

            const result = await sshService.execCommand(host, cmd, { password: 'pass' });
            expect(result).toBe('hello output');
            expect(mockClient.connect).toHaveBeenCalled();
            expect(mockClient.end).toHaveBeenCalled();
        });

        it('should reject on connection error', async () => {
            mockClient.on.mockImplementation((event, cb) => {
                if (event === 'error') {
                    setTimeout(() => cb(new Error('Connection refused')), 0);
                }
                return mockClient;
            });

            await expect(sshService.execCommand('1.2.3.4', 'cmd')).rejects.toThrow('Connection refused');
        });
    });
});
