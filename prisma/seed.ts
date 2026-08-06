import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = [
  { name: 'Black', hexCode: '#18181B' },
  { name: 'White', hexCode: '#FFFFFF' },
  { name: 'Navy', hexCode: '#1E3A8A' },
  { name: 'Olive', hexCode: '#3F6212' },
  { name: 'Crimson', hexCode: '#DC2626' },
  { name: 'Beige', hexCode: '#D97706' },
  { name: 'Gray', hexCode: '#4B5563' },
];

const sizes = [
  { name: 'XS', sortOrder: 0 },
  { name: 'S', sortOrder: 1 },
  { name: 'M', sortOrder: 2 },
  { name: 'L', sortOrder: 3 },
  { name: 'XL', sortOrder: 4 },
  { name: 'XXL', sortOrder: 5 },
];

const products = [
  {
    title: 'Classic Denim Jacket',
    description: 'A timeless denim jacket perfect for layering.',
    price: 15000.00,
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
  },
  {
    title: 'Oversized Cotton Hoodie',
    description: 'Comfortable oversized hoodie made from 100% organic cotton.',
    price: 8500.00,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
  },
  {
    title: 'Slim Fit Chino Pants',
    description: 'Versatile slim-fit chinos for casual or semi-formal wear.',
    price: 7500.00,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
  },
  {
    title: 'Cargo Trousers',
    description: 'Utility cargo trousers with multiple pockets.',
    price: 9000.00,
    image: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&q=80',
  },
  {
    title: 'Casual Polo Shirt',
    description: 'Breathable cotton polo shirt for everyday wear.',
    price: 4500.00,
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80',
  },
  {
    title: 'Urban Streetwear Sneakers',
    description: 'Stylish streetwear sneakers with a chunky sole.',
    price: 18000.00,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  },
  {
    title: 'Aviator Sunglasses',
    description: 'Classic aviator sunglasses with UV protection.',
    price: 3500.00,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
  },
  {
    title: 'Embroidered Baseball Cap',
    description: 'Cotton baseball cap with custom embroidery.',
    price: 2500.00,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
  },
  {
    title: 'Leather Biker Jacket',
    description: 'Premium faux leather biker jacket with silver hardware.',
    price: 22000.00,
    image: 'https://images.unsplash.com/photo-1520975954732-57dd22299614?w=800&q=80',
  },
  {
    title: 'Graphic Print T-Shirt',
    description: 'Soft cotton t-shirt featuring a unique graphic print.',
    price: 3000.00,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  },
  {
    title: 'Athletic Jogger Pants',
    description: 'Lightweight jogger pants perfect for workouts or lounging.',
    price: 5500.00,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
  },
  {
    title: 'Formal Button-Down Shirt',
    description: 'Crisp, tailored button-down shirt for formal occasions.',
    price: 6500.00,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=800&q=80',
  },
  {
    title: 'Knitted Sweater',
    description: 'Warm knitted sweater for the winter season.',
    price: 8000.00,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
  },
  {
    title: 'Canvas Low-Top Shoes',
    description: 'Everyday casual canvas shoes with durable rubber soles.',
    price: 6000.00,
    image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80',
  },
  {
    title: 'Polarized Retro Shades',
    description: 'Retro-style polarized sunglasses.',
    price: 4000.00,
    image: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80',
  },
  {
    title: 'Beanie Winter Cap',
    description: 'Cozy knitted beanie for cold weather.',
    price: 1800.00,
    image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&q=80',
  },
  {
    title: 'Linen Summer Shorts',
    description: 'Breathable linen shorts for hot summer days.',
    price: 4500.00,
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80',
  },
  {
    title: 'Puffer Winter Coat',
    description: 'Insulated puffer coat to keep you warm in extreme cold.',
    price: 18500.00,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
  },
  {
    title: 'Running Sports Shoes',
    description: 'High-performance running shoes with breathable mesh.',
    price: 14000.00,
    image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80',
  },
  {
    title: 'Oxford Cotton Shirt',
    description: 'Premium Oxford cotton shirt with a regular fit.',
    price: 7000.00,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
  }
];

async function main() {
  console.log('Start seeding...');

  // Reset existing data
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.color.deleteMany();
  await prisma.size.deleteMany();

  // Seed Colors
  const createdColors = [];
  for (const color of colors) {
    const createdColor = await prisma.color.create({ data: color });
    createdColors.push(createdColor);
  }
  console.log(`Created ${createdColors.length} colors.`);

  // Seed Sizes
  const createdSizes = [];
  for (const size of sizes) {
    const createdSize = await prisma.size.create({ data: size });
    createdSizes.push(createdSize);
  }
  console.log(`Created ${createdSizes.length} sizes.`);

  // Seed Products and Variants
  for (const p of products) {
    const product = await prisma.product.create({
      data: p,
    });
    
    // Create random variants for each product (e.g. 2-4 colors, 3-5 sizes)
    const numColors = Math.floor(Math.random() * 3) + 2; 
    const shuffledColors = createdColors.sort(() => 0.5 - Math.random()).slice(0, numColors);
    
    const numSizes = Math.floor(Math.random() * 3) + 3;
    const shuffledSizes = createdSizes.sort(() => 0.5 - Math.random()).slice(0, numSizes);

    let variantsCreated = 0;
    for (const color of shuffledColors) {
      for (const size of shuffledSizes) {
        // 10% chance of out of stock, otherwise random stock 10-100
        const stock = Math.random() < 0.1 ? 0 : Math.floor(Math.random() * 90) + 10;
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorId: color.id,
            sizeId: size.id,
            stock,
          }
        });
        variantsCreated++;
      }
    }
    console.log(`Created product: ${product.title} with ${variantsCreated} variants.`);
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
