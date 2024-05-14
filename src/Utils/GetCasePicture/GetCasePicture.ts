import CasePictureType from "../../Types/Bot/Interface/CasePictureType";

const pictures: Array<CasePictureType> =
    [
        {
            percent: 30,
            picture: "https://cdn.discordapp.com/attachments/1060588977482125392/1131721800171139122/1.gif"
        },
        {
            percent: 60,
            picture: "https://cdn.discordapp.com/attachments/1060588977482125392/1131721800678653962/2.gif"
        },
        {
            percent: 80,
            picture: "https://cdn.discordapp.com/attachments/1060588977482125392/1131721801236480120/3.gif"
        },
        {
            percent: 95,
            picture: "https://cdn.discordapp.com/attachments/1060588977482125392/1131721801681088662/4.gif"
        },
        {
            percent: 100,
            picture: "https://cdn.discordapp.com/attachments/1060588977482125392/1131721802104717384/5.gif"
        }
    ];

const getPicture = (percent: number): string => {
    for (let casePic of pictures)
        if (percent <= casePic.percent)
            return casePic.picture;

    return pictures[0].picture;
};

export default getPicture;