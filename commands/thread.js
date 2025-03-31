// commands/thread.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ThreadAutoArchiveDuration, ChannelType: ChType } = require('discord.js');
const { updateThreadList } = require('../utils/hubUtil');

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
            .setName('close')
            .setDescription('Close (archive) a thread')
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const hubChannel = interaction.channel;
        // Ensure parent channel exists and is a text channel or thread
        if (!hubChannel) {
            return interaction.reply({ content: '❌ This command cannot be used here.', ephemeral: true });
        }

        if (sub === 'create') {
            // The command must be used in a hub channel (not inside a thread)
            if (hubChannel.type !== ChannelType.GuildText) {
                return interaction.reply({ content: '❌ Use `/thread create` in the hub channel, not inside a thread.', ephemeral: true });
            }
            // Check that channel is an active hub
            const hubData = client.hubChannels.get(hubChannel.id);
            if (!hubData || !hubData.active) {
                return interaction.reply({ content: '❌ This channel is not an active hub. Use `/hub activate` first.', ephemeral: true });
            }
            const threadName = interaction.options.getString('name').trim();
            if (threadName.length === 0) {
                return interaction.reply({ content: '❌ Please provide a valid thread name.', ephemeral: true });
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
                    ephemeral: true 
                });
            }
            // Update the hub list to include the new thread
            await updateThreadList(client, hubChannel);

            return interaction.reply({ content: `✅ Thread **${interaction.options.getString('name')}** created! (See the thread list above.)`, ephemeral: true });
        }

        if (sub === 'close') {
            // Determine context: inside a thread or in a hub channel
            if (hubChannel.isThread()) {
                // If used inside a thread channel, close that thread
                const thread = hubChannel;  // alias for clarity
                const parentId = thread.parentId;
                const parentData = client.hubChannels.get(parentId);
                if (!parentData || !parentData.active) {
                    // If parent isn't an active hub, we still allow closing, but just archive without list update if not tracked.
                    // (The user could still archive their thread via command even if hub is off.)
                }
                // Permission check: allow thread owner or mods to close, otherwise deny
                if (thread.ownerId !== interaction.user.id && 
                    !interaction.memberPermissions.has(PermissionFlagsBits.ManageThreads)) {
                    return interaction.reply({ content: '❌ You don’t have permission to close this thread.', ephemeral: true });
                }
                interaction.reply({ content: 'Closing thread...', ephemeral: true });
                try {
                    await thread.delete(`Closed by ${interaction.user}`);
                } catch (err) {
                    console.error('Failed to close thread:', err);
                    return interaction.reply({ content: '❌ Failed to close the thread. I might lack permission.', ephemeral: true });
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
                // Present the dropdown menu of active threads
                const hubData = client.hubChannels.get(hubChannel.id);
                if (!hubData || !hubData.active) {
                    return interaction.reply({ content: '❌ This channel is not an active hub.', ephemeral: true });
                }
                // Fetch active threads in this channel (to list them)
                const fetched = await interaction.guild.channels.fetchActiveThreads();
                const activeThreads = fetched.threads.filter(t => t.parentId === hubChannel.id);
                if (!activeThreads.size) {
                    return interaction.reply({ content: 'ℹ️ There are no active threads to close in this channel.', ephemeral: true });
                }
                // Build select menu options for each thread
                const options = activeThreads.map(thread => {
                    return {
                        label: thread.name,
                        value: thread.id
                    };
                });
                // (If there are more than 25 threads, Discord select max is 25. In such cases, one might need an alternative method.)
                if (options.length > 25) {
                    // If too many threads, prompt user to use the channel option instead
                    return interaction.reply({ content: '⚠️ Too many threads to list. Please use `/thread close [thread]` and select the thread by name.', ephemeral: true });
                }
                // Create the select menu component
                const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('close-thread-select')
                    .setPlaceholder('Select a thread to close…')
                    .addOptions(options);
                const row = new ActionRowBuilder().addComponents(selectMenu);
                // Reply with the dropdown menu (ephemeral)
                return interaction.reply({ content: 'Select a thread to close:', components: [row], ephemeral: true });
            }
        }
    }
};
