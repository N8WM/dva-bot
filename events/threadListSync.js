// events/threadListSync.js
module.exports = {
    name: 'threadListSync',
    execute: async (threads, guild) => {
        threads.each(async (thread) => {
            const parentId = thread.parentId;
            if (!parentId) return;
            const hubData = thread.client.hubChannels.get(parentId);
            if (!hubData || !hubData.active) return;
            const parentChannel = thread.guild.channels.cache.get(parentId);
            if (parentChannel) {
                const { updateThreadList } = require('../utils/hubUtil');
                await updateThreadList(thread.client, parentChannel);
            }
        });
    }
};
