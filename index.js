const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const http = require("http");
const config = require("./config");

// Render Web Server
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Wade Bot is Running");
}).listen(PORT);

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                startBot();
            }

        } else if (connection === "open") {
            console.log("✅ Wade Bot Connected");
        }

    });

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];

        if (!msg.message || msg.key.fromMe) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        // Ping
        if (text === `${config.PREFIX}ping`) {

            await sock.sendMessage(msg.key.remoteJid, {
                text: "🏓 Pong!"
            });

        }

        // Hello
        if (text === `${config.PREFIX}hello`) {

            await sock.sendMessage(msg.key.remoteJid, {
                text: "Hello 👋"
            });

        }

        // Owner
        if (text === `${config.PREFIX}owner`) {

            await sock.sendMessage(msg.key.remoteJid, {
                text: `👑 Owner: ${config.OWNER_NAME}`
            });

        }

        // Menu
        if (text === `${config.PREFIX}menu`) {

            const menu = `
╭━━━〔 ${config.BOT_NAME} 〕━━━⬣
┃ 👑 Owner : ${config.OWNER_NAME}
┃ ⚡ Status : Online
┃ 🤖 Prefix : ${config.PREFIX}
╰━━━━━━━━━━━━━━⬣

📋 *MAIN MENU*

🏓 ${config.PREFIX}ping
👋 ${config.PREFIX}hello
👑 ${config.PREFIX}owner
📜 ${config.PREFIX}menu

━━━━━━━━━━━━━━━━━━
Powered By ${config.OWNER_NAME}
`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: menu
            });

        }

    });

}

startBot();
