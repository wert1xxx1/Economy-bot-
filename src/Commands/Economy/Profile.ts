import { Client, SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage, registerFont } from 'canvas';
import { Db } from "mongodb";


import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import createUsersSchema from "../../Utils/CreateSchema/CreateUsersSchema";

const commandName = "Profile";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Посмотреть свой/чужой профиль.")
            .addUserOption((options) =>
                options.setName("user")
                    .setDescription("Пользователь, чей профиль вы хотите посмотреть.")
                    .setRequired(false)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection('Users');

            const getUser = interaction.options.getUser("user") ?? interaction.user;

            let findUser = await usersCollection.findOne({ id: getUser.id }) as any as Users;

            if (!findUser)
            {
                const userSchema: Users = createUsersSchema(getUser.id);

                await database.collection("Users").insertOne(userSchema);

                findUser = await database.collection("Users").findOne({ id: getUser.id }) as any as Users;
            }

            await interaction.deferReply().catch((_) => { });

            const canvas = createCanvas(1422, 800);
            const ctx = canvas.getContext("2d");

            registerFont("./fonts/Tektur-VariableFont.ttf", { family: "Tektur-Font" });

            const profileTemplate = await loadImage("./images/profile_picture.png");
            const test_avatar = await loadImage(getUser.displayAvatarURL({ size: 256, extension: "png" }));

            ctx.drawImage(profileTemplate, 0, 0, canvas.width, canvas.height);

            // Add avatar
            ctx.save();

            ctx.beginPath();
            ctx.arc(181, 176, 118, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(test_avatar, 52, 48, 256, 256);

            ctx.restore();

            // NickName
            ctx.font = '600 80px "Tektur"';
            ctx.fillStyle = "#FFFFFF"
            ctx.textAlign = "left";
            ctx.fillText(getUser.globalName ?? getUser.username, 422, 165);

            // UserName or ID
            ctx.font = '600 40px "Tektur"';
            ctx.fillStyle = "#ff5a00"
            ctx.textAlign = "left";
            ctx.fillText(getUser.username, 422, 230);

            // Balance
            ctx.font = '600 40px "Tektur"';
            ctx.fillStyle = "#ff5a00"
            ctx.textAlign = "left";
            ctx.fillText(findUser.balance.toLocaleString('en').replace(/,/g, ' '), 322, 495);

            // Bank balance
            ctx.font = '600 40px "Tektur"';
            ctx.fillStyle = "#ff5a00"
            ctx.textAlign = "left";
            ctx.fillText(findUser.bank_balance.toLocaleString('en').replace(/,/g, ' '), 322, 615);

            // Case
            ctx.font = '600 40px "Tektur"';
            ctx.fillStyle = "#ff5a00"
            ctx.textAlign = "left";
            ctx.fillText(findUser.cases.toLocaleString('en').replace(/,/g, ' '), 322, 735);

            const attachment = new AttachmentBuilder(canvas.toBuffer());

            interaction.editReply({ files: [attachment] }).catch((_) => { });
        }
    }
}