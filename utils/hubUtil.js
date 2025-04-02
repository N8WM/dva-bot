// utils/hubUtil.js
const { EmbedBuilder, ChannelType, TextChannel, Guild } = require('discord.js');

/**
 * @param {TextChannel} channel
 */
async function getChannelThreads(channel) {
    const activeThreads = await channel.threads.fetchActive();
    let archivedThreads = await channel.threads.fetchArchived();
    for (let i = 0; i < 5 && archivedThreads.hasMore; i++)
        archivedThreads = await channel.threads.fetchArchived();

    return activeThreads.threads
        .concat(archivedThreads.threads)
        .filter(t => t.type == ChannelType.PublicThread);
}

module.exports = {
    /**
     * @param {TextChannel} channel
     */
    async getChannelThreads(channel) {
        return getChannelThreads(channel);
    },

    /** 
     * Rebuild the thread list message for the given hub channel.
     * This fetches all threads in the channel.
     */
    async updateThreadList(client, hubChannel) {
        const hubData = client.hubChannels.get(hubChannel.id);
        if (!hubData) return;  // not a tracked hub
        // Only update if hub is active (if inactive, we leave the list frozen)
        if (!hubData.active) return;

        let threadListMsg = hubData.message;
        // Fetch all threads in the guild
        let fetchedThreads;
        try {
            fetchedThreads = await getChannelThreads(hubChannel);
        } catch (err) {
            console.error('Could not fetch threads:', err);
            return;
        }

        // Sort threads by creation time (oldest first for stable order, or newest first as desired)
        fetchedThreads.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Build the list description
        let description;
        const symbol = t => t.viewable ? (t.locked ? '🔒' : t.archived ? '💤' : '') : '❓';

        if (fetchedThreads.size === 0) {
            description = '*No threads yet.*';
        } else {
            description = fetchedThreads.map(t => `## ${symbol(t)} <#${t.id}>`).join('\n');
        }

        // Build or update embed
        let embed;
        if (threadListMsg.embeds[0]) {
            // Update existing embed in the message
            embed = EmbedBuilder.from(threadListMsg.embeds[0])
                .setDescription(description);
            // Also update footer to reflect count
            const countText = fetchedThreads.size === 1 ? '1 thread' : `${fetchedThreads.size} threads`;
            embed.setFooter({ text: `Hub Active – ${countText}` });
        } else {
            // If somehow no embed (should not happen since we always use embed), create a new one
            embed = new EmbedBuilder()
                .setTitle('📌 Thread Hub')
                .setColor(0x3ba55d)
                .setDescription(description)
                .setFooter({ text: `Hub Active – ${fetchedThreads.size} threads` });
        }

        try {
            await threadListMsg.edit({ embeds: [embed] });
        } catch (err) {
            console.error('Failed to update thread list message:', err);
            // If the message was deleted or unavailable, remove from hubChannels
            if (err.code === 10008) { // Unknown Message
                client.hubChannels.delete(hubChannel.id);
            }
        }
    },

    /**
     * @param {Guild} guild
     */
    async updateRebindHubData(guild) {
        // Filter for text channels whose name ends with "-hub"
        const hubChannels = guild.channels.cache.filter(channel =>
            channel.isTextBased() && channel.name.endsWith('-hub')
        );

        for (const [channelId, channel] of hubChannels) {
            if (channel.type != ChannelType.GuildText) continue;
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
                        firstMessage.author.id === guild.client.user.id &&
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
                    guild.client.hubChannels.set(channel.id, { message: firstMessage, active: true });

                    // Optionally update the thread list to reflect current threads
                    const { updateThreadList } = require('../utils/hubUtil');
                    await updateThreadList(guild.client, channel);
                }
            } catch (err) {
                console.error(`Error processing hub channel ${channel.id}:`, err);
            }
        }
    }
};
