// events/ready.js
const { ActivityType } = require('discord.js');
const { updateRebindHubData } = require('../utils/hubUtil');

module.exports = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        console.log(`✅ Logged in as ${client.user.tag}. Bot is ready.`);

        // Loop through all guilds the bot is in
        for (const [guildId, guild] of client.guilds.cache) {
            await updateRebindHubData(guild);
        }

        const updateStatus = () => {
            const serverCount = client.guilds.cache.size;
            const hubCount = client.hubChannels ? client.hubChannels.size : 0;
            const activityMessage = `${serverCount} servers, ${hubCount} hubs`;

            client.user.setPresence({
                activities: [{ name: activityMessage, type: ActivityType.Watching }],
                status: 'online'
            });
        };

        // Update every 10 minutes (600,000 ms) or as desired
        updateStatus();
        setInterval(updateStatus, 600000);
    }
};
