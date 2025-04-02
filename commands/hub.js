// commands/hub.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const { updateThreadList } = require('../utils/hubUtil');

module.exports = {
    // Build the slash command with subcommands
    data: new SlashCommandBuilder()
        .setName('hub')
        .setDescription('Manage thread hub channels and their thread list')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // only admins by default
        .setDMPermission(false)  // guild only
        .addSubcommand(sub => sub
            .setName('activate')
            .setDescription('Activate this channel as a thread hub (create or refresh thread list)'))
        .addSubcommand(sub => sub
            .setName('deactivate')
            .setDescription('Deactivate hub functionality in this channel (stop updating, keep list)'))
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable hub functionality and remove the thread list message')),
    
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const channel = interaction.channel;  // the channel where command was used

        // Ensure the command is used in a guild text channel
        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ This command can only be used in a server text channel.', flags: MessageFlags.Ephemeral });
        }

        if (sub === 'activate') {
            // Check channel conditions: no messages or only an inactive hub message
            const messages = await channel.messages.fetch({ limit: 2 });
            if (messages.size > 1) {
                return interaction.reply({ 
                    content: '⚠️ The channel is not empty. Please clear messages or disable the existing hub before activating.', 
                    flags: MessageFlags.Ephemeral
                });
            }
            if (!channel.name.endsWith('-hub')) {
                try {
                    channel.setName(channel.name + '-hub');
                } catch (error) {
                    return interaction.reply({ content: '❌ Thread hub channel names must end with the suffix "-hub".', flags: MessageFlags.Ephemeral });
                }
            }
            // If one message exists, verify it is a bot thread list message
            let threadListMsg;
            if (messages.size === 1) {
                const loneMessage = messages.first();
                const isBotList = loneMessage.author.id === client.user.id 
                                   && loneMessage.embeds?.[0]?.title?.includes('Thread Hub');
                if (!isBotList) {
                    return interaction.reply({ 
                        content: '⚠️ There is already a non-hub message in this channel. Please clear it before activating the hub.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                threadListMsg = loneMessage;  // reuse this message
            }

            // Activate the hub
            let embed;
            if (threadListMsg) {
                // Reuse existing embed but mark active
                embed = EmbedBuilder.from(threadListMsg.embeds[0])
                    .setColor(0x3ba55d)  // green color for active
                    .setFooter({ text: 'Hub Active – updating thread list' });
                await threadListMsg.edit({ embeds: [embed] });
            } else {
                // No existing message, create a new one
                embed = new EmbedBuilder()
                    .setTitle('📌 Thread Hub')
                    .setDescription('*No threads yet.*')  // initially no threads
                    .setColor(0x3ba55d)
                    .setFooter({ text: 'Hub Active – updating thread list' });
                threadListMsg = await channel.send({ embeds: [embed] });
            }

            // Record this channel as active hub
            client.hubChannels.set(channel.id, { message: threadListMsg, active: true });
            // Populate the thread list with any existing threads
            await updateThreadList(client, channel);
            return interaction.reply({ content: `✅ This channel is now a hub. Use /thread commands to manage threads.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'deactivate') {
            const hubData = client.hubChannels.get(channel.id);
            if (!hubData || !hubData.active) {
                // Perhaps the channel has a hub message but already inactive
                // Check if there's an existing thread list message in channel
                const existingMsg = (await channel.messages.fetch({ limit: 1 })).first();
                if (existingMsg && existingMsg.author.id === client.user.id && existingMsg.embeds?.[0]?.title?.includes('Thread Hub')) {
                    // There is a hub message, mark it inactive
                    const updatedEmbed = EmbedBuilder.from(existingMsg.embeds[0])
                        .setColor(0x808080)  // grey color for inactive
                        .setFooter({ text: 'Hub Inactive – list not updating' });
                    await existingMsg.edit({ embeds: [updatedEmbed] });
                    client.hubChannels.set(channel.id, { message: existingMsg, active: false });
                    return interaction.reply({ content: 'ℹ️ Hub is already inactive. The thread list will not update until reactivated.', flags: MessageFlags.Ephemeral });
                }
                return interaction.reply({ content: '❌ This channel is not set up as an active hub.', flags: MessageFlags.Ephemeral });
            }
            // We have an active hub to deactivate
            hubData.active = false;
            // Edit the embed to mark inactive
            const embed = EmbedBuilder.from(hubData.message.embeds[0] ?? {})
                .setColor(0x808080)
                .setFooter({ text: 'Hub Inactive – list not updating' });
            await hubData.message.edit({ embeds: [embed] });
            return interaction.reply({ content: '✅ Hub deactivated. (Thread list frozen until you activate again.)', flags: MessageFlags.Ephemeral });
        }

        if (sub === 'disable') {
            const hubData = client.hubChannels.get(channel.id);
            // If not a hub or already disabled
            if (!hubData) {
                // Check if a leftover message exists
                const maybeMsg = (await channel.messages.fetch({ limit: 1 })).first();
                if (!maybeMsg || maybeMsg.author.id !== client.user.id || !maybeMsg.embeds?.[0]?.title?.includes('Thread Hub')) {
                    return interaction.reply({ content: '❌ This channel is not a hub (nothing to disable).', flags: MessageFlags.Ephemeral });
                }
                // It has a hub message but our state was not tracking (possibly after restart). Delete it.
                await maybeMsg.delete().catch(() => {});
                return interaction.reply({ content: '✅ Hub message removed. Hub functionality is fully disabled.', flags: MessageFlags.Ephemeral });
            }
            // We have a record of hub (active or inactive). Delete the list message.
            try {
                await hubData.message.unpin().catch(() => {});
                await hubData.message.delete();
            } catch (error) {
                console.error('Failed to delete hub message:', error);
            }
            client.hubChannels.delete(channel.id);
            return interaction.reply({ content: '✅ Hub disabled and thread list message removed. This channel is no longer a hub.', flags: MessageFlags.Ephemeral });
        }
    }
};
