const getValueFromPercent = (value: number, percent: number) => {
    return Math.floor(value * (percent / 100));
}

export default getValueFromPercent;