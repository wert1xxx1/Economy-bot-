const getHalfOrAll = (type: string, balance: number): number | null => {
    switch (type.toLowerCase())
    {
        case "half":
            return Math.round(balance / 2);

        case "all":
            return balance

        default:
            return null;
    }
}

export default getHalfOrAll;