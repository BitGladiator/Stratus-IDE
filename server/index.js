const http = require('http')
const express = require('express')
const fs = require('fs/promises')
const { Server: SocketServer } = require('socket.io')
const path = require('path')
const cors = require('cors')
const chokidar = require('chokidar');
const pty = require('node-pty')

// Store terminal processes for each socket
const terminalProcesses = new Map()

const app = express()
const server = http.createServer(app);
const io = new SocketServer({
    cors: '*'
})

app.use(cors())
io.attach(server);

// File watcher
chokidar.watch('./user').on('all', (event, path) => {
    io.emit('file:refresh', path)
});

io.on('connection', (socket) => {
    console.log(`Socket connected`, socket.id)

    // Create terminal process for this socket
    const ptyProcess = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.INIT_CWD + '/user',
        env: process.env
    });

    // Store the process
    terminalProcesses.set(socket.id, ptyProcess)

    // Send data to client
    ptyProcess.onData(data => {
        socket.emit('terminal:data', data)
    })

    // Handle process exit and restart
    ptyProcess.onExit(() => {
        console.log('Terminal process exited, restarting...')
        // Clean up and create new process
        terminalProcesses.delete(socket.id)
        setTimeout(() => {
            const newProcess = pty.spawn('bash', [], {
                name: 'xterm-color',
                cols: 80,
                rows: 24,
                cwd: process.env.INIT_CWD + '/user',
                env: process.env
            });
            terminalProcesses.set(socket.id, newProcess)
            newProcess.onData(data => {
                socket.emit('terminal:data', data)
            })
        }, 1000)
    })

    socket.emit('file:refresh')

    // Handle file changes
    socket.on('file:change', async ({ path, content }) => {
        await fs.writeFile(`./user${path}`, content)
    })

    // Handle terminal input
    socket.on('terminal:write', (data) => {
        const ptyProcess = terminalProcesses.get(socket.id)
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    })

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Socket disconnected', socket.id)
        const ptyProcess = terminalProcesses.get(socket.id)
        if (ptyProcess) {
            ptyProcess.kill()
            terminalProcesses.delete(socket.id)
        }
    })
})

// API routes
app.get('/files', async (req, res) => {
    const fileTree = await generateFileTree('./user');
    return res.json({ tree: fileTree })
})

app.get('/files/content', async (req, res) => {
    const path = req.query.path;
    const content = await fs.readFile(`./user${path}`, 'utf-8')
    return res.json({ content })
})

server.listen(9000, () => console.log(`🐳 Docker server running on port 9000`))

async function generateFileTree(directory) {
    const tree = {}

    async function buildTree(currentDir, currentTree) {
        const files = await fs.readdir(currentDir)

        for (const file of files) {
            const filePath = path.join(currentDir, file)
            const stat = await fs.stat(filePath)

            if (stat.isDirectory()) {
                currentTree[file] = {}
                await buildTree(filePath, currentTree[file])
            } else {
                currentTree[file] = null
            }
        }
    }

    await buildTree(directory, tree);
    return tree
}