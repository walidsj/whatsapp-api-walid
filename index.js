const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode')
const Hapi = require('@hapi/hapi')
const SocketIO = require('socket.io')
const Handlebars = require('handlebars')
const Vision = require('@hapi/vision')

const startServer = async () => {
    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
    })

    const io = SocketIO(server.listener)

    await server.register(Vision)

    server.views({
        engines: {
            html: Handlebars,
        },
        relativeTo: __dirname,
        path: 'views',
    })

    server.route({
        method: 'GET',
        path: '/',
        handler: (_request, h) => {
            return h.view('index')
        },
    })

    const client = new Client({
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--unhandled-rejections=strict',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu',
            ],
        },
        authStrategy: new LocalAuth(),
    })

    client.on('message', (msg) => {
        msg.reply('i love you jiilaannn')
    })

    client.initialize()

    io.on('connection', function (socket) {
        socket.emit('message', 'Socket connected....')

        client.on('qr', (qr) => {
            qrcode.toDataURL(qr, (err, url) => {
                socket.emit('qr', url)
                socket.emit('message', 'QR Code received, scan please!')
            })
        })

        client.on('ready', () => {
            socket.emit('ready', 'Whatsapp is ready!')
            socket.emit('message', 'Whatsapp is ready!')
        })

        client.on('authenticated', () => {
            socket.emit('authenticated', true)
            socket.emit('message', 'Whatsapp is authenticated!')
        })

        client.on('auth_failure', function (session) {
            socket.emit('message', 'Auth failure, restarting...')
        })

        client.on('disconnected', (reason) => {
            socket.emit('message', 'Whatsapp is disconnected!')
            client.destroy()
            client.initialize()
        })
    })

    await server.start()
    console.log(`Server running on ${server.info.uri}`)
}

process.on('unhandledRejection', (err) => {
    console.log(err)
    process.exit(1)
})

startServer()
