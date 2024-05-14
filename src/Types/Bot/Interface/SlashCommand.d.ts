import { Client, ChatInputCommandInteraction } from "discord.js";
import { Db } from "mongodb";

interface SlashCommand {
    settings: {
        name: string,
        command: any,
        run: (client: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => void;
    }
}

export default SlashCommand;