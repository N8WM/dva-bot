// events/threadCreate.js
module.exports = {
    name: 'threadCreate',
    execute: async (thread, isNew) => {
        if (!isNew) return;
        if (thread.ownerId == thread.client.user.id) return;
        // Only respond to new threads in an active hub channel
        const parentId = thread.parentId;
        if (!parentId) return;
        const hubData = thread.client.hubChannels.get(parentId);
        if (!hubData || !hubData.active) return;
        // Update the thread list in the parent channel
        const parentChannel = thread.guild.channels.cache.get(parentId);
        if (parentChannel) {
            const { updateThreadList } = require('../utils/hubUtil');
            await updateThreadList(thread.client, parentChannel);
        }
    }
};
