import { SlashCommandBuilder, Client, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import createGoodsSchema from "../../Utils/CreateSchema/CreateGoodsSchema";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";

import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import GoodsSchema from "../../Types/MongoDB/Interface/GoodsSchema";

const commandName = "Role";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Управление ролью в магазине.")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand((subcommand) =>
                subcommand.setName("add")
                    .setDescription("Добавить роль в магазин.")
                    .addRoleOption((options) =>
                        options.setName("role")
                            .setDescription("Роль, которую вы хотите добавить.")
                            .setRequired(true))
                    .addNumberOption((options) =>
                        options.setName("price")
                            .setDescription("Цена, которую вы хотите поставить за роль.")
                            .setMinValue(1)
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("remove")
                    .setDescription("Удалить роль с магазина.")
                    .addStringOption((options) =>
                        options.setName("id")
                            .setDescription("ID роли, которую вы хотите удалить.")
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const shopCollection = database.collection("Shop");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;
            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            const embed = new EmbedBuilder();

            embed.setTitle("ROLE")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            switch (interaction.options.getSubcommand())
            {
                case 'add':
                    const getRole = interaction.options.getRole("role");
                    const getPrice = interaction.options.getNumber("price");

                    const checkRole = await shopCollection.findOne({ roleId: getRole.id });

                    if (checkRole) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Данная роль уже присутствует в магазине.`)], ephemeral: true }).then((_) => { });

                    await shopCollection.insertOne(createGoodsSchema(getSettings.global.shop_id, getRole.id, getPrice));

                    await settingsCollection.updateOne({ "global.shop_id": getSettings.global.shop_id }, { $set: { "global.shop_id": (Number(getSettings.global.shop_id) + 1).toString() } });

                    embed.setDescription(`**ID: __\`${getSettings.global.shop_id}\`__\r\nРоль: ${getRole}\r\nЦена: __\`${getPrice} 💵\`__\r\n\r\nУспешно добавлена.**`);

                    interaction.reply({ embeds: [embed] }).catch((_) => { });
                    break;

                case 'remove':
                    const getId = interaction.options.getString("id");

                    const checkId = await shopCollection.findOne({ id: getId }) as any as GoodsSchema;

                    if (!checkId) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Данный id отсутствует в магазине.`)], ephemeral: true }).then((_) => { });

                    await shopCollection.deleteOne({ id: getId });

                    embed.setDescription(`**ID: __\`${getId}\`__\r\nРоль: <@&${checkId.roleId}>\r\n\r\nУспешно удалена.**`);

                    interaction.reply({ embeds: [embed] }).catch((_) => { });
                    break;
            }
        }
    }
}