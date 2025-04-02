// commands/thread.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ThreadAutoArchiveDuration, ChannelType: ChType, MessageFlags } = require('discord.js');
const { updateThreadList, getChannelThreads } = require('../utils/hubUtil');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thread')
        .setDescription('Create or manage discussion threads in a hub channel')
        .setDMPermission(false)
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Create a new thread in this hub channel')
            .addStringOption(opt => opt.setName('name').setDescription('Thread topic/title').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('delete')
            .setDescription('Delete a thread')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const hubChannel = interaction.channel;
        // Ensure parent channel exists and is a text channel or thread
        if (!hubChannel) {
            return interaction.reply({ content: '❌ This command cannot be used here.', flags: MessageFlags.Ephemeral });
        }

        if (sub === 'create') {
            // The command must be used in a hub channel (not inside a thread)
            if (hubChannel.type !== ChannelType.GuildText) {
                return interaction.reply({ content: '❌ Use `/thread create` in the hub channel, not inside a thread.', flags: MessageFlags.Ephemeral });
            }
            // Check that channel is an active hub
            const hubData = client.hubChannels.get(hubChannel.id);
            if (!hubData || !hubData.active) {
                return interaction.reply({ content: '❌ This channel is not an active hub. Use `/hub activate` first.', flags: MessageFlags.Ephemeral });
            }
            const threadName = interaction.options.getString('name').trim();
            if (threadName.length === 0) {
                return interaction.reply({ content: '❌ Please provide a valid thread name.', flags: MessageFlags.Ephemeral });
            }
            try {
                // Create the thread in this channel
                const thread = await hubChannel.threads.create({
                    name: threadName,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,  // default archive time (24h)
                    type: ChannelType.GuildPublicThread,
                    reason: `Thread created by ${interaction.user.tag}`
                });
                // Optionally, we could send a welcome message in the thread or add the user.
                // By default, thread creator (bot) and all can join public thread.
                thread.send(`${interaction.user}`).catch(() => {})
                setTimeout(() => thread.leave().catch(()=>{}), 1000);
            } catch (error) {
                console.error('Thread creation failed:', error);
                return interaction.reply({ 
                    content: '❌ Failed to create thread. Make sure I have permission to Create Threads in this channel.', 
                    flags: MessageFlags.Ephemeral
                });
            }
            // Update the hub list to include the new thread
            await updateThreadList(client, hubChannel);

            return interaction.reply({ content: `✅ Thread **${interaction.options.getString('name')}** created! (See the thread list above.)`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'delete') {
            // Determine context: inside a thread or in a hub channel
            if (hubChannel.isThread()) {
                // If used inside a thread channel, delete that thread
                const thread = hubChannel;  // alias for clarity
                const parentId = thread.parentId;
                const parentData = client.hubChannels.get(parentId);
                if (!parentData || !parentData.active) {
                    return interaction.reply({ content: '❌ Deleting threads outside of a thread hub is not supported.'})
                }
                // Permission check: allow thread owner or mods to delete, otherwise deny
                if (thread.ownerId !== interaction.user.id && 
                    !interaction.memberPermissions.has(PermissionFlagsBits.ManageThreads)) {
                    return interaction.reply({ content: '❌ You don’t have permission to delete this thread.', flags: MessageFlags.Ephemeral });
                }
                interaction.reply({ content: 'Deleting thread...', flags: MessageFlags.Ephemeral });
                try {
                    await thread.delete(`Deleted by ${interaction.user}`);
                } catch (err) {
                    console.error('Failed to delete thread:', err);
                    return interaction.reply({ content: '❌ Failed to delete the thread. I might lack permission.', flags: MessageFlags.Ephemeral });
                }
                // Update the parent hub's thread list if active
                if (parentData && parentData.active) {
                    const parentChannel = interaction.guild.channels.cache.get(parentId);
                    if (parentChannel) {
                        await updateThreadList(client, parentChannel);
                    }
                }
                return;
            } else {
                // Command used in a text channel (hub channel context)
                // Present the dropdown menu of threads
                const hubData = client.hubChannels.get(hubChannel.id);
                if (!hubData || !hubData.active) {
                    return interaction.reply({ content: '❌ This channel is not an active hub.', flags: MessageFlags.Ephemeral });
                }
                // Fetch threads in this channel (to list them)
                const fetchedThreads = await getChannelThreads(hubChannel);
                if (!fetchedThreads.size) {
                    return interaction.reply({ content: 'ℹ️ There are no threads to delete in this channel.', flags: MessageFlags.Ephemeral });
                }
                // Build select menu options for each thread
                const options = fetchedThreads.map(thread => {
                    return {
                        label: thread.name,
                        value: thread.id
                    };
                });
                // (If there are more than 25 threads, Discord select max is 25. In such cases, one might need an alternative method.)
                if (options.length > 25) {
                    // If too many threads, prompt user to use the channel option instead
                    return interaction.reply({ content: '⚠️ Too many threads to list (>25). Please manually delete the thread.', flags: MessageFlags.Ephemeral });
                }
                // Create the select menu component
                const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('delete-thread-select')
                    .setPlaceholder('Select a thread to delete…')
                    .addOptions(options);
                const row = new ActionRowBuilder().addComponents(selectMenu);
                // Reply with the dropdown menu (ephemeral)
                return interaction.reply({ content: 'Select a thread to delete:', components: [row], flags: MessageFlags.Ephemeral });
            }
        }
    }
};
