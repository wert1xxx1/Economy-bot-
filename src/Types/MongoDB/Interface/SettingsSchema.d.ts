export default interface SettingsSchema {
    global: {
        guild_id: string,
        banner_refresh_time: number,
        shop_id: string
    }
    economy: {
        work: {
            min: number,
            max: number,
            cooldown: number,
        },
        bonus: {
            min: number,
            max: number,
            cooldown: number
        },
        crime: {
            chance: number,
            max_percent: number,
            min_balance: number,
            cooldown: number
        },
        pay: {
            comission: number
        },
        case: {
            min: number,
            max: number,
            min_compensation: number,
            max_compensation: number,
            price: number
        }
    }
}