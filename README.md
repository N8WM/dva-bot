# D.Va – The Discord Thread Hub Bot

**D.Va helps tidy up your Discord server by replacing redundant channels with a single, centralized thread hub for each topic.**

When your server is cluttered with multiple channels for different topics and games, D.Va allows you to condense them into one clean hub channel for each general topic. All discussions take place in individual threads that hide when inactive, and a live table-of-contents keeps track of every thread, giving access even to those that have gone inactive.

![example](https://github.com/N8WM/dva-bot/blob/main/assets/example.png?raw=true)

## Why Add D.Va to Your Server?

- **Clutter-Free Organization**  
  Replace pages of topics and subchannels with one hub channel per topic where every discussion is neatly organized into threads that automatically hide or show depending on their activity.

- **Live Thread Index**  
  A continuously updated embed message displays a clickable list of threads, allowing members to easily jump into any conversation, even inactive ones.

- **Simplified Management**  
  Quickly activate, deactivate, or disable the hub with simple slash commands, and pick your choice between slash commands or Discord's native thread management features to create and delete threads.

- **Clean User Experience**  
  Non-thread messages in the hub channel are automatically deleted, keeping the space focused on ongoing discussions.

- **No External Database**  
  All state is stored directly within Discord using persistent embeds and in-memory maps. This design eliminates the need for an external database, meaning D.Va will never record any information, user data, messages, etc. from your server.

## Hub Management

- **Activation**  
  Transform a text channel into a hub by using `/hub activate`. This posts a pinned “Thread Hub” embed that acts as a live TOC and begins monitoring the channel.

- **Deactivation**  
  Use `/hub deactivate` to pause the hub’s live updates while keeping the thread list visible.

- **Disabling**  
  Run `/hub disable` to completely remove hub functionality and delete the thread list message, returning the channel to its normal state.

## Thread Management

- **Creating Threads**  
  Use `/thread create <name>` in an active hub channel to start a new discussion. The provided name becomes the thread’s title and appears immediately in the TOC. You can also create a new thread just like you normally would.

- **Deleting Threads**  
  Threads can be deleted either by using `/thread delete` from within the thread or from the hub channel. In the hub channel, a dropdown menu lists all threads for easy selection and deletion. You can also delete a thread just like you normally would.
