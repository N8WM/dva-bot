// events/messageCreate.js
module.exports = {
    name: 'messageCreate',
    execute: async (message, client) => {
        // Ignore messages from bots or system (webhooks, etc.)
        if (message.author.bot && message.embeds.length > 0) return;
        // Only care about messages in channels that are active hubs
        const hubData = client.hubChannels.get(message.channel.id);
        if (!hubData || !hubData.active) return;

        // At this point, this is a message in an active hub channel by a user -> delete it
        try {
            await message.delete();
        } catch (err) {
            console.warn('Failed to delete a message in hub:', err);
            return;
        }
    }
};
