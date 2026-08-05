import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    title: 'Wireless Noise-Cancelling Headphones',
    description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life.',
    price: 15000.00,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    stock: 50,
  },
  {
    title: 'Classic Leather Sneakers',
    description: 'Comfortable everyday leather sneakers perfect for casual wear.',
    price: 8500.00,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    stock: 120,
  },
  {
    title: 'Smartwatch Series 7',
    description: 'Advanced smartwatch with health tracking and seamless connectivity.',
    price: 25000.00,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    stock: 45,
  },
  {
    title: 'Minimalist Wooden Desk Clock',
    description: 'Elegant and simple wooden desk clock for your workspace.',
    price: 3200.00,
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80',
    stock: 80,
  },
  {
    title: 'Professional DSLR Camera',
    description: 'Capture stunning photos and videos with this professional-grade camera.',
    price: 180000.00,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
    stock: 15,
  },
  {
    title: 'Ergonomic Office Chair',
    description: 'Comfortable office chair with lumbar support for long working hours.',
    price: 12500.00,
    image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&q=80',
    stock: 30,
  },
  {
    title: 'Bluetooth Portable Speaker',
    description: 'Waterproof portable speaker with deep bass and 12-hour playtime.',
    price: 5500.00,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
    stock: 100,
  },
  {
    title: 'Vintage Leather Backpack',
    description: 'Durable leather backpack ideal for travel and daily commute.',
    price: 9800.00,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
    stock: 65,
  },
  {
    title: 'Mechanical Gaming Keyboard',
    description: 'RGB mechanical keyboard with tactile switches for fast response.',
    price: 7500.00,
    image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80',
    stock: 90,
  },
  {
    title: 'Ceramic Coffee Mug',
    description: 'Handcrafted ceramic mug for your morning coffee or tea.',
    price: 1200.00,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    stock: 150,
  },
  {
    title: 'Polarized Sunglasses',
    description: 'Stylish sunglasses with UV protection and polarized lenses.',
    price: 4500.00,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
    stock: 110,
  },
  {
    title: 'Running Shoes',
    description: 'Lightweight and breathable running shoes for maximum performance.',
    price: 11000.00,
    image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80',
    stock: 85,
  },
  {
    title: 'Wireless Charging Pad',
    description: 'Fast wireless charger compatible with Qi-enabled devices.',
    price: 2800.00,
    image: 'https://images.unsplash.com/photo-1603674554159-b62f6febbce5',
    stock: 130,
  },
  {
    title: 'Stainless Steel Water Bottle',
    description: 'Insulated water bottle keeps drinks cold for 24 hours or hot for 12.',
    price: 1800.00,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
    stock: 200,
  },
  {
    title: 'Denim Jacket',
    description: 'Classic fit denim jacket for a timeless look.',
    price: 6500.00,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
    stock: 75,
  },
  {
    title: "Test Out Of Stock Product",
    description: "This product is out of stock.",
    price: 1000.00,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
    stock: 0,
  }
];

async function main() {
  console.log('Start seeding...');
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  for (const p of products) {
    const product = await prisma.product.create({
      data: p,
    });
    console.log(`Created product with id: ${product.id}`);
  }
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
