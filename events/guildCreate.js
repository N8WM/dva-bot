const { updateRebindHubData } = require("../utils/hubUtil");

// events/guildCreate.js
module.exports = {
    name: 'guildCreate',
    execute: async (guild) => {
        await updateRebindHubData(guild);
    }
};
