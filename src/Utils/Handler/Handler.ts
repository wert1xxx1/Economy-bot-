import { REST, Routes, Collection } from "discord.js";
import { join, resolve } from "path";
import { readdir, stat } from "fs";
import { eachSeries } from "async";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand"

export class CommandHandler {
    private commandCollection: Collection<string, SlashCommand>;

    constructor(
        public appID: string,
        public token: string
    ) { }

    public InitHandler(dir: string): Promise<Collection<string, SlashCommand>> {
        return new Promise((resolve, reject) => {
            this.commandCollection = new Collection();

            if (this.commandCollection.size > 0) this.commandCollection.clear();

            this.FindDirectories(dir).then((files) => {
                this.FindFiles(files, (arg: Array<SlashCommand>) => {
                    if (typeof arg == "object") resolve(this.commandCollection);
                    reject(arg);
                });
            })
        })
    }

    private async FindDirectories(dir: string) {
        return new Promise((resolve, reject) => {
            SearchFiles(dir, null);

            async function SearchFiles(dir: string, callback: Function) {

                readdir(dir, function (err, files) {
                    if (err) reject(err);

                    var filePaths: Array<string> = [];

                    eachSeries(files, function (fileName, eachCallback) {
                        var filePath = join(dir, fileName);

                        stat(filePath, function (err, stat) {
                            if (err) return eachCallback(err);

                            if (stat.isDirectory())
                            {
                                SearchFiles(filePath, function (err, subDirFiles) {
                                    if (err) return eachCallback(err);

                                    filePaths = filePaths.concat(subDirFiles);
                                    eachCallback(null);
                                });
                            } else
                            {
                                if (stat.isFile() && /\.js$/.test(filePath))
                                {
                                    filePaths.push(filePath);
                                }
                                eachCallback(null);
                            }
                        });
                    }, function (err) {
                        if (err) reject(err.stack);

                        if (callback) return callback(err, filePaths);

                        resolve(filePaths);
                    });
                });
            };
        });
    }

    private FindFiles(files: any, CallBack: Function) {
        if (files.length == 0) return CallBack(null);

        return this.ParseCommands(files, CallBack);
    }

    private async ParseCommands(ArrayFiles: Array<string>, CallBack: Function) {
        for (let i = 0; i < ArrayFiles.length; i++)
        {
            try
            {
                var importCommand = await import(resolve(ArrayFiles[i]));

                if (!importCommand.command?.settings) continue;

                this.commandCollection.set(importCommand.command.settings.name.trim(), {
                    settings: {
                        name: importCommand.command.settings.name.trim(),
                        run: importCommand.command.settings.run,
                        command: importCommand.command.settings.command
                    }
                });
            }
            catch (error)
            {
                console.error(`Error while loading command:\r\n\r\n${error.stack}`);
                continue;
            };
        };

        this.InitSlashCommands(CallBack);
    }

    private InitSlashCommands(CallBack: Function): void {
        const UserCommands = [];

        for (let cmd of this.commandCollection.values())
        {
            if (!cmd.settings.command || !cmd.settings.name) continue;

            UserCommands.push(cmd.settings.command.toJSON());
        };

        const rest = new REST({ version: '10' }).setToken(this.token);

        (async () => {
            try
            {
                if (UserCommands.length > 0) await rest.put(Routes.applicationCommands(this.appID), { body: UserCommands });

                CallBack(this.commandCollection);
            } catch (err)
            {
                CallBack(err.stack);
            };
        })();
    }
}