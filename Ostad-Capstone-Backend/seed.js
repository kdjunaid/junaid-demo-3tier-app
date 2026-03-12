require("dotenv").config();
const { MongoClient } = require("mongodb");
const { faker } = require("@faker-js/faker");

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "Ostad-DB";
const TOTAL_RECORDS = 20000;
const BATCH_SIZE = 100; // batch insert to avoid memory overload

(async () => {
  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const studentsCollection = db.collection("students");
    const resultsCollection = db.collection("results");

    const studentsCount = await studentsCollection.countDocuments();
    const resultsCount = await resultsCollection.countDocuments();
    if (studentsCount >= TOTAL_RECORDS || resultsCount >= TOTAL_RECORDS) {
      console.log("⚠️ Database already seeded with sufficient data.");
      return;
    }

    console.log(`🟢 Seeding ${TOTAL_RECORDS} students and results in batches of ${BATCH_SIZE}...`);

    let current = 1;

    while (current <= TOTAL_RECORDS) {
      const studentsBatch = [];
      const resultsBatch = [];

      for (let i = 0; i < BATCH_SIZE && current <= TOTAL_RECORDS; i++, current++) {
        const id = `S${100 + current}`;
        const name = faker.person.fullName();
        const email = faker.internet.email();
        const dob = faker.date.between({
          from: new Date("1995-01-01"),
          to: new Date("2010-12-31")
        }).toISOString().split("T")[0];
        const gender = faker.person.gender(); // Male / Female / Non-binary

        studentsBatch.push({ id, name, email, dob, gender });

        const subjects = {
          Math: faker.number.int({ min: 50, max: 100 }),
          English: faker.number.int({ min: 50, max: 100 }),
          Physics: faker.number.int({ min: 50, max: 100 }),
          Chemistry: faker.number.int({ min: 50, max: 100 }),
          Biology: faker.number.int({ min: 50, max: 100 }),
          History: faker.number.int({ min: 50, max: 100 }),
          Geography: faker.number.int({ min: 50, max: 100 }),
          Computer: faker.number.int({ min: 50, max: 100 }),
          Economics: faker.number.int({ min: 50, max: 100 }),
          Bangla: faker.number.int({ min: 50, max: 100 }),
        };

        resultsBatch.push({ id, name, subjects });
      }

      await studentsCollection.insertMany(studentsBatch, { ordered: false });
      await resultsCollection.insertMany(resultsBatch, { ordered: false });

      console.log(`📦 Inserted batch up to student #${current}`);
    }

    console.log(`✅ Successfully seeded ${TOTAL_RECORDS} students and results!`);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.close();
    console.log("🔒 MongoDB connection closed");
  }
})();
