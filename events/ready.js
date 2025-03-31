// events/ready.js
module.exports = {
    name: 'ready',
    once: true,
    execute: async (client) => {
        console.log(`✅ Logged in as ${client.user.tag}. Bot is ready.`);

        // Loop through all guilds the bot is in
        for (const [guildId, guild] of client.guilds.cache) {
            // Filter for text channels whose name ends with "-hub"
            const hubChannels = guild.channels.cache.filter(channel =>
                channel.isTextBased() && channel.name.endsWith('-hub')
            );

            for (const [channelId, channel] of hubChannels) {
                try {
                    // Fetch recent messages (assuming hub channels remain nearly empty)
                    const messages = await channel.messages.fetch({ limit: 50 });
                    if (!messages.size) continue; // Skip empty channels

                        // Sort messages in ascending order (oldest first)
                        const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                        const firstMessage = sortedMessages.first();

                        // Check if the first message is our hub list embed:
                        // - sent by the bot, and
                        // - its embed footer includes "Hub Active"
                        if (
                            firstMessage.author.id === client.user.id &&
                            firstMessage.embeds.length > 0 &&
                            firstMessage.embeds[0].footer?.text &&
                            firstMessage.embeds[0].footer.text.includes("Hub Active")
                        ) {
                        // Delete any additional messages (keeping the first/hub message)
                        sortedMessages.forEach(msg => {
                            if (msg.id !== firstMessage.id) {
                                msg.delete().catch(err => console.error("Failed to delete message:", err));
                            }
                        });

                        // Cache this channel as an active hub
                        client.hubChannels.set(channel.id, { message: firstMessage, active: true });

                        // Optionally update the thread list to reflect current threads
                        const { updateThreadList } = require('../utils/hubUtil');
                        await updateThreadList(client, channel);
                    }
                } catch (err) {
                    console.error(`Error processing hub channel ${channel.id}:`, err);
                }
            }
        }
    }
};
