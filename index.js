// index.js
require('dotenv').config();  // Load environment variables from .env

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Create the client with necessary intents.
// We need Guilds (for threads & channels), and GuildMessages (for message create/delete events).
const client = new Client({ intents: [ 
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages 
] });

// Prepare collections to hold commands and active hub data
client.commands = new Collection();
client.hubChannels = new Map();  // Map of hub channel ID -> { message: Message, active: boolean }

// Dynamically read command files
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    }
}

// Dynamically register event handlers
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(eventsPath, file));
    if (event.name) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// Log in to Discord with the bot token
client.login(process.env.DISCORD_TOKEN);
