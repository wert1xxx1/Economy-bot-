import Users from "../../Types/MongoDB/Interface/Users";

const createUsersSchema = (id: string) => {
    let usersSchema: Users = { id, balance: 0, bank_balance: 0, cases: 0, cooldown: { bonus: 0, work: 0, crime: 0 } };
    return usersSchema;
}

export default createUsersSchema;