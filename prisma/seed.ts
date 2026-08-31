import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding market comparable reference pricing data...');

  const comparables = [
    {
      category: 'Saree',
      material: 'Cotton',
      craftType: 'Handloom Saree',
      minPrice: 145000, // ₹1,450
      maxPrice: 170000, // ₹1,700
      avgPrice: 157500, // ₹1,575
      sampleSize: 25,
      source: 'IndiMart / Craft Council Reference',
    },
    {
      category: 'Saree',
      material: 'Silk',
      craftType: 'Kanchipuram Silk',
      minPrice: 450000, // ₹4,500
      maxPrice: 850000, // ₹8,500
      avgPrice: 620000, // ₹6,200
      sampleSize: 18,
      source: 'Silk Mark Organisation India',
    },
    {
      category: 'Pottery',
      material: 'Terracotta',
      craftType: 'Terracotta Craft',
      minPrice: 35000, // ₹350
      maxPrice: 75000, // ₹750
      avgPrice: 52000, // ₹520
      sampleSize: 40,
      source: 'Khadi & Village Industries Commission',
    },
    {
      category: 'Jewellery',
      material: 'Brass',
      craftType: 'Dokra Metal Craft',
      minPrice: 65000, // ₹650
      maxPrice: 125000, // ₹1,250
      avgPrice: 92000, // ₹920
      sampleSize: 12,
      source: 'Tribal Cooperative Marketing Development Federation',
    },
    {
      category: 'Home Decor',
      material: 'Jute',
      craftType: 'Handcrafted Wall Hanging',
      minPrice: 40000, // ₹400
      maxPrice: 90000, // ₹900
      avgPrice: 65000, // ₹650
      sampleSize: 30,
      source: 'Handicrafts Development Corporation',
    },
  ];

  for (const comp of comparables) {
    await prisma.marketComparable.create({
      data: comp,
    });
  }

  console.log(`Successfully seeded ${comparables.length} market comparable price records.`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
