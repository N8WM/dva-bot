// utils/hubUtil.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    /** 
     * Rebuild the thread list message for the given hub channel.
     * This fetches all active threads in the guild and filters those under the channel.
     */
    async updateThreadList(client, hubChannel) {
        const hubData = client.hubChannels.get(hubChannel.id);
        if (!hubData) return;  // not a tracked hub
        // Only update if hub is active (if inactive, we leave the list frozen)
        if (!hubData.active) return;

        let threadListMsg = hubData.message;
        // Fetch all active threads in the guild (may include threads from other channels)
        let activeThreads;
        try {
            const fetched = await hubChannel.guild.channels.fetchActiveThreads();
            activeThreads = fetched.threads.filter(t => t.parentId === hubChannel.id);
        } catch (err) {
            console.error('Could not fetch active threads:', err);
            return;
        }

        // Sort threads by creation time (oldest first for stable order, or newest first as desired)
        activeThreads.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Build the list description
        let description;
        if (activeThreads.size === 0) {
            description = '*No active threads.*';
        } else {
            description = activeThreads.map(t => `• <#${t.id}>`).join('\n');
        }

        // Build or update embed
        let embed;
        if (threadListMsg.embeds[0]) {
            // Update existing embed in the message
            embed = EmbedBuilder.from(threadListMsg.embeds[0])
                .setDescription(description);
            // Also update footer to reflect count
            const countText = activeThreads.size === 1 ? '1 thread' : `${activeThreads.size} threads`;
            embed.setFooter({ text: `Hub Active – ${countText}` });
        } else {
            // If somehow no embed (should not happen since we always use embed), create a new one
            embed = new EmbedBuilder()
                .setTitle('📌 Thread Hub')
                .setColor(0x3ba55d)
                .setDescription(description)
                .setFooter({ text: `Hub Active – ${activeThreads.size} threads` });
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
    }
};
