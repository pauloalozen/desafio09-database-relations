import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IFindProducts {
  id: string;
}

interface IProduct {
  id: string;
  quantity: number;
}

interface IProductOrder {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError("Customer doen't exists", 400);
    }

    const productsId: IFindProducts[] = [];
    const productOrder: IProductOrder[] = [];

    products.forEach(item => {
      const { id } = item;

      productsId.push({ id });
    });

    const productsList = await this.productsRepository.findAllById(productsId);

    if (products.length > productsList.length) {
      throw new AppError("You order a product that doesn't exists", 400);
    }

    if (!productsList) {
      throw new AppError("Products doesn't exists");
    }

    products.forEach(item => {
      const productPrice = productsList.filter(
        product => product.id === item.id,
      );

      if (item.quantity > productPrice[0].quantity) {
        throw new AppError(
          `You order more than we have in product ${productPrice[0].name}`,
          400,
        );
      }

      productOrder.push({
        product_id: item.id,
        price: productPrice[0].price,
        quantity: item.quantity,
      });
    });

    await this.productsRepository.updateQuantity(products);

    const order = await this.ordersRepository.create({
      customer,
      products: productOrder,
    });

    return order;
  }
}

export default CreateOrderService;
