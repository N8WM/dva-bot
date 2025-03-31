// events/interactionCreate.js
module.exports = {
    name: 'interactionCreate',
    execute: async (interaction, client) => {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, client);
            } catch (err) {
                console.error('Error executing slash command:', err);
                if (!interaction.replied) {
                    interaction.reply({ content: '⚠️ An error occurred while executing that command. I might lack permission for that command, or for this channel.', ephemeral: true }).catch(() => {});
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            // Handle our thread close dropdown
            if (interaction.customId === 'close-thread-select') {
                const threadId = interaction.values[0];
                // Find the thread channel by ID
                let thread;
                try {
                    thread = await interaction.guild.channels.fetch(threadId);
                } catch (err) {
                    console.error('Failed to fetch thread for closing:', err);
                }
                if (!thread) {
                    return interaction.update({ content: '❌ Could not find the selected thread (maybe it was closed already).', components: [] });
                }
                // Permission check as in the command: allow if user is owner or has manage threads
                const userHasPerm = interaction.memberPermissions.has('ManageThreads');
                if (thread.ownerId !== interaction.user.id && !userHasPerm) {
                    return interaction.update({ content: '❌ You do not have permission to close that thread.', components: [] });
                }
                try {
                    await thread.delete(`Closed by ${interaction.user}`);
                } catch (err) {
                    console.error('Error archiving thread via select menu:', err);
                    return interaction.update({ content: '❌ Failed to close the thread. I might lack permission.', components: [] });
                }
                // Update the hub thread list
                const parentChannel = thread.parent;
                if (parentChannel && client.hubChannels.get(parentChannel.id)?.active) {
                    const { updateThreadList } = require('../utils/hubUtil');
                    await updateThreadList(client, parentChannel);
                }
                // Edit the original ephemeral message to confirm and remove the menu
                return interaction.update({ content: `✅ Closed thread **${thread.name}**.`, components: [] });
            }
        }
    }
};
