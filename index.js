process.env.NODE_NO_WARNINGS = '1';

const { Client } = require('@trickstarcandina/discordjs-selfbot');
const blessed = require('blessed');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'datas', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = config.token;

const client = new Client({
    ws: { properties: { $os: 'Windows', $browser: 'Discord iOS', $device: 'iPhone' } },
    http: { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Discord/250.10' } }
});

let currentGuild = null;
let currentChannel = null;

const screen = blessed.screen({ smartCSR: true, fullUnicode: true });

const terminalBox = blessed.box({
    top: 0, left: 0, width: '33%', height: '85%',
    border: { type: 'line' }, style: { border: { fg: 'red' }, bg: 'black' },
    label: ' TERMINAL ', scrollable: true, alwaysScroll: true, mouse: true, keys: true, tags: true,
    content: '{yellow-fg}Tapez !help pour les commandes.{/}'
});

const chatBox = blessed.box({
    top: 0, left: '33%', width: '33%', height: '85%',
    border: { type: 'line' }, style: { border: { fg: 'cyan' }, bg: 'black' },
    label: ' CHAT ', scrollable: true, alwaysScroll: true, mouse: true, keys: true, tags: true,
    content: '{yellow-fg}Cliquez ici pour le selectionner.{/}'
});

const infoBox = blessed.box({
    top: 0, left: '66%', width: '34%', height: '85%',
    border: { type: 'line' }, style: { border: { fg: 'green' }, bg: 'black' },
    label: ' SERV / AMIS / DISCUSSIONS ', scrollable: true, alwaysScroll: true, mouse: true, keys: true, tags: true,
    content: '{yellow-fg}Chargement initial...{/}'
});

const inputBox = blessed.textbox({
    bottom: 0, left: 0, width: '100%', height: 3,
    border: { type: 'line' }, 
    style: { fg: 'white', bg: 'black', border: { fg: 'magenta' }, focus: { fg: 'cyan', bg: 'black', border: { fg: 'magenta' } } },
    label: ' C:\\> ',
    inputOnFocus: true
});

screen.append(terminalBox);
screen.append(chatBox);
screen.append(infoBox);
screen.append(inputBox);

screen.on('click', () => {
    inputBox.focus();
    screen.render();
});

function cleanText(text) {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '').slice(0, 25);
}

function truncateMessage(text) {
    if (!text) return '';
    text = text.replace(/</g, '\\<').replace(/>/g, '\\>').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
    return text.slice(0, 60);
}

function terminalLog(text) {
    terminalBox.pushLine(text);
    terminalBox.setScrollPerc(100);
    screen.render();
}

function chatLog(text) {
    chatBox.pushLine(text);
    chatBox.setScrollPerc(100);
    screen.render();
}

function updateInfoPanel(content) {
    infoBox.setContent(content);
    screen.render();
}

function getDMChannels() {
    if (client.privateChannels && client.privateChannels.cache) {
        return client.privateChannels.cache;
    }
    return client.channels.cache.filter(c => c.type === 'DM');
}

function getTextChannelsWithCategories(guild) {
    const categories = [...guild.channels.cache.filter(c => c.type === 4 || c.type === 'GUILD_CATEGORY').values()].sort((a, b) => a.position - b.position);
    const orphans = [...guild.channels.cache.filter(c => (c.type === 0 || c.type === 'GUILD_TEXT') && !c.parentId).values()].sort((a, b) => a.position - b.position);

    let content = "";

    if (orphans.length > 0) {
        content += "{yellow-fg}Salons sans categorie :{/}\n";
        orphans.forEach(c => {
            content += "  {cyan-fg}#" + cleanText(c.name) + "{/} {yellow-fg}[" + c.id + "]{/}\n";
        });
        content += "\n";
    }

    categories.forEach(cat => {
        content += "{yellow-fg}" + cleanText(cat.name) + "{/}\n";
        const children = [...guild.channels.cache.filter(c => (c.type === 0 || c.type === 'GUILD_TEXT') && c.parentId === cat.id).values()].sort((a, b) => a.position - b.position);
        children.forEach(c => {
            content += "  {cyan-fg}#" + cleanText(c.name) + "{/} {yellow-fg}[" + c.id + "]{/}\n";
        });
        content += "\n";
    });

    return content;
}

function updateGlobalInfo() {
    const servers = [...client.guilds.cache.values()];
    const friends = [...client.relationships.friendCache.values()];
    const dms = [...getDMChannels().values()];

    let content = "{green-fg}=== VUE D'ENSEMBLE ==={/}\n\n";

    content += "{cyan-fg}SERVEURS (" + servers.length + "){/}\n";
    if (servers.length > 0) {
        servers.forEach(g => {
            content += "{cyan-fg}" + cleanText(g.name) + "{/} {yellow-fg}[" + g.id + "]{/}\n";
        });
    } else {
        content += "{gray-fg}Aucun serveur{/}\n";
    }

    content += "\n{cyan-fg}AMIS (" + friends.length + "){/}\n";
    if (friends.length > 0) {
        friends.forEach(u => {
            content += "{cyan-fg}" + cleanText(u.username) + "{/} {yellow-fg}[" + u.id + "]{/}\n";
        });
    } else {
        content += "{gray-fg}Aucun ami{/}\n";
    }

    content += "\n{cyan-fg}DISCUSSIONS (" + dms.length + "){/}\n";
    if (dms.length > 0) {
        dms.forEach(c => {
            content += "{cyan-fg}" + cleanText(c.recipient?.username || 'Inconnu') + "{/} {yellow-fg}[" + c.id + "]{/}\n";
        });
    } else {
        content += "{gray-fg}Aucune discussion (tapez !dms pour charger){/}\n";
    }

    content += "\n{yellow-fg}Pour scroller salons : Touches [ et ]{/}\n";
    content += "{yellow-fg}Pour scroller chat : !scrollupmsg / !scrolldownmsg{/}\n";
    content += "{yellow-fg}Pour entrer : !servers [ID]{/}\n";
    content += "{yellow-fg}Pour salon : !channels [ID]{/}";
    content += "\n{yellow-fg}Pour DM : !dm [ID]{/}";
    content += "\n{yellow-fg}Pour quitter : !exit{/}";

    updateInfoPanel(content);
}

async function loadAllData() {
    terminalLog('{gray-fg}[SYSTÈME]{/} Recuperation des donnees...');
    await new Promise(r => setTimeout(r, 2000));

    try { await client.guilds.fetch(); } catch(e) {}
    const guilds = [...client.guilds.cache.values()];
    for (let g of guilds) {
        try { await g.fetch(); } catch(e) {}
    }

    try { await client.relationships.fetch(); } catch(e) {}
    try { await client.user.fetch(); } catch(e) {}
    
    try {
        if (client.privateChannels) {
            await client.privateChannels.fetch();
        }
    } catch(e) {}

    updateGlobalInfo();
    terminalLog('{green-fg}[SYSTÈME]{/} Donnees chargees !');
    screen.render();
}

inputBox.focus();
screen.render();

inputBox.on('submit', async (text) => {
    const input = text.trim();
    inputBox.clearValue();
    screen.render();
    if (!input) return;

    const args = input.split(' ');
    const cmd = args.shift().toLowerCase();

    switch (cmd) {
        case '!help':
            terminalLog('{yellow-fg}Commandes :{/} !home, !servers <ID>, !channels <ID>, !say <msg>, !dms, !dm <ID>, !exit, !scrollup, !scrolldown, !scrollupmsg, !scrolldownmsg');
            break;
        case '!exit':
            process.exit(0);
            break;
        case '!scrollup':
            infoBox.scroll(-10);
            screen.render();
            break;
        case '!scrolldown':
            infoBox.scroll(10);
            screen.render();
            break;
        case '!scrollupmsg':
            chatBox.scroll(-10);
            screen.render();
            break;
        case '!scrolldownmsg':
            chatBox.scroll(10);
            screen.render();
            break;
        case '!clear':
            chatBox.setContent('');
            terminalLog('{gray-fg}[SYSTÈME]{/} Chat efface.');
            break;
        case '!home':
            updateGlobalInfo();
            terminalLog('{gray-fg}[SYSTÈME]{/} Vue globale affichee.');
            break;
        case '!servers':
            if (!args[0]) {
                updateGlobalInfo();
                terminalLog('{gray-fg}[SYSTÈME]{/} Utilisez !home pour la vue globale, ou !servers <ID> pour entrer.');
            } else {
                const inputID = args[0];
                const g = client.guilds.cache.find(g => g.id === inputID);
                
                if (!g) {
                    try {
                        const fetchedGuild = await client.guilds.fetch(inputID);
                        currentGuild = fetchedGuild;
                        currentChannel = null;
                        updateInfoPanel(`{green-fg}=== SERVEUR ACTIF ==={/}\n\n{cyan-fg}Nom : {/}${cleanText(fetchedGuild.name)}\n{yellow-fg}ID : ${fetchedGuild.id}{/}\n\n` + getTextChannelsWithCategories(fetchedGuild));
                        terminalLog(`{green-fg}[SYSTÈME]{/} Vous etes sur le serveur : ${cleanText(fetchedGuild.name)}.`);
                    } catch(e) {
                        terminalLog('{red-fg}[ERREUR]{/} Serveur introuvable. Verifiez l\'ID.');
                    }
                } else {
                    try { await g.fetch(); } catch(e) {}
                    currentGuild = g;
                    currentChannel = null;
                    updateInfoPanel(`{green-fg}=== SERVEUR ACTIF ==={/}\n\n{cyan-fg}Nom : {/}${cleanText(g.name)}\n{yellow-fg}ID : ${g.id}{/}\n\n` + getTextChannelsWithCategories(g));
                    terminalLog(`{green-fg}[SYSTÈME]{/} Vous etes sur le serveur : ${cleanText(g.name)}.`);
                }
            }
            break;
        case '!channels':
            if (!currentGuild) return terminalLog('{red-fg}[ERREUR]{/} Utilisez d\'abord !servers <ID>.');
            if (!args[0]) {
                updateInfoPanel(`{green-fg}=== SALONS TEXTUELS (${cleanText(currentGuild.name)}) ==={/}\n\n` + getTextChannelsWithCategories(currentGuild));
                terminalLog('{gray-fg}[SYSTÈME]{/} Liste des salons. Tapez !channels <ID> pour entrer.');
            } else {
                const ch = currentGuild.channels.cache.find(c => c.id === args[0] && (c.type === 0 || c.type === 'GUILD_TEXT'));
                if (!ch) return terminalLog('{red-fg}[ERREUR]{/} Salon textuel introuvable ou c\'est un salon vocal.');
                
                currentChannel = ch;
                updateInfoPanel(`{green-fg}=== SALON ACTIF ==={/}\n\n{cyan-fg}Nom : {/}#${cleanText(ch.name)}\n{yellow-fg}ID : ${ch.id}{/}\n\n{yellow-fg}100 derniers messages charges !{/}`);

                chatBox.setContent('');
                try {
                    await ch.fetch().catch(() => {});
                    const messages = await ch.messages.fetch({ limit: 100 });
                    const sortedMessages = [...messages.values()].reverse();
                    sortedMessages.forEach(msg => {
                        const author = cleanText(msg.author.username);
                        chatLog(`{cyan-fg}${author} : {/}{white-fg}${truncateMessage(msg.content)}{/}`);
                    });
                } catch(e) {
                    chatLog('{red-fg}[ERREUR]{/} Impossible de charger les 100 derniers messages.');
                    terminalLog('{red-fg}[DETAIL ERREUR]{/} ' + e.message);
                }
                
                terminalLog(`{green-fg}[SYSTÈME]{/} Vous etes dans le salon : #${cleanText(ch.name)}. 100 derniers messages recuperes.`);
            }
            break;
        case '!dms':
            try { if (client.privateChannels) await client.privateChannels.fetch(); } catch(e) {}
            const dms = getDMChannels();
            updateInfoPanel(`{green-fg}=== DISCUSSIONS ==={/}\n\n${[...dms.values()].map(c => `{cyan-fg}${cleanText(c.recipient?.username || 'Inconnu')}{/} {yellow-fg}[${c.id}]{/}`).join('\n')}`);
            terminalLog('{green-fg}[SYSTÈME]{/} Liste des DMs chargee.');
            break;
        case '!dm':
            if (!args[0]) return terminalLog('{red-fg}[ERREUR]{/} Utilisation : !dm <ID>');
            const inputID = args[0];
            
            let dmChannel = getDMChannels().find(c => c.id === inputID);
            
            if (!dmChannel) {
                try {
                    const user = await client.users.fetch(inputID);
                    dmChannel = await user.createDM();
                } catch(e) {
                    try {
                        dmChannel = await client.channels.fetch(inputID);
                    } catch(e2) {
                        return terminalLog('{red-fg}[ERREUR]{/} Utilisateur ou discussion introuvable.');
                    }
                }
            }
            
            currentGuild = null;
            currentChannel = dmChannel;
            updateInfoPanel(`{green-fg}=== DISCUSSION ACTIVE ==={/}\n\n{cyan-fg}Nom : {/}${cleanText(dmChannel.recipient?.username || 'Inconnu')}\n{yellow-fg}ID : ${dmChannel.id}{/}\n\n{yellow-fg}Tapez !say <message> pour parler.{/}`);
            terminalLog(`{green-fg}[SYSTÈME]{/} Vous parlez a : ${cleanText(dmChannel.recipient?.username || 'Inconnu')}`);
            break;
        case '!friends':
            updateInfoPanel(`{green-fg}=== AMIS ==={/}\n\n${[...client.relationships.friendCache.values()].map(u => `{cyan-fg}${cleanText(u.username)}{/} {yellow-fg}[${u.id}]{/}`).join('\n')}`);
            terminalLog('{green-fg}[SYSTÈME]{/} Liste des amis chargee.');
            break;
        case '!say':
            if (!currentChannel) return terminalLog('{red-fg}[ERREUR]{/} Utilisez !channels <ID> ou !dm <ID>.');
            const message = args.join(' ');
            if (!message) return terminalLog('{red-fg}[ERREUR]{/} Message vide.');
            currentChannel.send(message).then(() => {
                const pseudo = cleanText(client.user.username);
                chatLog(`{magenta-fg}${pseudo} : {/}{white-fg}${truncateMessage(message)}{/}`);
            }).catch(err => terminalLog(`{red-fg}[ERREUR]{/} Impossible d'envoyer : ${err.message}`));
            break;
        default:
            terminalLog('{red-fg}[ERREUR]{/} Commande inconnue. Tapez !help');
    }
    inputBox.focus();
});

client.on('clientReady', () => {
    terminalLog(`{green-fg}[SYSTÈME]{/} Connecte en tant que : ${client.user.tag}`);
    terminalLog(`{gray-fg}[SYSTÈME]{/} Initialisation...`);
    loadAllData();
});

client.on('messageCreate', (message) => {
    if (message.author.id === client.user.id) return;
    if (!currentChannel || message.channelId !== currentChannel.id) return;
    const author = cleanText(message.author.username);
    chatLog(`{cyan-fg}${author} : {/}{white-fg}${truncateMessage(message.content)}{/}`);
});

client.on('messageDelete', (message) => {
    if (message.partial) return;
    if (!currentChannel || message.channelId !== currentChannel.id) return;
    const author = cleanText(message.author?.username || 'Inconnu');
    chatLog(`{red-fg}[SUPPRIME] ${author} : ${truncateMessage(message.content) || '(Message supprime sans contenu)'}{/}`);
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    if (!currentChannel || newMessage.channelId !== currentChannel.id) return;
    const author = cleanText(newMessage.author?.username || 'Inconnu');
    chatLog(`{yellow-fg}[EDIT] ${author} : ${truncateMessage(oldMessage.content)} -> ${truncateMessage(newMessage.content)}{/}`);
});

screen.key(['C-c'], () => process.exit(0));
client.login(token);