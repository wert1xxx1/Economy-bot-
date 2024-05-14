import CasinoPoint from "../../../Types/Bot/Interface/CasinoPoint";

const checkPoints = (points: Array<CasinoPoint>, number: number): number | null => {
    let multiplier = null;

    for (let i = 0; i < points.length; i++)
    {
        if (number < points[i].point) break;

        multiplier = points[i].multiplier;
    }

    return multiplier;
}

export default checkPoints;