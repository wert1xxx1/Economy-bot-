export default interface Users {
    id: string,
    balance: number,
    bank_balance: number,
    cases: 0,
    cooldown: {
        bonus: number,
        work: number,
        crime: number
    }
}