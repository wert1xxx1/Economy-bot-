import GoodsSchema from "../../Types/MongoDB/Interface/GoodsSchema";

const createGoodsSchema = (id: string, roleId: string, price: number) => {
    let goodsSchema: GoodsSchema = { id, roleId, price };

    return goodsSchema;
}

export default createGoodsSchema;