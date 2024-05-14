import { AttachmentBuilder, ChannelType, ChatInputCommandInteraction, Client, Collection, EmbedBuilder, GatewayIntentBits, GuildMember, Snowflake, TextChannel } from 'discord.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { unlinkSync, writeFileSync } from 'fs';
import { MongoClient } from 'mongodb';
import { resolve } from 'path';

import * as dotenv from 'dotenv';

import { CommandHandler } from './Utils/Handler/Handler';

import getNumberOfMembers from './Utils/GuildBanner/GetNumberOfMembers';
import createUsersSchema from './Utils/CreateSchema/CreateUsersSchema';
import generateBanner from './Utils/GuildBanner/GenerateBanner';
import getWinners from './Utils/GetWinners/GetWinners';

import SettingsSchema from './Types/MongoDB/Interface/SettingsSchema';
import GiveawaySchema from './Types/MongoDB/Interface/GiveawaySchema';
import SlashCommand from './Types/Bot/Interface/SlashCommand';
import Users from './Types/MongoDB/Interface/Users';

(async () => {
    dotenv.config({ path: resolve(".env") });

    const config = {
        clientID: process.env.DISCORD_ID,
        token: process.env.DISCORD_TOKEN,
        url: process.env.MONGODB_URL,
        db: process.env.MONGODB_DB
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });

    const handler = new CommandHandler(config.clientID, config.token);
    const commands: Collection<string, SlashCommand> = await handler.InitHandler(resolve("./dist/Commands"));

    const MongoDB = new MongoClient(config.url);

    MongoDB.connect()
        .then(() => { client.login().catch((err) => { console.error(`Authorization failed. Reason:\r\n\r\n${err.stack}`); }); },
            (err) => { console.error(`Failed to connect. Reason: ${err}`) });

    client.on("ready", async () => {
        console.log("Ready to work.");

        const settingsCollection = MongoDB.db(config.db).collection("Settings");
        const giveawayCollection = MongoDB.db(config.db).collection("Giveaway");

        const settings = await settingsCollection.findOne({}) as any as SettingsSchema;

        if (!settings) { console.error(`ERROR! SETTINGS NOT FOUND!!! BANNER DISABLED!!`); return; };

        const getGuild = client.guilds.cache.get(settings.global.guild_id);
        if (!getGuild) return;

        const canvas = createCanvas(1920, 1080);
        const ctx = canvas.getContext("2d");

        registerFont("./fonts/Montserrat-Bold.ttf", { family: "Montserrat-font", weight: "700", style: "normal" });

        const discordBanner = async () => {
            const getMembers = getNumberOfMembers(getGuild.channels.cache);

            const discordBannerTemplate = await loadImage("./images/discord_banner.png");
            const discordGeneratedBanner = generateBanner(canvas, ctx, discordBannerTemplate, getMembers);

            getGuild.setBanner(discordGeneratedBanner, "Update banner, number of voice activity.").catch((_) => { });
        }

        discordBanner();
        setInterval(discordBanner, settings.global.banner_refresh_time * 1000);

        if (!giveawayCollection) return;

        const getGiveaways = async () => {
            const getGiveaways = await giveawayCollection.find({ time: { $ne: null, $lte: Date.now().toString() } }).toArray() as any as Array<GiveawaySchema>;

            if (getGiveaways.length == 0) return;

            const embed = new EmbedBuilder();

            embed.setTitle("GIVEAWAY 🎉")
                .setColor("#59e80c");

            getGiveaways.forEach(async (giveaway) => {
                await giveawayCollection.updateOne({ messageId: giveaway.messageId }, { $set: { time: null } });

                const guild = client.guilds.cache.get(giveaway.guildId);

                if (!guild) return;

                const membersInVoice = [];

                const voiceChannels = guild.channels.cache.filter(c => c.type == ChannelType.GuildVoice && c.members.size > 0);

                voiceChannels.forEach((c) => {
                    const members = c.members as Collection<Snowflake, GuildMember>;

                    members.forEach((u) => { membersInVoice.push({ key: u.id, value: u }) });
                });

                if (voiceChannels.size == 0 || membersInVoice.length == 0) return;

                embed
                    .setFooter({ text: `ID: ${giveaway.messageId}`, })
                    .setTimestamp();

                const winners = getWinners(giveaway, membersInVoice);

                const getChannel = guild.channels.cache.get(giveaway.channelId) as TextChannel;
                const getMessage = await getChannel.messages.fetch(giveaway.messageId);

                const giveawayDescription = `**Приз: \`${giveaway.prize}\`\r\n\r\n${winners.length == 1 ? "Победитель" : "Победители"}🎉:\r\n${winners.map((u) => `${u}`).join('\r\n')}**`;

                if (giveawayDescription.length > 2048)
                {
                    const usernameWinners = winners.map((u) => `${u.username}`).join('\r\n');

                    writeFileSync(`./${giveaway.messageId}.txt`, usernameWinners);

                    embed
                        .setDescription(`**Приз: \`${giveaway.prize}\`\r\n\r\n${winners.length == 1 ? "Победитель" : "Победители"}🎉:\r\nСписок __победителей__ записан в файл.`)
                        .setTimestamp();

                    getMessage.reply({ embeds: [embed], files: [new AttachmentBuilder(`./${giveaway.messageId}.txt`, { name: 'winners.txt' })] }).catch((_) => { });

                    return unlinkSync(`./${giveaway.messageId}.txt`);
                }

                embed
                    .setDescription(giveawayDescription)
                    .setTimestamp();

                getMessage.reply({ embeds: [embed] }).catch((_) => { });
            });
        };

        setInterval(getGiveaways, 1000);
    })
        .on("interactionCreate", async (interaction) => {
            if (!interaction.guild?.id || !interaction.isCommand()) return;

            if (!commands || commands.size == 0) { interaction.reply({ "content": "Комманды в боте отсутствуют. Обратитесь к администрации сервера.", ephemeral: true }).catch((_) => { }); return; };

            const getCommand = commands.get(interaction.commandName);
            if (!getCommand) { interaction.reply({ "content": "Комманда не обнаружена. Обратитесь к администрации сервера.", ephemeral: true }).catch((_) => { }); return; };

            const checkUser = await MongoDB.db(config.db).collection("Users").findOne({ id: interaction.user.id });

            if (!checkUser)
            {
                const userSchema: Users = createUsersSchema(interaction.user.id);

                await MongoDB.db(config.db).collection("Users").insertOne(userSchema);

                return getCommand.settings.run(client, interaction as ChatInputCommandInteraction, MongoDB.db(config.db));
            };

            getCommand.settings.run(client, interaction as ChatInputCommandInteraction, MongoDB.db(config.db));
        })
})();