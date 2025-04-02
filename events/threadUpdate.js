// events/threadUpdate.js
module.exports = {
    name: 'threadUpdate',
    execute: async (oldThread, newThread) => {
        const parentId = newThread.parentId;
        if (!parentId) return;
        const hubData = newThread.client.hubChannels.get(parentId);
        if (!hubData || !hubData.active) return;
        const parentChannel = newThread.guild.channels.cache.get(parentId);
        if (parentChannel) {
            const { updateThreadList } = require('../utils/hubUtil');
            await updateThreadList(newThread.client, parentChannel);
        }
    }
};
